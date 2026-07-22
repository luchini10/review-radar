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

type ResolveDirectTerraProductAssetsInput = {
  targets: DirectTerraAssetTarget[];
  reportMarkdown: string;
  activeCitationUrls: string[];
  responseSources: DirectTerraSource[];
  serperTransport?: DirectTerraSerperShoppingTransport;
};

export async function resolveDirectTerraProductAssets({
  targets,
  reportMarkdown,
  activeCitationUrls,
  responseSources,
  serperTransport,
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

  let shoppingBatch = null;
  if (serperTransport) {
    try {
      shoppingBatch = await resolveDirectTerraAssetsWithSerperShopping({
        targets,
        transport: serperTransport,
      });
    } catch {
      // Shopping is optional decoration. Keep any registered Terra product
      // websites and preserve every ranked product when the provider fails.
    }
  }
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
        productUrl: citation?.productUrl ?? shopping?.productUrl ?? null,
        imageUrl: shopping?.imageUrl ?? null,
      };
    });
}
