import type { ProductRecommendation } from "../types/review-radar.ts";
import type { SelectedSmartFeature } from "../types/smart-features.ts";
import {
  type CommerceShoppingResult,
  verifyCommerceShoppingResults,
} from "./autonomousCommerceVerifier.ts";
import {
  type HybridFetchResult,
  type HybridPageObservation,
  type HybridProvisionalProduct,
  type HybridSourceRole,
  observeHybridSourceHtml,
  verifyHybridProductSource,
} from "./autonomousFactVerifier.ts";
import {
  buildDirectTerraRequirementContract,
  type DirectTerraRequirementContractEntry,
} from "./directTerraCandidateSlate.ts";
import {
  type DirectTerraAssetCandidate,
  type DirectTerraAssetDecision,
  type DirectTerraAssetTarget,
  verifyDirectTerraAssetCandidates,
} from "./directTerraAssetVerifier.ts";
import { directTerraRelationshipCanSupplyAsset } from "./directTerraProductRelationship.ts";
import { parseMaxBudgetAmount } from "./priceParsing.ts";
import { validateProductAgainstRequirements } from "./requirementValidation.ts";
import {
  buildStagedTerraRequestFingerprint,
  STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
  type StagedTerraEvidence,
  type StagedTerraEvidencePackage,
  type StagedTerraResearchCandidate,
  type StagedTerraResearchOutput,
  type StagedTerraVerifiedCandidate,
  type StagedTerraVerifiedFact,
  type StagedTerraVerifiedRequirement,
  validateStagedTerraEvidencePackage,
} from "./stagedTerraContract.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";

export const STAGED_TERRA_VERIFIER_VERSION = "staged-terra-verifier-v2";

const SOURCE_ROLES = new Set<HybridSourceRole>([
  "official_product",
  "purchase_page",
  "manufacturer_spec",
  "professional_test",
  "owner_feedback",
  "warranty_support",
  "other",
]);

const OBSERVED_CLAIM_KINDS = new Set([
  "specification",
  "performance",
  "owner_feedback",
] as const);

export type StagedTerraRequirementSignal = {
  requirementId: string;
  verdict: "supports" | "conflicts";
};

export type StagedTerraObservedClaim = {
  kind: "specification" | "performance" | "owner_feedback";
  statement: string;
  requirementSignals: StagedTerraRequirementSignal[];
};

export type StagedTerraSourceObservation = {
  sourceUrl: string;
  sourceRole: HybridSourceRole;
  fetch: Extract<HybridFetchResult, { ok: true }>;
  observedAt: string;
  claims: StagedTerraObservedClaim[];
};

export type StagedTerraCandidateVerificationInput = {
  candidateId: string;
  sources: StagedTerraSourceObservation[];
  shoppingResults: CommerceShoppingResult[];
};

export type StagedTerraVerifierInput = {
  shopperRequest: DirectTerraShopperRequest;
  researchOutput: StagedTerraResearchOutput;
  market: "US";
  candidates: StagedTerraCandidateVerificationInput[];
};

export type StagedTerraCandidateFirstLoss =
  | "asset_identity_unproven"
  | "complete_product_relationship_unproven"
  | "identity_safe_product_url_unavailable"
  | "hard_requirement_failed"
  | "hard_requirement_not_verified"
  | "no_loss_eligible";

export type StagedTerraVerifierRejectionReason =
  | "source_not_owned_by_candidate"
  | "source_input_invalid"
  | "observed_claim_invalid";

export type StagedTerraVerifierAggregateDiagnostic = {
  candidateFirstLossCounts: {
    assetIdentityUnproven: number;
    completeProductRelationshipUnproven: number;
    identitySafeProductUrlUnavailable: number;
    hardRequirementFailed: number;
    hardRequirementNotVerified: number;
    noLossEligible: number;
  };
  sourceRejectionCandidateCounts: {
    sourceNotOwnedByCandidate: number;
    sourceInputInvalid: number;
  };
  claimRejectionCandidateCounts: {
    observedClaimInvalid: number;
  };
};

export type StagedTerraCandidateDiagnostic = {
  candidateId: string;
  outcome: StagedTerraVerifiedCandidate["eligibility"];
  acceptedSourceCount: number;
  rejectedSourceCount: number;
  rejectionReasons: StagedTerraVerifierRejectionReason[];
  assetIdentityAccepted: boolean;
  completeProductRelationshipProven: boolean;
  identitySafeProductUrlProven: boolean;
  verifiedPriceCount: number;
  productUrlAvailable: boolean;
  imageUrlAvailable: boolean;
};

export type StagedTerraVerifierResult = {
  verifierVersion: typeof STAGED_TERRA_VERIFIER_VERSION;
  evidencePackage: StagedTerraEvidencePackage;
  diagnostics: {
    verifierVersion: typeof STAGED_TERRA_VERIFIER_VERSION;
    candidateCount: number;
    candidates: StagedTerraCandidateDiagnostic[];
    aggregate: StagedTerraVerifierAggregateDiagnostic;
  };
};

