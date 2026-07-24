import type { DirectTerraProductAsset } from "./directTerraApiContract.ts";
import {
  resolveDirectTerraCitationWebsites,
} from "./directTerraCitationWebsiteResolver.ts";
import {
  resolveDirectTerraAssetsWithSerperShopping,
  type DirectTerraSerperShoppingTransport,
} from "./directTerraSerperAssetAdapter.ts";
import {
  verifyDirectTerraAssetCandidates,
  type DirectTerraAssetTarget,
  type DirectTerraPageFetchCandidate,
} from "./directTerraAssetVerifier.ts";
import type { DirectTerraSource } from "./directTerraResponse.ts";
import {
  buildDirectTerraRetailerScopedQuery,
  resolveDirectTerraWebsitesWithSerperOrganic,
  type DirectTerraSerperOrganicTransport,
} from "./directTerraSerperOrganicAdapter.ts";
import {
  classifyDirectTerraLinkHost,
  cleanDirectTerraDisplayUrl,
  DIRECT_TERRA_ORGANIC_SKIP_SCORE,
  scoreDirectTerraProductLink,
} from "./directTerraLinkPreference.ts";
import {
  extractDirectTerraPageAssets,
  MAX_DIRECT_TERRA_PAGE_FETCHES,
  shouldSkipDirectTerraPageFetch,
  verifyDirectTerraPageAssets,
  type DirectTerraProductPageTransport,
} from "./directTerraProductPageFetcher.ts";
import {
  buildDirectTerraAssetFirstLossDiagnostic,
  emptyDirectTerraVerificationSummary,
  type DirectTerraAssetFirstLossDiagnostic,
  type DirectTerraPageLaneDiagnostic,
  type DirectTerraProviderLaneDiagnostic,
} from "./directTerraFirstLoss.ts";

// Total organic lookups per request across both passes (open product-page
// queries plus retailer-scoped second chances).
export const MAX_DIRECT_TERRA_TOTAL_ORGANIC_QUERIES = 8;

type ResolveDirectTerraProductAssetsInput = {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
  serperTransport?: DirectTerraSerperShoppingTransport;
  serperOrganicTransport?: DirectTerraSerperOrganicTransport;
  productPageTransport?: DirectTerraProductPageTransport;
  recordFirstLossDiagnostic?: (
    diagnostic: DirectTerraAssetFirstLossDiagnostic,
  ) => void;
};

