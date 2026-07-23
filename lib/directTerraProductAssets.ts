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

type ResolveDirectTerraProductAssetsInput = {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
  serperTransport?: DirectTerraSerperShoppingTransport;
  serperOrganicTransport?: DirectTerraSerperOrganicTransport;
};

export async function resolveDirectTerraProductAssets({
  targets,
  reportMarkdown,
  activeCitationUrls,
  responseSources,
  serperTransport,
  serperOrganicTransport,
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

  const missingWebsiteTargets = targets.filter(
    (target) => !citationByKey.get(target.key)?.productUrl,
  );
  const organicPromise = (async () => {
    if (!serperOrganicTransport || missingWebsiteTargets.length === 0) {
      return null;
    }
    try {
      return await resolveDirectTerraWebsitesWithSerperOrganic({
        targets: missingWebsiteTargets,
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

  return [...targets]
    .sort((left, right) => left.rank - right.rank)
    .map((target): DirectTerraProductAsset => {
      const citation = citationByKey.get(target.key);
      const shopping = shoppingByKey.get(target.key)?.verification;
      return {
        rank: target.rank,
        productName: target.productName,
        productUrl:
          citation?.productUrl ?? organicByKey.get(target.key)?.productUrl ?? null,
        imageUrl: shopping?.imageUrl ?? null,
      };
    });
}