type AcceptedSource = {
  input: StagedTerraSourceObservation;
  title: string;
  sourceType: StagedTerraEvidence["sourceType"];
  verification: ReturnType<typeof verifyHybridProductSource>;
  claimEligible: boolean;
  identityEligible: boolean;
  assetCandidateIndex: number;
  claimEvidenceId: string | null;
};

type AssetProvenance = {
  title: string;
  sourceType: StagedTerraEvidence["sourceType"];
};

type PriceObservation = {
  amount: number;
  evidenceId: string;
};

type AvailabilityObservation = {
  verdict: "pass" | "fail";
  evidenceId: string;
};

class EvidenceAccumulator {
  private nextId = 1;
  private readonly evidence: StagedTerraEvidence[] = [];
  private readonly byKey = new Map<string, string>();

  add(input: Omit<StagedTerraEvidence, "evidenceId">) {
    const key = [
      input.candidateId,
      input.kind,
      input.url,
      input.title,
      input.sourceType,
    ].join("\u0000");
    const existing = this.byKey.get(key);
    if (existing) return existing;
    const evidenceId = `e${this.nextId++}`;
    this.evidence.push({ evidenceId, ...input });
    this.byKey.set(key, evidenceId);
    return evidenceId;
  }

  values() {
    return [...this.evidence];
  }
}

function text(value: unknown, maximum: number) {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/g, " ").trim();
  if (
    compact.length === 0 ||
    compact.length > maximum ||
    /https?:\/\//i.test(compact) ||
    /[\u0000-\u001f\u007f]/.test(compact)
  ) {
    return "";
  }
  return compact;
}

function exactUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 4_096) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443")
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function successfulFetchIsBounded(source: StagedTerraSourceObservation) {
  const fetch = source.fetch;
  return Boolean(
    fetch &&
      fetch.ok === true &&
      fetch.requestedUrl === source.sourceUrl &&
      exactUrl(fetch.finalUrl) &&
      fetch.status >= 200 &&
      fetch.status < 300 &&
      ["text/html", "application/xhtml+xml"].includes(
        fetch.contentType.toLowerCase(),
      ) &&
      Number.isInteger(fetch.redirectCount) &&
      fetch.redirectCount >= 0 &&
      fetch.redirectCount <= 2 &&
      fetch.attempts === fetch.redirectCount + 1 &&
      typeof fetch.body === "string" &&
      fetch.body.length <= 2_000_000 &&
      Buffer.byteLength(fetch.body) <= 2_000_000 &&
      Buffer.byteLength(fetch.body) === fetch.byteLength &&
      /^[a-f0-9]{64}$/.test(fetch.contentHash),
  );
}

function observedPageText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, " and ")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedClaimText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceTypeForRole(
  role: HybridSourceRole,
): StagedTerraEvidence["sourceType"] {
  if (role === "official_product" || role === "manufacturer_spec") {
    return "manufacturer";
  }
  if (role === "purchase_page") return "retailer";
  if (role === "professional_test") return "independent_testing";
  if (role === "owner_feedback") return "owner_feedback";
  return "other";
}

function sourceRoleCanSupplyProduct(role: HybridSourceRole) {
  return role === "official_product" || role === "purchase_page";
}

function sourceTitle(
  source: StagedTerraSourceObservation,
  observation: HybridPageObservation,
) {
  return (
    text(observation.heading, 500) ||
    text(observation.pageTitle, 500) ||
    new URL(source.sourceUrl).hostname
  );
}

function provisionalProduct(
  candidate: StagedTerraResearchCandidate,
  sourceUrl: string,
): HybridProvisionalProduct {
  return {
    identity: {
      brand: candidate.brand,
      productName: candidate.productName,
      model: candidate.model,
    },
    priceAmount: null,
    currency: "USD",
    seller: "",
    productUrl: sourceUrl,
    imageUrl: null,
    rating: null,
    reviewCount: null,
  };
}

function sourceAssetCandidate(
  source: StagedTerraSourceObservation,
  observation: HybridPageObservation,
  verification: ReturnType<typeof verifyHybridProductSource>,
): DirectTerraAssetCandidate {
  const exactEntity =
    verification.exactEntityIndex === null
      ? null
      : observation.entities[verification.exactEntityIndex] ?? null;
  return {
    title:
      exactEntity?.name ||
      observation.heading ||
      observation.pageTitle,
    productUrl: sourceRoleCanSupplyProduct(source.sourceRole)
      ? verification.purchaseUrl.status === "verified"
        ? verification.purchaseUrl.observedValue
        : observation.finalUrl
      : null,
    imageUrl:
      verification.imageUrl.status === "verified"
        ? verification.imageUrl.observedValue
        : null,
    imageSource: "json_ld",
    snippet: source.claims.map((claim) => claim.statement).join(" "),
    structuredProductNames: observation.entities.map((entity) => entity.name),
  };
}

