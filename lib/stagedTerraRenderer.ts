import type { TwoLayerDisplaySource } from "./twoLayerApiContract.ts";
import {
  TWO_LAYER_TRUST_LABELS,
  type TwoLayerProductCard,
} from "./twoLayerRecommendation.ts";
import type {
  StagedTerraEvidencePackage,
  StagedTerraPresentationOutput,
  StagedTerraSupportedPoint,
  StagedTerraVerifiedCandidate,
} from "./stagedTerraContract.ts";

export const STAGED_TERRA_RENDERER_VERSION = "staged-terra-renderer-v1";

function sourceLabel(sourceType: string) {
  if (sourceType === "manufacturer") return "Manufacturer";
  if (sourceType === "retailer") return "Verified retailer";
  if (sourceType === "independent_testing") return "Independent test";
  if (sourceType === "owner_feedback") return "Owner feedback";
  return "Research source";
}

function evidenceIdsForPoint(
  point: StagedTerraSupportedPoint,
  candidate: StagedTerraVerifiedCandidate,
) {
  return [
    ...new Set(
      point.factIds.flatMap(
        (factId) =>
          candidate.facts.find((fact) => fact.factId === factId)?.evidenceIds ??
          [],
      ),
    ),
  ];
}

function trustValue(
  point: StagedTerraSupportedPoint,
  candidate: StagedTerraVerifiedCandidate,
) {
  return {
    value: point.text,
    trust: "research_synthesis" as const,
    label: TWO_LAYER_TRUST_LABELS.research_synthesis,
    sourceIds: evidenceIdsForPoint(point, candidate),
  };
}

function priceAmount(candidate: StagedTerraVerifiedCandidate) {
  for (const fact of candidate.facts) {
    if (fact.kind !== "price" || fact.verification !== "verified") continue;
    const value = fact.statement.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/)?.[1];
    const amount = value ? Number(value) : Number.NaN;
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return null;
}

function claimType(kind: StagedTerraVerifiedCandidate["facts"][number]["kind"]) {
  if (kind === "performance") return "professional_performance" as const;
  if (kind === "owner_feedback") return "owner_feedback" as const;
  if (kind === "specification") return "specification" as const;
  return "other" as const;
}

export function renderStagedTerraPresentation({
  evidencePackage,
  presentation,
  observedAt,
}: {
  evidencePackage: StagedTerraEvidencePackage;
  presentation: StagedTerraPresentationOutput;
  observedAt: string;
}) {
  const candidates = new Map(
    evidencePackage.candidates.map((candidate) => [
      candidate.candidateId,
      candidate,
    ]),
  );
  const sources: TwoLayerDisplaySource[] = evidencePackage.evidence.map(
    (evidence) => ({
      id: evidence.evidenceId,
      label: sourceLabel(evidence.sourceType),
      title: evidence.title,
      url: evidence.kind === "image" ? null : evidence.url,
    }),
  );
  const cards: TwoLayerProductCard[] = presentation.rankedProducts.map(
    (product) => {
      const candidate = candidates.get(product.candidateId);
      if (!candidate || candidate.eligibility !== "eligible") {
        throw new Error("staged_terra_renderer_candidate_invalid");
      }
      const price = priceAmount(candidate);
      const commerceEvidence =
        candidate.assets.productUrlEvidenceId === null
          ? null
          : evidencePackage.evidence.find(
              (item) =>
                item.evidenceId === candidate.assets.productUrlEvidenceId,
            ) ?? null;
      const priceEvidenceUrls = new Set(
        candidate.facts
          .filter(
            (fact) =>
              fact.kind === "price" && fact.verification === "verified",
          )
          .flatMap((fact) => fact.evidenceIds)
          .flatMap((evidenceId) => {
            const evidence = evidencePackage.evidence.find(
              (item) => item.evidenceId === evidenceId,
            );
            return evidence ? [evidence.url] : [];
          }),
      );
      const hasVerifiedCommerce = Boolean(
        price !== null &&
          candidate.assets.productUrl &&
          commerceEvidence &&
          priceEvidenceUrls.has(candidate.assets.productUrl),
      );
      return {
        key: candidate.candidateId,
        rank: product.rank,
        recommendationStatus: "Best Match",
        identity: {
          brand: candidate.brand,
          product_name: candidate.productName,
          model: candidate.model,
          variant: null,
        },
        identityVerification: {
          state: "verified",
          label: TWO_LAYER_TRUST_LABELS.verified_transactional,
          observedAt,
        },
        assessment: {
          why: trustValue(product.whyRanked, candidate),
          bestFor: trustValue(product.bestFor, candidate),
          mainTradeoff: trustValue(product.mainTradeoff, candidate),
        },
        pros: product.pros.map((point) => trustValue(point, candidate)),
        cons: product.cons.map((point) => trustValue(point, candidate)),
        requirementChecks: product.requirementExplanations.map(
          (requirement) => ({
            requirement: requirement.requirementId,
            status: "Pass",
            explanation: requirement.text,
            trust: "research_synthesis",
            label: TWO_LAYER_TRUST_LABELS.research_synthesis,
            sourceIds: [...requirement.evidenceIds],
          }),
        ),
        claims: candidate.facts
          .filter(
            (fact) =>
              fact.verification === "source_reported" &&
              !["identity", "product_type"].includes(fact.kind),
          )
          .map((fact) => ({
            claimType: claimType(fact.kind),
            value: fact.statement,
            trust: "source_reported" as const,
            label: TWO_LAYER_TRUST_LABELS.source_reported,
            sourceIds: [...fact.evidenceIds],
            evidenceScope: "exact_model" as const,
          })),
        commerce: hasVerifiedCommerce
          ? {
              state: "verified",
              label: TWO_LAYER_TRUST_LABELS.verified_transactional,
              priceAmount: price!,
              currency: "USD",
              seller: commerceEvidence!.host,
              productUrl: candidate.assets.productUrl!,
              availability: "in_stock",
              observedAt,
            }
          : {
              state: "not_verified",
              label: "Check current price",
              priceAmount: null,
              currency: null,
              seller: null,
              productUrl: null,
              availability: null,
              observedAt: null,
            },
        image: candidate.assets.imageUrl
          ? {
              state: "verified",
              label: TWO_LAYER_TRUST_LABELS.verified_transactional,
              url: candidate.assets.imageUrl,
            }
          : {
              state: "not_verified",
              label: TWO_LAYER_TRUST_LABELS.unresolved,
              url: null,
            },
      } satisfies TwoLayerProductCard;
    },
  );
  return {
    rendererVersion: STAGED_TERRA_RENDERER_VERSION,
    cards,
    sources,
    finalAdvice: presentation.finalAdvice.map((item) => item.text),
  };
}
