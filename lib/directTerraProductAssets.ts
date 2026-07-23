import type { DirectTerraProductAsset } from "./directTerraApiContract.ts";
import {
  resolveDirectTerraCitationWebsites,
} from "./directTerraCitationWebsiteResolver.ts";
import {
  resolveDirectTerraAssetsWithSerperShopping,
  type DirectTerraSerperShoppingTransport,
} from "./directTerraSerperAssetAdapter.ts";
import type { DirectTerraAssetTarget } from "./directTerraAssetVerifier.ts";
import type { DirectTerraSource } from "./directTerraResponse.ts";
import {
  resolveDirectTerraWebsitesWithSerperOrganic,
  type DirectTerraSerperOrganicTransport,
} from "./directTerraSerperOrganicAdapter.ts";
import {
  cleanDirectTerraDisplayUrl,
  DIRECT_TERRA_ORGANIC_SKIP_SCORE,
  scoreDirectTerraProductLink,
} from "./directTerraLinkPreference.ts";
import {
  extractDirectTerraPageAssets,
  MAX_DIRECT_TERRA_PAGE_FETCHES,
  verifyDirectTerraPageAssets,
  type DirectTerraProductPageTransport,
} from "./directTerraProductPageFetcher.ts";

type ResolveDirectTerraProductAssetsInput = {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
  serperTransport?: DirectTerraSerperShoppingTransport;
  serperOrganicTransport?: DirectTerraSerperOrganicTransport;
  productPageTransport?: DirectTerraProductPageTransport;
};

export async function resolveDirectTerraProductAssets({
  targets,
  reportMarkdown,
  activeCitationUrls,
  responseSources,
  serperTransport,
  serperOrganicTransport,
  productPageTransport,
}: ResolveDirectTerraProductAssetsInput): Promise<DirectTerraProductAsset[]> {
  if (targets.length === 0) return [];

  const citationWebsites = resolveDirectTerraCitationWebsites({
    targets,
    reportMarkdown,
    activeCitationUrls,
    responseSources,
  });
  const citationByKey = new Map(
    citationWebsites.items.map((item) => [item.targetKey, item]),
  );

  // T8B: the organic lane no longer serves only citation-missing targets. A
  // citation link that is not yet a manufacturer/popular-retailer page with
  // the model in its path can still be beaten by a better organic page, so
  // those targets get an organic lookup too (same <=5 request ceiling).
  const organicCandidateTargets = targets.filter((target) => {
    const citationUrl = citationByKey.get(target.key)?.productUrl ?? null;
    return (
      scoreDirectTerraProductLink(citationUrl, target) <
      DIRECT_TERRA_ORGANIC_SKIP_SCORE
    );
  });
  const organicPromise = (async () => {
    if (!serperOrganicTransport || organicCandidateTargets.length === 0) {
      return null;
    }
    try {
      return await resolveDirectTerraWebsitesWithSerperOrganic({
        targets: organicCandidateTargets,
        transport: serperOrganicTransport,
      });
    } catch {
      // Website decoration is optional. Organic failure cannot affect Terra's
      // recommendation set or the independent Shopping image channel.
      return null;
    }
  })();

  const shoppingPromise = (async () => {
    if (!serperTransport) return null;
    try {
      return await resolveDirectTerraAssetsWithSerperShopping({
        targets,
        transport: serperTransport,
      });
    } catch {
      // Shopping is optional decoration. Preserve every ranked product when
      // the provider fails.
      return null;
    }
  })();

  // These are independent decoration channels. Run at most one request from
  // each lane concurrently instead of making users wait for all website
  // lookups before image lookups begin.
  const [organicBatch, shoppingBatch] = await Promise.all([
    organicPromise,
    shoppingPromise,
  ]);
  const organicByKey = new Map(
    (organicBatch?.items ?? []).map((item) => [item.targetKey, item]),
  );
  const shoppingByKey = new Map(
    (shoppingBatch?.items ?? []).map((item) => [item.targetKey, item]),
  );

  const orderedTargets = [...targets].sort((left, right) => left.rank - right.rank);

  // Choose each product's website by host preference. Both candidates already
  // passed the full identity gate; on a tie the same-response citation wins.
  const chosenWebsiteByKey = new Map<string, string | null>();
  for (const target of orderedTargets) {
    const citationUrl = citationByKey.get(target.key)?.productUrl ?? null;
    const organicUrl = organicByKey.get(target.key)?.productUrl ?? null;
    const citationScore = scoreDirectTerraProductLink(citationUrl, target);
    const organicScore = scoreDirectTerraProductLink(organicUrl, target);
    chosenWebsiteByKey.set(
      target.key,
      organicScore > citationScore ? organicUrl : citationUrl,
    );
  }

  // T8B page stage: one bounded fetch of the already-verified page per
  // product, harvesting the retailer's/manufacturer's own product photo and
  // rel=canonical clean URL. Every failure keeps the existing assets.
  const pageImageByKey = new Map<string, string>();
  if (productPageTransport) {
    let fetches = 0;
    for (const target of orderedTargets) {
      if (fetches >= MAX_DIRECT_TERRA_PAGE_FETCHES) break;
      const websiteUrl = chosenWebsiteByKey.get(target.key);
      if (!websiteUrl) continue;
      fetches += 1;
      try {
        const fetched = await productPageTransport(websiteUrl);
        if (!fetched) continue;
        const extracted = extractDirectTerraPageAssets(
          fetched.html,
          fetched.finalUrl,
        );
        const verified = verifyDirectTerraPageAssets({
          target,
          pageUrl: fetched.finalUrl,
          page: extracted,
        });
        if (verified.imageUrl) {
          pageImageByKey.set(target.key, verified.imageUrl);
        }
        if (verified.canonicalUrl) {
          chosenWebsiteByKey.set(target.key, verified.canonicalUrl);
        }
      } catch {
        // Page decoration is optional; the verified link stands on its own.
      }
    }
  }

  return orderedTargets.map((target): DirectTerraProductAsset => {
    const website = chosenWebsiteByKey.get(target.key) ?? null;
    const shopping = shoppingByKey.get(target.key)?.verification;
    return {
      rank: target.rank,
      productName: target.productName,
      productUrl: website
        ? cleanDirectTerraDisplayUrl(website, target.brand)
        : null,
      // Image ladder: the product page's own photo (same verified identity as
      // the link) beats the opaque Shopping thumbnail; both beat nothing.
      imageUrl: pageImageByKey.get(target.key) ?? shopping?.imageUrl ?? null,
    };
  });
}