function targetForCandidate(
  candidate: StagedTerraResearchCandidate,
  ordinal: number,
): DirectTerraAssetTarget {
  return {
    key: candidate.candidateId,
    rank: ordinal,
    productName: candidate.productName,
    brand: candidate.brand,
    model: candidate.model,
    category: candidate.productType,
  };
}

function relationshipIsComplete(decision: DirectTerraAssetDecision | undefined) {
  return Boolean(
    decision &&
      decision.identityAccepted &&
      directTerraRelationshipCanSupplyAsset(decision.relationship),
  );
}

function relationshipCanReportClaim(
  decision: DirectTerraAssetDecision | undefined,
) {
  return Boolean(
    decision?.identityAccepted &&
      decision.relationship !== "accessory_or_replacement" &&
      decision.relationship !== "different_product",
  );
}

function availabilityVerdict(value: string | null) {
  if (!value) return null;
  if (
    /(?:in\s*stock|instock|preorder|pre-order|limitedavailability|onlineonly)/i.test(
      value,
    )
  ) {
    return "pass" as const;
  }
  if (/(?:out\s*of\s*stock|outofstock|sold\s*out|discontinued)/i.test(value)) {
    return "fail" as const;
  }
  return null;
}

function safeClaim(
  claim: StagedTerraObservedClaim,
  requirementIds: ReadonlySet<string>,
  sourceText: string,
) {
  if (
    !claim ||
    typeof claim !== "object" ||
    !OBSERVED_CLAIM_KINDS.has(claim.kind) ||
    !Array.isArray(claim.requirementSignals)
  ) {
    return null;
  }
  const statement = text(claim.statement, 500);
  const normalizedStatement = normalizedClaimText(statement);
  const normalizedSource = normalizedClaimText(sourceText);
  if (
    !statement ||
    !normalizedStatement ||
    !normalizedSource.includes(normalizedStatement)
  ) {
    return null;
  }
  const seen = new Set<string>();
  const signals: StagedTerraRequirementSignal[] = [];
  for (const signal of claim.requirementSignals) {
    if (
      !signal ||
      typeof signal !== "object" ||
      !requirementIds.has(signal.requirementId) ||
      !["supports", "conflicts"].includes(signal.verdict) ||
      seen.has(signal.requirementId)
    ) {
      return null;
    }
    seen.add(signal.requirementId);
    signals.push({
      requirementId: signal.requirementId,
      verdict: signal.verdict,
    });
  }
  return { kind: claim.kind, statement, requirementSignals: signals };
}

function metadataField<T>(value: T, sourceUrl: string) {
  return {
    confidence: "High" as const,
    sourceType: "json_ld" as const,
    sourceUrl,
    value,
    verifiedAt: "server-observed",
  };
}

function requirementProduct(input: {
  candidate: StagedTerraResearchCandidate;
  claims: Array<{ statement: string; sourceUrl: string }>;
  productUrl: string | null;
  imageUrl: string | null;
  price: PriceObservation | null;
}) {
  const firstSource =
    input.claims[0]?.sourceUrl ||
    input.productUrl ||
    input.candidate.sourceUrls[0] ||
    "";
  const claimText = input.claims.map((claim) => claim.statement);
  const price = input.price?.amount ?? null;
  const product: ProductRecommendation = {
    recommendation_type: "Best Match",
    name: input.candidate.productName,
    category: input.candidate.productType,
    product_page_url: input.productUrl ?? "",
    product_image_url: input.imageUrl ?? "",
    why_recommended: claimText.join(" "),
    pros: claimText,
    cons: [],
    common_complaints: [],
    estimated_price_range: price === null ? "Price not verified" : `$${price}`,
    confidence_score: 0,
    source_consensus: "Weak",
    price_value_verdict:
      price === null ? "Price not verified" : `Verified price: $${price}`,
    best_for: "",
    not_for: [],
    citations: input.claims.map((claim, index) => ({
      title: `Observed source ${index + 1}`,
      url: claim.sourceUrl,
      what_it_supports: claim.statement,
    })),
    metadata: {
      brand: metadataField(input.candidate.brand, firstSource),
      modelNumber: metadataField(input.candidate.model, firstSource),
      title: metadataField(input.candidate.productName, firstSource),
      offers:
        price === null || !input.productUrl
          ? []
          : [
              {
                availability: metadataField("In stock", input.productUrl),
                price: metadataField(price, input.productUrl),
                priceCurrency: metadataField("USD", input.productUrl),
                retailer: new URL(input.productUrl).hostname,
                url: input.productUrl,
              },
            ],
    },
    priceTrust: {
      status: price === null ? "missing" : "verified",
      price,
      canUseForBudget: price !== null,
      canBeExactWithBudget: price !== null,
      displayText: price === null ? "Price not verified" : `$${price}`,
      warnings: [],
      sources: input.price ? [input.price.evidenceId] : [],
    },
  };
  return product;
}

