import { directTerraRelationshipCanSupplyAsset } from "../lib/directTerraProductRelationship.ts";
import {
  directTerraAssetTargetIsCoherent,
  verifyDirectTerraAssetCandidates,
} from "../lib/directTerraAssetVerifier.ts";
import {
  MAX_DIRECT_TERRA_ORGANIC_TARGETS,
  resolveDirectTerraWebsitesWithSerperOrganic,
} from "../lib/directTerraSerperOrganicAdapter.ts";

const MAX_RESPONSE_OWNED_SOURCES_PER_CANDIDATE = 2;

function acceptedProductPage(target, candidates) {
  return verifyDirectTerraAssetCandidates({ target, candidates }).decisions.some(
    (decision) =>
      decision.identityAccepted &&
      directTerraRelationshipCanSupplyAsset(decision.relationship) &&
      decision.productUrlAccepted,
  );
}

export async function compareStagedTerraSourceAcquisitionShadow({
  targets,
  responseOwnedCandidates,
  organicTransport,
}) {
  if (!Array.isArray(targets)) throw new Error("Shadow targets are required.");
  if (targets.length > MAX_DIRECT_TERRA_ORGANIC_TARGETS) {
    throw new Error(
      `Direct-Terra organic target ceiling is ${MAX_DIRECT_TERRA_ORGANIC_TARGETS}.`,
    );
  }
  if (!(responseOwnedCandidates instanceof Map)) {
    throw new Error("Response-owned candidates must be candidate-local.");
  }
  const targetKeys = new Set();
  const targetRanks = new Set();
  for (const target of targets) {
    if (!directTerraAssetTargetIsCoherent(target)) {
      throw new Error("Shadow target identity is incoherent.");
    }
    if (targetKeys.has(target.key) || targetRanks.has(target.rank)) {
      throw new Error("Shadow target identities must be unique.");
    }
    targetKeys.add(target.key);
    targetRanks.add(target.rank);
  }
  for (const [targetKey, candidates] of responseOwnedCandidates) {
    if (!targetKeys.has(targetKey)) {
      throw new Error("Response-owned candidate key is not registered.");
    }
    if (
      !Array.isArray(candidates) ||
      candidates.length > MAX_RESPONSE_OWNED_SOURCES_PER_CANDIDATE
    ) {
      throw new Error("Response-owned candidate source ceiling exceeded.");
    }
  }

  const baselineAccepted = new Set();
  for (const target of targets) {
    const candidates = responseOwnedCandidates.get(target.key) ?? [];
    if (acceptedProductPage(target, candidates)) baselineAccepted.add(target.key);
  }
  const unresolved = targets.filter((target) => !baselineAccepted.has(target.key));
  const resolved = await resolveDirectTerraWebsitesWithSerperOrganic({
    targets: unresolved,
    transport: organicTransport,
  });
  const resolverAcceptedCandidates = resolved.items.filter(
    (item) => item.productUrl !== null,
  ).length;

  return {
    submittedCandidates: targets.length,
    baselineAcceptedCandidates: baselineAccepted.size,
    resolverAttemptedCandidates: unresolved.length,
    resolverAcceptedCandidates,
    recoverableCandidates: resolverAcceptedCandidates,
  };
}