export async function resolveDirectTerraProductAssets({
  targets,
  reportMarkdown,
  activeCitationUrls,
  responseSources,
  serperTransport,
  serperOrganicTransport,
  productPageTransport,
  recordFirstLossDiagnostic,
}: ResolveDirectTerraProductAssetsInput): Promise<DirectTerraProductAsset[]> {
  if (targets.length === 0) return [];

  const laneDiagnosticsByKey = new Map<
    string,
    DirectTerraProviderLaneDiagnostic[]
  >();
  const recordLane = (diagnostic: DirectTerraProviderLaneDiagnostic) => {
    const existing = laneDiagnosticsByKey.get(diagnostic.targetKey) ?? [];
    existing.push(diagnostic);
    laneDiagnosticsByKey.set(diagnostic.targetKey, existing);
  };
  const ambiguousPageCandidatesByKey = new Map<
    string,
    DirectTerraPageFetchCandidate[]
  >();
  const recordPageFetchCandidate = (
    candidate: DirectTerraPageFetchCandidate,
  ) => {
    const existing =
      ambiguousPageCandidatesByKey.get(candidate.targetKey) ?? [];
    if (
      !existing.some(
        (current) => current.productUrl === candidate.productUrl,
      )
    ) {
      existing.push(candidate);
      ambiguousPageCandidatesByKey.set(candidate.targetKey, existing);
    }
  };
  const emptyLane = (
    target: DirectTerraAssetTarget,
    lane: DirectTerraProviderLaneDiagnostic["lane"],
    status: DirectTerraProviderLaneDiagnostic["status"],
  ): DirectTerraProviderLaneDiagnostic => ({
    targetKey: target.key,
    rank: target.rank,
    lane,
    status,
    rawResultCount: 0,
    consideredResultCount: 0,
    mappedCandidateCount: 0,
    verification: emptyDirectTerraVerificationSummary(),
  });

  const citationWebsites = resolveDirectTerraCitationWebsites({
    targets,
    reportMarkdown,
    activeCitationUrls,
    responseSources,
    recordFirstLossDiagnostic: recordFirstLossDiagnostic
      ? recordLane
      : undefined,
    recordPageFetchCandidate,
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
        recordFirstLossDiagnostic: recordFirstLossDiagnostic
          ? recordLane
          : undefined,
        recordPageFetchCandidate,
      });
    } catch {
      if (recordFirstLossDiagnostic) {
        for (const target of organicCandidateTargets) {
          const lanes = laneDiagnosticsByKey.get(target.key) ?? [];
          if (!lanes.some((lane) => lane.lane === "organic_primary")) {
            recordLane(emptyLane(target, "organic_primary", "transport_error"));
          }
        }
      }
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
        recordFirstLossDiagnostic: recordFirstLossDiagnostic
          ? recordLane
          : undefined,
        recordPageFetchCandidate,
      });
    } catch {
      if (recordFirstLossDiagnostic) {
        for (const target of targets) {
          const lanes = laneDiagnosticsByKey.get(target.key) ?? [];
          if (!lanes.some((lane) => lane.lane === "shopping")) {
            recordLane(emptyLane(target, "shopping", "transport_error"));
          }
        }
      }
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

  // Second-chance pass: products still without any link get one
  // retailer-scoped query (site:homedepot.com OR site:lowes.com …) inside the
  // shared total-organic ceiling. Same transport, same gates, same fail-open.
  if (serperOrganicTransport) {
    const firstPassQueries = organicBatch?.transportCallCount ?? 0;
    const remainingBudget =
      MAX_DIRECT_TERRA_TOTAL_ORGANIC_QUERIES - firstPassQueries;
    const missingTargets = orderedTargets
      .filter((target) => !chosenWebsiteByKey.get(target.key))
      .slice(0, Math.max(0, remainingBudget));
    if (missingTargets.length > 0) {
      try {
        const secondPass = await resolveDirectTerraWebsitesWithSerperOrganic({
          targets: missingTargets,
          transport: serperOrganicTransport,
          buildQuery: buildDirectTerraRetailerScopedQuery,
          diagnosticLane: "organic_retailer",
          recordFirstLossDiagnostic: recordFirstLossDiagnostic
            ? recordLane
            : undefined,
          recordPageFetchCandidate,
        });
        for (const item of secondPass.items) {
          if (item.productUrl && !chosenWebsiteByKey.get(item.targetKey)) {
            chosenWebsiteByKey.set(item.targetKey, item.productUrl);
          }
        }
      } catch {
        if (recordFirstLossDiagnostic) {
          for (const target of missingTargets) {
            const lanes = laneDiagnosticsByKey.get(target.key) ?? [];
            if (!lanes.some((lane) => lane.lane === "organic_retailer")) {
              recordLane(
                emptyLane(target, "organic_retailer", "transport_error"),
              );
            }
          }
        }
        // The retry is optional decoration like the first pass.
      }
    }
  }

  // T8B page stage: one bounded fetch of the already-verified page per
  // product, harvesting the retailer's/manufacturer's own product photo and
  // rel=canonical clean URL. Every failure keeps the existing assets.
  const pageImageByKey = new Map<string, string>();
  const pageStatusByKey = new Map<
    string,
    DirectTerraPageLaneDiagnostic["status"]
  >(
    targets.map((target) => [
      target.key,
      productPageTransport ? "not_selected" : "not_configured",
    ]),
  );
  if (productPageTransport) {
    let fetches = 0;
    for (const target of orderedTargets) {
      const acceptedWebsiteUrl = chosenWebsiteByKey.get(target.key) ?? null;
      const ambiguousWebsiteUrl = (
        ambiguousPageCandidatesByKey.get(target.key) ?? []
      ).reduce<string | null>(
        (best, candidate) =>
          scoreDirectTerraProductLink(candidate.productUrl, target) >
          scoreDirectTerraProductLink(best, target)
            ? candidate.productUrl
            : best,
        null,
      );
      const websiteUrl = acceptedWebsiteUrl ?? ambiguousWebsiteUrl;
      const requiresCompleteProductProof =
        !acceptedWebsiteUrl && Boolean(ambiguousWebsiteUrl);
      if (!websiteUrl) continue;
      if (fetches >= MAX_DIRECT_TERRA_PAGE_FETCHES) {
        pageStatusByKey.set(target.key, "budget_exhausted");
        continue;
      }
      // Bot-walled hosts (Amazon) never serve plain fetches; keep the budget
      // for pages that can actually yield a first-party photo/canonical.
      if (shouldSkipDirectTerraPageFetch(websiteUrl)) {
        pageStatusByKey.set(target.key, "skipped_known_bot_wall");
        continue;
      }
      fetches += 1;
      try {
        const fetched = await productPageTransport(websiteUrl);
        if (!fetched) {
          pageStatusByKey.set(target.key, "page_unavailable");
          continue;
        }
        const extracted = extractDirectTerraPageAssets(
          fetched.html,
          fetched.finalUrl,
        );
        const pageVerification = verifyDirectTerraAssetCandidates({
          target,
          candidates: [
            {
              title: extracted.title,
              structuredProductNames: extracted.productNames,
              productUrl: fetched.finalUrl,
            },
          ],
        });
        const pageDecision = pageVerification.decisions[0];
        if (!pageVerification.productUrl) {
          if (
            requiresCompleteProductProof ||
            (pageDecision &&
              pageDecision.relationship !== "unknown" &&
              pageDecision.relationship !== "complete_product" &&
              pageDecision.relationship !== "bundle_including_product")
          ) {
            chosenWebsiteByKey.set(target.key, null);
            pageImageByKey.delete(target.key);
          }
          pageStatusByKey.set(
            target.key,
            pageDecision?.relationship === "unknown"
              ? "verified_without_image"
              : "page_assets_unavailable",
          );
          continue;
        }
        chosenWebsiteByKey.set(target.key, pageVerification.productUrl);
        if (extracted.imageCandidates.length === 0) {
          pageStatusByKey.set(target.key, "page_assets_unavailable");
        }
        const verified = verifyDirectTerraPageAssets({
          target,
          pageUrl: fetched.finalUrl,
          page: extracted,
        });
        if (verified.imageUrl) {
          pageImageByKey.set(target.key, verified.imageUrl);
          pageStatusByKey.set(target.key, "accepted_page_image");
        } else if (extracted.imageCandidates.length > 0) {
          pageStatusByKey.set(target.key, "verified_without_image");
        }
        if (verified.canonicalUrl) {
          const canonicalVerification = verifyDirectTerraAssetCandidates({
            target,
            candidates: [
              {
                title: extracted.title,
                structuredProductNames: extracted.productNames,
                productUrl: verified.canonicalUrl,
              },
            ],
          });
          if (canonicalVerification.productUrl) {
            chosenWebsiteByKey.set(
              target.key,
              canonicalVerification.productUrl,
            );
          }
        }
      } catch {
        pageStatusByKey.set(target.key, "transport_error");
        if (requiresCompleteProductProof) {
          chosenWebsiteByKey.set(target.key, null);
        }
        // A provider-proven complete product link stands on its own. An
        // ambiguous candidate cannot survive a failed page fetch.
      }
    }
  }

  const assets = orderedTargets.map((target): DirectTerraProductAsset => {
    const website = chosenWebsiteByKey.get(target.key) ?? null;
    const shopping = shoppingByKey.get(target.key)?.verification;
    // The displayed buy link must be the product's own manufacturer site or a
    // popular retailer the shopper recognizes. An identity-verified link on an
    // obscure "other" host is dropped rather than shown, so a card shows a
    // recognized store or no link at all.
    const displayWebsite =
      website && classifyDirectTerraLinkHost(website, target.brand) !== "other"
        ? website
        : null;
    return {
      rank: target.rank,
      productName: target.productName,
      productUrl: displayWebsite
        ? cleanDirectTerraDisplayUrl(displayWebsite, target.brand)
        : null,
      // Image ladder: the product page's own photo (same verified identity as
      // the link) beats the opaque Shopping thumbnail; both beat nothing.
      imageUrl: pageImageByKey.get(target.key) ?? shopping?.imageUrl ?? null,
    };
  });
  if (recordFirstLossDiagnostic) {
    for (const target of orderedTargets) {
      const existingLanes = laneDiagnosticsByKey.get(target.key) ?? [];
      for (const lane of [
        "citation",
        "organic_primary",
        "shopping",
        "organic_retailer",
      ] as const) {
        if (!existingLanes.some((diagnostic) => diagnostic.lane === lane)) {
          recordLane(emptyLane(target, lane, "not_attempted"));
        }
      }
      const asset = assets.find((candidate) => candidate.rank === target.rank);
      const chosenWebsite = chosenWebsiteByKey.get(target.key) ?? null;
      try {
        recordFirstLossDiagnostic(
          buildDirectTerraAssetFirstLossDiagnostic({
            targetKey: target.key,
            rank: target.rank,
            lanes: laneDiagnosticsByKey.get(target.key) ?? [],
            page: pageStatusByKey.get(target.key) ?? "not_configured",
            displayedLink: Boolean(asset?.productUrl),
            displayedImage: Boolean(asset?.imageUrl),
            selectedWebsiteWasNonPreferred: Boolean(
              chosenWebsite &&
                classifyDirectTerraLinkHost(chosenWebsite, target.brand) ===
                  "other",
            ),
          }),
        );
      } catch {
        // Optional diagnostics must never change the product assets.
      }
    }
  }
  return assets;
}