function requirementRequest(
  requirement: DirectTerraRequirementContractEntry,
  shopperRequest: DirectTerraShopperRequest,
) {
  if (requirement.kind === "budget") {
    return { budget: shopperRequest.budget };
  }
  if (requirement.kind === "important_details") {
    const value = shopperRequest.priorities?.trim();
    if (!value) return {};
    const importantDetail: SelectedSmartFeature = {
      id: "important-details",
      name: "Important details",
      type: "text",
      operator: "required",
      value,
      required: true,
      source: "smart_features",
    };
    return { selectedFeatures: [importantDetail] };
  }
  if (requirement.kind === "dealbreakers") {
    return { avoid: shopperRequest.avoid };
  }
  if (requirement.kind === "smart_feature") {
    const id = requirement.id.replace(/^smart_feature:/, "");
    const selectedFeatures = (shopperRequest.selectedFeatures ?? []).filter(
      (feature) => feature.id === id,
    );
    return { selectedFeatures };
  }
  return {};
}

function verdictFromValidation(
  result: ReturnType<typeof validateProductAgainstRequirements>,
) {
  if (result.missingRequirements.length > 0) return "fail" as const;
  if (
    result.unknownRequirements.length > 0 ||
    result.matchedRequirements.length === 0
  ) {
    return "not_verified" as const;
  }
  return "pass" as const;
}

function exclusionReason(input: {
  identitySafeProductUrlProven: boolean;
  verdicts: StagedTerraVerifiedRequirement[];
}) {
  if (!input.identitySafeProductUrlProven) {
    return "Exact product identity was not proven.";
  }
  const failed = input.verdicts.find((verdict) => verdict.verdict === "fail");
  if (failed) return `Hard requirement failed: ${failed.requirementId}.`;
  const unknown = input.verdicts.find(
    (verdict) => verdict.verdict === "not_verified",
  );
  if (unknown) return `Hard requirement not verified: ${unknown.requirementId}.`;
  return null;
}

function candidateFirstLoss(input: {
  assetIdentityAccepted: boolean;
  completeProductRelationshipProven: boolean;
  identitySafeProductUrlProven: boolean;
  verdicts: StagedTerraVerifiedRequirement[];
}): StagedTerraCandidateFirstLoss {
  if (!input.assetIdentityAccepted) return "asset_identity_unproven";
  if (!input.completeProductRelationshipProven) {
    return "complete_product_relationship_unproven";
  }
  if (!input.identitySafeProductUrlProven) {
    return "identity_safe_product_url_unavailable";
  }
  if (input.verdicts.some((verdict) => verdict.verdict === "fail")) {
    return "hard_requirement_failed";
  }
  if (input.verdicts.some((verdict) => verdict.verdict === "not_verified")) {
    return "hard_requirement_not_verified";
  }
  return "no_loss_eligible";
}

function snakeEvidence(evidence: StagedTerraEvidence[]) {
  return evidence.map((item) => ({
    evidence_id: item.evidenceId,
    candidate_id: item.candidateId,
    kind: item.kind,
    url: item.url,
    host: item.host,
    title: item.title,
    source_type: item.sourceType,
  }));
}

function snakeCandidate(candidate: StagedTerraVerifiedCandidate) {
  return {
    candidate_id: candidate.candidateId,
    product_name: candidate.productName,
    brand: candidate.brand,
    model: candidate.model,
    product_type: candidate.productType,
    eligibility: candidate.eligibility,
    exclusion_reason: candidate.exclusionReason,
    requirement_verdicts: candidate.requirementVerdicts.map((verdict) => ({
      requirement_id: verdict.requirementId,
      verdict: verdict.verdict,
      evidence_ids: verdict.evidenceIds,
    })),
    facts: candidate.facts.map((fact) => ({
      fact_id: fact.factId,
      kind: fact.kind,
      statement: fact.statement,
      verification: fact.verification,
      evidence_ids: fact.evidenceIds,
    })),
    assets: {
      product_url: candidate.assets.productUrl,
      product_url_evidence_id: candidate.assets.productUrlEvidenceId,
      image_url: candidate.assets.imageUrl,
      image_url_evidence_id: candidate.assets.imageUrlEvidenceId,
    },
  };
}

export function materializeStagedTerraEvidencePackage(
  input: StagedTerraVerifierInput,
): StagedTerraVerifierResult {
  if (input.market !== "US") {
    throw new Error("staged_terra_verifier_market_invalid");
  }
  const requirements = buildDirectTerraRequirementContract(
    input.shopperRequest,
  );
  const requirementIds = new Set(requirements.map((item) => item.id));
  const researchById = new Map(
    input.researchOutput.candidates.map((candidate) => [
      candidate.candidateId,
      candidate,
    ]),
  );
  const observationsById = new Map<
    string,
    StagedTerraCandidateVerificationInput
  >();
  for (const candidate of input.candidates) {
    if (
      !researchById.has(candidate.candidateId) ||
      observationsById.has(candidate.candidateId)
    ) {
      throw new Error("staged_terra_verifier_candidate_input_invalid");
    }
    observationsById.set(candidate.candidateId, candidate);
  }

  const evidence = new EvidenceAccumulator();
  const verifiedCandidates: StagedTerraVerifiedCandidate[] = [];
  const diagnostics: StagedTerraCandidateDiagnostic[] = [];
  const aggregate: StagedTerraVerifierAggregateDiagnostic = {
    candidateFirstLossCounts: {
      assetIdentityUnproven: 0,
      completeProductRelationshipUnproven: 0,
      identitySafeProductUrlUnavailable: 0,
      hardRequirementFailed: 0,
      hardRequirementNotVerified: 0,
      noLossEligible: 0,
    },
    sourceRejectionCandidateCounts: {
      sourceNotOwnedByCandidate: 0,
      sourceInputInvalid: 0,
    },
    claimRejectionCandidateCounts: {
      observedClaimInvalid: 0,
    },
  };

  for (
    let candidateIndex = 0;
    candidateIndex < input.researchOutput.candidates.length;
    candidateIndex++
  ) {
    const candidate = input.researchOutput.candidates[candidateIndex];
    const candidateInput = observationsById.get(candidate.candidateId) ?? {
      candidateId: candidate.candidateId,
      sources: [],
      shoppingResults: [],
    };
    const rejectionReasons: StagedTerraVerifierRejectionReason[] = [];
    const acceptedSources: AcceptedSource[] = [];
    const assetCandidates: DirectTerraAssetCandidate[] = [];
    const assetProvenance: AssetProvenance[] = [];
    const seenSources = new Set<string>();
    if (
      candidateInput.sources.length > 12 ||
      candidateInput.shoppingResults.length > 100
    ) {
      throw new Error("staged_terra_verifier_candidate_input_too_large");
    }

    for (const source of candidateInput.sources) {
      if (
        !candidate.sourceUrls.includes(source.sourceUrl) ||
        source.fetch?.requestedUrl !== source.sourceUrl
      ) {
        rejectionReasons.push("source_not_owned_by_candidate");
        continue;
      }
      if (
        !exactUrl(source.sourceUrl) ||
        !SOURCE_ROLES.has(source.sourceRole) ||
        !successfulFetchIsBounded(source) ||
        !text(source.observedAt, 100) ||
        source.claims.length > 24 ||
        seenSources.has(source.sourceUrl)
      ) {
        rejectionReasons.push("source_input_invalid");
        continue;
      }
      seenSources.add(source.sourceUrl);
      const observation = observeHybridSourceHtml({
        html: source.fetch.body,
        requestedUrl: source.fetch.requestedUrl,
        finalUrl: source.fetch.finalUrl,
        observedAt: source.observedAt,
        status: source.fetch.status,
        contentType: source.fetch.contentType,
        redirectCount: source.fetch.redirectCount,
      });
      if (observation.contentHash !== source.fetch.contentHash) {
        rejectionReasons.push("source_input_invalid");
        continue;
      }
      const verification = verifyHybridProductSource({
        product: provisionalProduct(candidate, source.sourceUrl),
        sourceRole: source.sourceRole,
        observation,
      });
      const title = sourceTitle(source, observation);
      const assetCandidateIndex = assetCandidates.length;
      assetCandidates.push(
        sourceAssetCandidate(source, observation, verification),
      );
      assetProvenance.push({
        title,
        sourceType: sourceTypeForRole(source.sourceRole),
      });
      acceptedSources.push({
        input: source,
        title,
        sourceType: sourceTypeForRole(source.sourceRole),
        verification,
        claimEligible: false,
        identityEligible: false,
        assetCandidateIndex,
        claimEvidenceId: null,
      });
    }

    const commerce = verifyCommerceShoppingResults({
      target: {
        key: candidate.candidateId,
        brand: candidate.brand,
        productName: candidate.productName,
        model: candidate.model,
        category: candidate.productType,
      },
      results: candidateInput.shoppingResults,
    });
    const commerceAssetIndex =
      commerce.offer === null ? null : assetCandidates.length;
    if (commerce.offer) {
      assetCandidates.push({
        title: commerce.offer.title,
        productUrl: commerce.offer.productUrl,
        imageUrl: commerce.offer.imageUrl,
        imageSource: "serper_shopping",
        snippet: "",
        structuredProductNames: [commerce.offer.title],
      });
      assetProvenance.push({
        title: commerce.offer.title,
        sourceType: "retailer",
      });
    }

    const assetVerification = verifyDirectTerraAssetCandidates({
      target: targetForCandidate(candidate, candidateIndex + 1),
      candidates: assetCandidates,
    });
    const assetIdentityAccepted = assetVerification.decisions.some(
      (decision) => decision.identityAccepted,
    );
    const completeProductRelationshipProven =
      assetVerification.decisions.some(relationshipIsComplete);

    for (const source of acceptedSources) {
      const decision = assetVerification.decisions[source.assetCandidateIndex];
      source.identityEligible =
        relationshipIsComplete(decision) &&
        Boolean(decision?.productUrlAccepted);
      source.claimEligible =
        source.identityEligible ||
        (source.input.sourceRole === "professional_test" &&
          source.verification.editorialModel.status === "verified") ||
        ((source.input.sourceRole === "owner_feedback" ||
          source.input.sourceRole === "manufacturer_spec") &&
          source.verification.identity.status === "verified" &&
          relationshipCanReportClaim(decision));
      if (!source.claimEligible) continue;
      source.claimEvidenceId = evidence.add({
        candidateId: candidate.candidateId,
        kind: "claim",
        url: source.input.sourceUrl,
        host: new URL(source.input.sourceUrl).hostname,
        title: source.title,
        sourceType: source.sourceType,
      });
    }

    let commerceClaimEvidenceId: string | null = null;
    const commerceDecision =
      commerceAssetIndex === null
        ? undefined
        : assetVerification.decisions[commerceAssetIndex];
    const commerceIdentityEligible =
      commerce.offer !== null &&
      relationshipIsComplete(commerceDecision) &&
      Boolean(commerceDecision?.productUrlAccepted);
    if (commerce.offer && commerceIdentityEligible) {
      commerceClaimEvidenceId = evidence.add({
        candidateId: candidate.candidateId,
        kind: "claim",
        url: commerce.offer.productUrl,
        host: new URL(commerce.offer.productUrl).hostname,
        title: commerce.offer.title,
        sourceType: "retailer",
      });
    }

    const identityEvidenceIds = [
      ...acceptedSources
        .filter((source) => source.identityEligible)
        .map((source) => source.claimEvidenceId)
        .filter((id): id is string => Boolean(id)),
      ...(commerceClaimEvidenceId ? [commerceClaimEvidenceId] : []),
    ];
    const identitySafeProductUrlProven = identityEvidenceIds.length > 0;

    const acceptedClaims: Array<{
      kind: StagedTerraObservedClaim["kind"];
      statement: string;
      sourceUrl: string;
      evidenceId: string;
      requirementSignals: StagedTerraRequirementSignal[];
    }> = [];
    let rejectedClaimCount = 0;
    for (const source of acceptedSources) {
      if (!source.claimEligible || !source.claimEvidenceId) continue;
      const sourceText = observedPageText(source.input.fetch.body);
      for (const claim of source.input.claims) {
        const parsed = safeClaim(claim, requirementIds, sourceText);
        if (!parsed) {
          rejectedClaimCount++;
          continue;
        }
        if (
          parsed.kind === "performance" &&
          source.input.sourceRole !== "professional_test"
        ) {
          rejectedClaimCount++;
          continue;
        }
        if (
          parsed.kind === "owner_feedback" &&
          ![
            "owner_feedback",
            "official_product",
            "purchase_page",
          ].includes(source.input.sourceRole)
        ) {
          rejectedClaimCount++;
          continue;
        }
        acceptedClaims.push({
          ...parsed,
          sourceUrl: source.input.sourceUrl,
          evidenceId: source.claimEvidenceId,
        });
      }
    }
    if (rejectedClaimCount > 0) {
      rejectionReasons.push("observed_claim_invalid");
    }

    const priceObservations: PriceObservation[] = [];
    const availabilityObservations: AvailabilityObservation[] = [];
    for (const source of acceptedSources) {
      if (!source.identityEligible || !source.claimEvidenceId) continue;
      if (
        source.verification.price.status === "verified" &&
        source.verification.currency.status === "verified" &&
        source.verification.currency.observedValue?.toUpperCase() === "USD" &&
        typeof source.verification.price.observedValue === "number" &&
        source.verification.price.observedValue > 0
      ) {
        priceObservations.push({
          amount: source.verification.price.observedValue,
          evidenceId: source.claimEvidenceId,
        });
      }
      const marketVerdict = availabilityVerdict(
        source.verification.availability.observedValue,
      );
      if (marketVerdict) {
        availabilityObservations.push({
          verdict: marketVerdict,
          evidenceId: source.claimEvidenceId,
        });
      }
    }
    if (commerce.offer && commerceClaimEvidenceId) {
      priceObservations.push({
        amount: commerce.offer.priceAmount,
        evidenceId: commerceClaimEvidenceId,
      });
      availabilityObservations.push({
        verdict: "pass",
        evidenceId: commerceClaimEvidenceId,
      });
    }
    priceObservations.sort((left, right) => left.amount - right.amount);
    const bestPrice = priceObservations[0] ?? null;

    let productUrl: string | null = null;
    let productUrlEvidenceId: string | null = null;
    let imageUrl: string | null = null;
    let imageUrlEvidenceId: string | null = null;
    if (assetVerification.productUrl) {
      const decision = assetVerification.decisions.find(
        (item) =>
          item.productUrlAccepted &&
          item.productUrl === assetVerification.productUrl,
      );
      const provenance = decision
        ? assetProvenance[decision.candidateIndex]
        : null;
      if (provenance) {
        productUrl = assetVerification.productUrl;
        productUrlEvidenceId = evidence.add({
          candidateId: candidate.candidateId,
          kind: "product_page",
          url: productUrl,
          host: new URL(productUrl).hostname,
          title: provenance.title,
          sourceType: provenance.sourceType,
        });
      }
    }
    if (assetVerification.imageUrl) {
      const decision = assetVerification.decisions.find(
        (item) =>
          item.imageUrlAccepted && item.imageUrl === assetVerification.imageUrl,
      );
      const provenance = decision
        ? assetProvenance[decision.candidateIndex]
        : null;
      if (provenance) {
        imageUrl = assetVerification.imageUrl;
        imageUrlEvidenceId = evidence.add({
          candidateId: candidate.candidateId,
          kind: "image",
          url: imageUrl,
          host: new URL(imageUrl).hostname,
          title: `${provenance.title} product image`,
          sourceType: provenance.sourceType,
        });
      }
    }

    const facts: StagedTerraVerifiedFact[] = [];
    const addFact = (
      kind: StagedTerraVerifiedFact["kind"],
      statement: string,
      verification: StagedTerraVerifiedFact["verification"],
      evidenceIds: string[],
    ) => {
      const safe = text(statement, 500);
      const uniqueEvidence = [...new Set(evidenceIds)];
      if (!safe || uniqueEvidence.length === 0) return;
      facts.push({
        factId: `${candidate.candidateId}_fact_${facts.length + 1}`,
        kind,
        statement: safe,
        verification,
        evidenceIds: uniqueEvidence,
      });
    };
    if (identitySafeProductUrlProven) {
      addFact(
        "identity",
        `Exact product identity was verified for ${candidate.productName}.`,
        "verified",
        identityEvidenceIds,
      );
      addFact(
        "product_type",
        `The source identifies a complete ${candidate.productType}.`,
        "verified",
        identityEvidenceIds,
      );
    }
    for (const claim of acceptedClaims) {
      addFact(
        claim.kind,
        claim.statement,
        "source_reported",
        [claim.evidenceId],
      );
    }
    if (bestPrice) {
      addFact(
        "price",
        `A current exact-product price of $${bestPrice.amount.toFixed(2)} was verified.`,
        "verified",
        [bestPrice.evidenceId],
      );
    }
    const passingAvailability = availabilityObservations.filter(
      (item) => item.verdict === "pass",
    );
    if (passingAvailability.length > 0) {
      addFact(
        "availability",
        "Current U.S. product availability was verified.",
        "verified",
        passingAvailability.map((item) => item.evidenceId),
      );
    }

    const requirementVerdicts: StagedTerraVerifiedRequirement[] = [];
    for (const requirement of requirements) {
      if (requirement.kind === "us_availability") {
        const evidenceIds =
          passingAvailability.length > 0
            ? passingAvailability.map((item) => item.evidenceId)
            : availabilityObservations
                .filter((item) => item.verdict === "fail")
                .map((item) => item.evidenceId);
        requirementVerdicts.push({
          requirementId: requirement.id,
          verdict:
            passingAvailability.length > 0
              ? "pass"
              : evidenceIds.length > 0
                ? "fail"
                : "not_verified",
          evidenceIds,
        });
        continue;
      }
      if (requirement.kind === "budget") {
        const maximum = parseMaxBudgetAmount(input.shopperRequest.budget);
        requirementVerdicts.push({
          requirementId: requirement.id,
          verdict:
            !bestPrice || maximum === null
              ? "not_verified"
              : bestPrice.amount <= maximum
                ? "pass"
                : "fail",
          evidenceIds: bestPrice ? [bestPrice.evidenceId] : [],
        });
        continue;
      }
      const relevantClaims = acceptedClaims.filter((claim) =>
        claim.requirementSignals.some(
          (signal) => signal.requirementId === requirement.id,
        ),
      );
      const evidenceIds = [
        ...new Set(relevantClaims.map((claim) => claim.evidenceId)),
      ];
      if (relevantClaims.length === 0) {
        requirementVerdicts.push({
          requirementId: requirement.id,
          verdict: "not_verified",
          evidenceIds: [],
        });
        continue;
      }
      const product = requirementProduct({
        candidate,
        claims: relevantClaims.map((claim) => ({
          statement: claim.statement,
          sourceUrl: claim.sourceUrl,
        })),
        productUrl,
        imageUrl,
        price: bestPrice,
      });
      const validation = validateProductAgainstRequirements(
        product,
        requirementRequest(requirement, input.shopperRequest),
      );
      const validatedVerdict = verdictFromValidation(validation);
      const hasConflictingSignal = relevantClaims.some((claim) =>
        claim.requirementSignals.some(
          (signal) =>
            signal.requirementId === requirement.id &&
            signal.verdict === "conflicts",
        ),
      );
      const hasSupportingSignal = relevantClaims.some((claim) =>
        claim.requirementSignals.some(
          (signal) =>
            signal.requirementId === requirement.id &&
            signal.verdict === "supports",
        ),
      );
      requirementVerdicts.push({
        requirementId: requirement.id,
        verdict:
          hasConflictingSignal && validatedVerdict === "fail"
            ? "fail"
            : hasSupportingSignal && validatedVerdict === "pass"
              ? "pass"
              : "not_verified",
        evidenceIds:
          (hasConflictingSignal && validatedVerdict === "fail") ||
          (hasSupportingSignal && validatedVerdict === "pass")
            ? evidenceIds
            : [],
      });
    }

    const reason = exclusionReason({
      identitySafeProductUrlProven,
      verdicts: requirementVerdicts,
    });
    const eligibility: StagedTerraVerifiedCandidate["eligibility"] =
      !identitySafeProductUrlProven
        ? "excluded"
        : requirementVerdicts.some((item) => item.verdict === "fail")
          ? "excluded"
          : requirementVerdicts.some(
                (item) => item.verdict === "not_verified",
              )
            ? "close_match"
            : "eligible";
    const firstLoss = candidateFirstLoss({
      assetIdentityAccepted,
      completeProductRelationshipProven,
      identitySafeProductUrlProven,
      verdicts: requirementVerdicts,
    });
    const expectedEligibility =
      firstLoss === "no_loss_eligible"
        ? "eligible"
        : firstLoss === "hard_requirement_not_verified"
          ? "close_match"
          : "excluded";
    if (eligibility !== expectedEligibility) {
      throw new Error("staged_terra_verifier_first_loss_inconsistent");
    }
    if (firstLoss === "asset_identity_unproven") {
      aggregate.candidateFirstLossCounts.assetIdentityUnproven += 1;
    } else if (firstLoss === "complete_product_relationship_unproven") {
      aggregate.candidateFirstLossCounts.completeProductRelationshipUnproven +=
        1;
    } else if (firstLoss === "identity_safe_product_url_unavailable") {
      aggregate.candidateFirstLossCounts.identitySafeProductUrlUnavailable += 1;
    } else if (firstLoss === "hard_requirement_failed") {
      aggregate.candidateFirstLossCounts.hardRequirementFailed += 1;
    } else if (firstLoss === "hard_requirement_not_verified") {
      aggregate.candidateFirstLossCounts.hardRequirementNotVerified += 1;
    } else {
      aggregate.candidateFirstLossCounts.noLossEligible += 1;
    }
    if (eligibility !== "eligible") {
      productUrl = null;
      productUrlEvidenceId = null;
      imageUrl = null;
      imageUrlEvidenceId = null;
    }

    verifiedCandidates.push({
      candidateId: candidate.candidateId,
      productName: candidate.productName,
      brand: candidate.brand,
      model: candidate.model,
      productType: candidate.productType,
      eligibility,
      exclusionReason: eligibility === "eligible" ? null : reason,
      requirementVerdicts,
      facts,
      assets: {
        productUrl,
        productUrlEvidenceId,
        imageUrl,
        imageUrlEvidenceId,
      },
    });
    const uniqueRejectionReasons = [...new Set(rejectionReasons)];
    if (uniqueRejectionReasons.includes("source_not_owned_by_candidate")) {
      aggregate.sourceRejectionCandidateCounts.sourceNotOwnedByCandidate += 1;
    }
    if (uniqueRejectionReasons.includes("source_input_invalid")) {
      aggregate.sourceRejectionCandidateCounts.sourceInputInvalid += 1;
    }
    if (uniqueRejectionReasons.includes("observed_claim_invalid")) {
      aggregate.claimRejectionCandidateCounts.observedClaimInvalid += 1;
    }
    diagnostics.push({
      candidateId: candidate.candidateId,
      outcome: eligibility,
      acceptedSourceCount: acceptedSources.filter(
        (source) => source.claimEligible,
      ).length,
      rejectedSourceCount:
        candidateInput.sources.length -
        acceptedSources.filter((source) => source.claimEligible).length,
      rejectionReasons: uniqueRejectionReasons,
      assetIdentityAccepted,
      completeProductRelationshipProven,
      identitySafeProductUrlProven,
      verifiedPriceCount: priceObservations.length,
      productUrlAvailable: Boolean(productUrl),
      imageUrlAvailable: Boolean(imageUrl),
    });
  }

  const evidenceItems = evidence.values();
  const rawPackage = {
    schema_version: STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
    request_fingerprint: buildStagedTerraRequestFingerprint(
      input.shopperRequest,
    ),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      kind: requirement.kind,
      hard: requirement.hard,
    })),
    evidence: snakeEvidence(evidenceItems),
    candidates: verifiedCandidates.map(snakeCandidate),
  };
  const parsed = validateStagedTerraEvidencePackage({
    value: rawPackage,
    shopperRequest: input.shopperRequest,
    researchOutput: input.researchOutput,
  });
  if (!parsed.ok) {
    throw new Error(`staged_terra_evidence_package_invalid:${parsed.reason}`);
  }
  return {
    verifierVersion: STAGED_TERRA_VERIFIER_VERSION,
    evidencePackage: parsed.value,
    diagnostics: {
      verifierVersion: STAGED_TERRA_VERIFIER_VERSION,
      candidateCount: verifiedCandidates.length,
      candidates: diagnostics,
      aggregate,
    },
  };
}
