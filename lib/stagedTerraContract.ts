import { createHash } from "node:crypto";

import {
  buildDirectTerraRequirementContract,
  type DirectTerraRequirementContractEntry,
} from "./directTerraCandidateSlate.ts";
import {
  directTerraAssetTargetIsCoherent,
  verifyDirectTerraAssetCandidates,
  type DirectTerraAssetDecision,
} from "./directTerraAssetVerifier.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";
import {
  canonicalizeDirectTerraCitationUrl,
  type DirectTerraSource,
} from "./directTerraResponse.ts";

export const STAGED_TERRA_CONTRACT_VERSION = "staged-terra-contract-v9";
export const STAGED_TERRA_RESEARCH_SCHEMA_VERSION =
  "staged-terra-research-v5";
export const STAGED_TERRA_EVIDENCE_PACKAGE_VERSION =
  "staged-terra-evidence-v1";
export const STAGED_TERRA_PRESENTATION_SCHEMA_VERSION =
  "staged-terra-presentation-v1";
export const STAGED_TERRA_RESEARCH_VALIDATION_REASONS = [
  "research_shape",
  "research_source_registry",
  "research_candidate_invalid",
  "research_candidate_duplicate",
] as const;
export const STAGED_TERRA_RESEARCH_CANDIDATE_VALIDATION_REASONS = [
  "candidate_identity",
  "candidate_sources",
  "candidate_requirements",
  "candidate_facts",
] as const;
export const STAGED_TERRA_RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS = [
  "candidate_source_shape",
  "candidate_source_duplicate",
  "candidate_source_unsafe",
  "candidate_source_unregistered",
  "candidate_source_identity_unproven",
] as const;

export type StagedTerraResearchValidationReason =
  (typeof STAGED_TERRA_RESEARCH_VALIDATION_REASONS)[number];
export type StagedTerraResearchCandidateValidationReason =
  (typeof STAGED_TERRA_RESEARCH_CANDIDATE_VALIDATION_REASONS)[number];
export type StagedTerraResearchCandidateSourceValidationReason =
  (typeof STAGED_TERRA_RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS)[number];

export const STAGED_TERRA_RESEARCH_IDENTITY_SOURCE_REJECTION_KEYS = [
  "brandNotInTitle",
  "modelNotInTitle",
  "modelConflictInTitle",
  "wrongProductType",
] as const;

export type StagedTerraResearchIdentitySourceFilterDiagnostic = {
  submittedCandidates: number;
  acceptedCandidates: number;
  deferredMissingTitleCandidates: number;
  rejectedCandidates: number;
  rejectionCandidateCounts: Record<
    (typeof STAGED_TERRA_RESEARCH_IDENTITY_SOURCE_REJECTION_KEYS)[number],
    number
  >;
};

const RESEARCH_FACT_KINDS = [
  "identity",
  "product_type",
  "specification",
  "performance",
  "owner_feedback",
  "availability",
  "price",
] as const;

const RESEARCH_BRAND_MAX_LENGTH = 100;
const RESEARCH_MODEL_MAX_LENGTH = 120;
const RESEARCH_PRODUCT_TYPE_MAX_LENGTH = 78;
const RESEARCH_PRODUCT_NAME_MAX_LENGTH =
  RESEARCH_BRAND_MAX_LENGTH +
  RESEARCH_MODEL_MAX_LENGTH +
  RESEARCH_PRODUCT_TYPE_MAX_LENGTH +
  2;
const EVIDENCE_KINDS = ["claim", "product_page", "image"] as const;
const SOURCE_TYPES = [
  "manufacturer",
  "retailer",
  "independent_testing",
  "owner_feedback",
  "other",
] as const;
const VERIFIED_FACT_KINDS = [
  "identity",
  "product_type",
  "requirement",
  "specification",
  "performance",
  "owner_feedback",
  "availability",
  "price",
] as const;

type ResearchFactKind = (typeof RESEARCH_FACT_KINDS)[number];
type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
type SourceType = (typeof SOURCE_TYPES)[number];
type VerifiedFactKind = (typeof VERIFIED_FACT_KINDS)[number];

export type StagedTerraResearchRequirementLead = {
  requirementId: string;
  status: "supporting_evidence" | "conflicting_evidence" | "not_found";
  summary: string;
  sourceUrls: string[];
};

export type StagedTerraResearchFactLead = {
  factId: string;
  kind: ResearchFactKind;
  statement: string;
  sourceUrls: string[];
};

export type StagedTerraResearchCandidate = {
  candidateId: string;
  productName: string;
  brand: string;
  model: string;
  productType: string;
  sourceUrls: string[];
  requirementLeads: StagedTerraResearchRequirementLead[];
  factLeads: StagedTerraResearchFactLead[];
};

export type StagedTerraResearchOutput = {
  schemaVersion: typeof STAGED_TERRA_RESEARCH_SCHEMA_VERSION;
  candidates: StagedTerraResearchCandidate[];
};

export type StagedTerraEvidence = {
  evidenceId: string;
  candidateId: string;
  kind: EvidenceKind;
  url: string;
  host: string;
  title: string;
  sourceType: SourceType;
};

export type StagedTerraVerifiedFact = {
  factId: string;
  kind: VerifiedFactKind;
  statement: string;
  verification: "verified" | "source_reported";
  evidenceIds: string[];
};

export type StagedTerraVerifiedRequirement = {
  requirementId: string;
  verdict: "pass" | "fail" | "not_verified";
  evidenceIds: string[];
};

export type StagedTerraVerifiedCandidate = {
  candidateId: string;
  productName: string;
  brand: string;
  model: string;
  productType: string;
  eligibility: "eligible" | "close_match" | "excluded";
  exclusionReason: string | null;
  requirementVerdicts: StagedTerraVerifiedRequirement[];
  facts: StagedTerraVerifiedFact[];
  assets: {
    productUrl: string | null;
    productUrlEvidenceId: string | null;
    imageUrl: string | null;
    imageUrlEvidenceId: string | null;
  };
};

export type StagedTerraEvidencePackage = {
  schemaVersion: typeof STAGED_TERRA_EVIDENCE_PACKAGE_VERSION;
  requestFingerprint: string;
  requirements: DirectTerraRequirementContractEntry[];
  evidence: StagedTerraEvidence[];
  candidates: StagedTerraVerifiedCandidate[];
};

export type StagedTerraSupportedPoint = {
  text: string;
  factIds: string[];
};

export type StagedTerraPresentationProduct = {
  rank: number;
  candidateId: string;
  productName: string;
  whyRanked: StagedTerraSupportedPoint;
  bestFor: StagedTerraSupportedPoint;
  mainTradeoff: StagedTerraSupportedPoint;
  requirementExplanations: Array<{
    requirementId: string;
    verdict: "pass";
    text: string;
    evidenceIds: string[];
  }>;
  pros: StagedTerraSupportedPoint[];
  cons: StagedTerraSupportedPoint[];
};

export type StagedTerraPresentationOutput = {
  schemaVersion: typeof STAGED_TERRA_PRESENTATION_SCHEMA_VERSION;
  rankedProducts: StagedTerraPresentationProduct[];
  closeMatchCandidateIds: string[];
  finalAdvice: Array<{
    text: string;
    candidateIds: string[];
    factIds: string[];
  }>;
};

type ValidationFailure<Reason extends string = string> = {
  ok: false;
  reason: Reason;
};
type ValidationSuccess<T> = { ok: true; value: T };

type ResearchCandidateParseResult =
  | (ValidationFailure<StagedTerraResearchCandidateValidationReason> & {
      candidateSourceValidationReason?: StagedTerraResearchCandidateSourceValidationReason;
    })
  | ValidationSuccess<StagedTerraResearchCandidate>;

type StagedTerraResearchValidationFailure =
  | ValidationFailure<Exclude<
      StagedTerraResearchValidationReason,
      "research_candidate_invalid"
    >>
  | (ValidationFailure<"research_candidate_invalid"> & {
      candidateValidationReason: StagedTerraResearchCandidateValidationReason;
      candidateSourceValidationReason?: StagedTerraResearchCandidateSourceValidationReason;
    });

export function isStagedTerraResearchValidationReason(
  value: unknown,
): value is StagedTerraResearchValidationReason {
  return STAGED_TERRA_RESEARCH_VALIDATION_REASONS.includes(
    value as StagedTerraResearchValidationReason,
  );
}

export function isStagedTerraResearchCandidateValidationReason(
  value: unknown,
): value is StagedTerraResearchCandidateValidationReason {
  return STAGED_TERRA_RESEARCH_CANDIDATE_VALIDATION_REASONS.includes(
    value as StagedTerraResearchCandidateValidationReason,
  );
}

export function isStagedTerraResearchCandidateSourceValidationReason(
  value: unknown,
): value is StagedTerraResearchCandidateSourceValidationReason {
  return STAGED_TERRA_RESEARCH_CANDIDATE_SOURCE_VALIDATION_REASONS.includes(
    value as StagedTerraResearchCandidateSourceValidationReason,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

function boundedString(value: unknown, maximum: number) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum
  );
}

function normalizeResearchIdentityField(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function exactHttpsUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 4_096) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const unbracketedHost = host.replace(/^\[|\]$/g, "");
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443") ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) ||
      unbracketedHost.includes(":")
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function parseStringArray(
  value: unknown,
  {
    maximum,
    minimum = 0,
    itemMaximum = 200,
  }: { maximum: number; minimum?: number; itemMaximum?: number },
) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum ||
    value.some((item) => !boundedString(item, itemMaximum))
  ) {
    return null;
  }
  const items = value as string[];
  return new Set(items).size === items.length ? items : null;
}

function parseCandidateSourceUrls(
  value: unknown,
  registered: Set<string>,
):
  | ValidationFailure<StagedTerraResearchCandidateSourceValidationReason>
  | ValidationSuccess<string[]> {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((item) => !boundedString(item, 4_096))
  ) {
    return { ok: false, reason: "candidate_source_shape" };
  }
  const items = value as string[];
  if (new Set(items).size !== items.length) {
    return { ok: false, reason: "candidate_source_duplicate" };
  }
  const urls = items.map(exactHttpsUrl);
  if (urls.some((url) => url === null)) {
    return { ok: false, reason: "candidate_source_unsafe" };
  }
  const canonicalUrls = urls.map((url) => {
    const canonical = canonicalizeDirectTerraCitationUrl(url!);
    if (!canonical) return null;
    const fetchUrl = new URL(canonical);
    fetchUrl.hash = "";
    return fetchUrl.toString();
  });
  if (
    canonicalUrls.some((url) => url === null) ||
    new Set(canonicalUrls).size !== canonicalUrls.length
  ) {
    return { ok: false, reason: "candidate_source_duplicate" };
  }
  if (urls.some((url) => !registered.has(url!))) {
    return { ok: false, reason: "candidate_source_unregistered" };
  }
  return { ok: true, value: urls as string[] };
}

function parseCandidateSourceIndexes(
  value: unknown,
  sourceUrls: readonly string[],
  { minimum = 0, maximum = 6 }: { minimum?: number; maximum?: number } = {},
) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum ||
    value.some(
      (item) =>
        !Number.isInteger(item) ||
        (item as number) < 0 ||
        (item as number) >= sourceUrls.length,
    )
  ) {
    return null;
  }
  const indexes = value as number[];
  if (new Set(indexes).size !== indexes.length) return null;
  return indexes.map((index) => sourceUrls[index]);
}

function identityKey(brand: string, model: string) {
  return `${brand} ${model}`
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function enumContains<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function publicContractEntry(entry: DirectTerraRequirementContractEntry) {
  return { id: entry.id, kind: entry.kind, hard: entry.hard };
}

export function buildStagedTerraRequestFingerprint(
  request: DirectTerraShopperRequest,
) {
  const requirements =
    buildDirectTerraRequirementContract(request).map(publicContractEntry);
  return createHash("sha256")
    .update(STAGED_TERRA_CONTRACT_VERSION)
    .update("\0")
    .update(
      JSON.stringify({
        query: request.query,
        budget: request.budget ?? null,
        priorities: request.priorities ?? null,
        avoid: request.avoid ?? null,
        selectedFeatures: request.selectedFeatures ?? [],
        requirements,
      }),
    )
    .digest("hex");
}

export function stagedTerraResearchJsonSchema(
  requirements: DirectTerraRequirementContractEntry[],
) {
  const requirementIds = requirements.map((entry) => entry.id);
  const requirementLeadVariant = (
    status:
      | "supporting_evidence"
      | "conflicting_evidence"
      | "not_found",
    minItems: 0 | 1,
    maxItems: 0 | 2,
  ) =>
    ({
      type: "object",
      additionalProperties: false,
      properties: {
        requirement_id: { type: "string", enum: requirementIds },
        status: { type: "string", const: status },
        summary: {
          type: "string",
          minLength: 1,
          maxLength: 400,
          pattern: "\\S",
        },
        source_indexes: {
          type: "array",
          minItems,
          maxItems,
          items: {
            type: "integer",
            minimum: 0,
            maximum: 1,
          },
        },
      },
      required: [
        "requirement_id",
        "status",
        "summary",
        "source_indexes",
      ],
    }) as const;
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      schema_version: {
        type: "string",
        const: STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
      },
      candidates: {
        type: "array",
        minItems: 8,
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            brand: {
              type: "string",
              minLength: 1,
              maxLength: RESEARCH_BRAND_MAX_LENGTH,
              pattern: "\\S",
            },
            model: {
              type: "string",
              minLength: 1,
              maxLength: RESEARCH_MODEL_MAX_LENGTH,
              pattern: "\\S",
            },
            product_type: {
              type: "string",
              minLength: 1,
              maxLength: RESEARCH_PRODUCT_TYPE_MAX_LENGTH,
              pattern: "\\S",
            },
            source_urls: {
              type: "array",
              minItems: 2,
              maxItems: 2,
              items: { type: "string", minLength: 1, maxLength: 4_096 },
            },
            requirement_leads: {
              type: "array",
              minItems: requirementIds.length,
              maxItems: requirementIds.length,
              items: {
                anyOf: [
                  requirementLeadVariant("supporting_evidence", 1, 2),
                  requirementLeadVariant("conflicting_evidence", 1, 2),
                  requirementLeadVariant("not_found", 0, 0),
                ],
              },
            },
            fact_leads: {
              type: "array",
              minItems: 1,
              maxItems: 24,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  kind: { type: "string", enum: RESEARCH_FACT_KINDS },
                  statement: {
                    type: "string",
                    minLength: 1,
                    maxLength: 500,
                    pattern: "\\S",
                  },
                  source_indexes: {
                    type: "array",
                    minItems: 1,
                    maxItems: 2,
                    items: {
                      type: "integer",
                      minimum: 0,
                      maximum: 1,
                    },
                  },
                },
                required: ["kind", "statement", "source_indexes"],
              },
            },
          },
          required: [
            "brand",
            "model",
            "product_type",
            "source_urls",
            "requirement_leads",
            "fact_leads",
          ],
        },
      },
    },
    required: ["schema_version", "candidates"],
  } as const;
}

function parseResearchCandidate(
  value: unknown,
  index: number,
  requirements: DirectTerraRequirementContractEntry[],
  registered: Set<string>,
): ResearchCandidateParseResult {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "brand",
      "model",
      "product_type",
      "source_urls",
      "requirement_leads",
      "fact_leads",
    ]) ||
    !boundedString(value.brand, RESEARCH_BRAND_MAX_LENGTH) ||
    !boundedString(value.model, RESEARCH_MODEL_MAX_LENGTH) ||
    !boundedString(value.product_type, RESEARCH_PRODUCT_TYPE_MAX_LENGTH)
  ) {
    return { ok: false, reason: "candidate_identity" };
  }
  const candidateId = `candidate_${index + 1}`;
  const brand = normalizeResearchIdentityField(value.brand as string);
  const model = normalizeResearchIdentityField(value.model as string);
  const productType = normalizeResearchIdentityField(
    value.product_type as string,
  );
  const productName = `${brand} ${model} ${productType}`;
  if (
    !boundedString(productName, RESEARCH_PRODUCT_NAME_MAX_LENGTH) ||
    !directTerraAssetTargetIsCoherent({
      key: candidateId,
      rank: index + 1,
      productName,
      brand,
      model,
      category: productType,
    })
  ) {
    return { ok: false, reason: "candidate_identity" };
  }
  const parsedSourceUrls = parseCandidateSourceUrls(
    value.source_urls,
    registered,
  );
  if (!parsedSourceUrls.ok) {
    return {
      ok: false,
      reason: "candidate_sources",
      candidateSourceValidationReason: parsedSourceUrls.reason,
    };
  }
  const sourceUrls = parsedSourceUrls.value;

  if (
    !Array.isArray(value.requirement_leads) ||
    value.requirement_leads.length !== requirements.length
  ) {
    return { ok: false, reason: "candidate_requirements" };
  }
  const expectedRequirementIds = new Set(
    requirements.map((requirement) => requirement.id),
  );
  const rawRequirementLeads = new Map<string, Record<string, unknown>>();
  for (const lead of value.requirement_leads) {
    if (
      !isRecord(lead) ||
      !exactKeys(lead, [
        "requirement_id",
        "status",
        "summary",
        "source_indexes",
      ]) ||
      typeof lead.requirement_id !== "string" ||
      !expectedRequirementIds.has(lead.requirement_id) ||
      rawRequirementLeads.has(lead.requirement_id)
    ) {
      return { ok: false, reason: "candidate_requirements" };
    }
    rawRequirementLeads.set(lead.requirement_id, lead);
  }

  const requirementLeads: StagedTerraResearchRequirementLead[] = [];
  for (const expected of requirements) {
    const lead = rawRequirementLeads.get(expected.id);
    if (
      !lead ||
      !["supporting_evidence", "conflicting_evidence", "not_found"].includes(
        String(lead.status),
      ) ||
      !boundedString(lead.summary, 400)
    ) {
      return { ok: false, reason: "candidate_requirements" };
    }
    const urls = parseCandidateSourceIndexes(lead.source_indexes, sourceUrls, {
      minimum: lead.status === "not_found" ? 0 : 1,
      maximum: 2,
    });
    if (!urls || (lead.status === "not_found" && urls.length !== 0)) {
      return { ok: false, reason: "candidate_requirements" };
    }
    requirementLeads.push({
      requirementId: expected.id,
      status: lead.status as StagedTerraResearchRequirementLead["status"],
      summary: lead.summary as string,
      sourceUrls: urls,
    });
  }

  if (
    !Array.isArray(value.fact_leads) ||
    value.fact_leads.length < 1 ||
    value.fact_leads.length > 24
  ) {
    return { ok: false, reason: "candidate_facts" };
  }
  const factLeads: StagedTerraResearchFactLead[] = [];
  for (let factIndex = 0; factIndex < value.fact_leads.length; factIndex++) {
    const fact = value.fact_leads[factIndex];
    if (
      !isRecord(fact) ||
      !exactKeys(fact, ["kind", "statement", "source_indexes"]) ||
      !enumContains(RESEARCH_FACT_KINDS, fact.kind) ||
      !boundedString(fact.statement, 500)
    ) {
      return { ok: false, reason: "candidate_facts" };
    }
    const urls = parseCandidateSourceIndexes(fact.source_indexes, sourceUrls, {
      minimum: 1,
      maximum: 2,
    });
    if (!urls) return { ok: false, reason: "candidate_facts" };
    factLeads.push({
      factId: `${candidateId}_fact_${factIndex + 1}`,
      kind: fact.kind,
      statement: fact.statement as string,
      sourceUrls: urls,
    });
  }

  return {
    ok: true,
    value: {
      candidateId,
      productName,
      brand,
      model,
      productType,
      sourceUrls,
      requirementLeads,
      factLeads,
    },
  };
}

export function validateStagedTerraResearchOutput({
  value,
  shopperRequest,
  responseSourceUrls,
}: {
  value: unknown;
  shopperRequest: DirectTerraShopperRequest;
  responseSourceUrls: readonly string[];
}):
  | StagedTerraResearchValidationFailure
  | ValidationSuccess<StagedTerraResearchOutput> {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["schema_version", "candidates"]) ||
    value.schema_version !== STAGED_TERRA_RESEARCH_SCHEMA_VERSION ||
    !Array.isArray(value.candidates) ||
    value.candidates.length < 8 ||
    value.candidates.length > 15
  ) {
    return { ok: false, reason: "research_shape" };
  }
  const registeredUrls = responseSourceUrls
    .map(exactHttpsUrl)
    .filter((url): url is string => url !== null);
  const registered = new Set(registeredUrls);
  if (registered.size !== responseSourceUrls.length) {
    return { ok: false, reason: "research_source_registry" };
  }
  const requirements = buildDirectTerraRequirementContract(shopperRequest);
  const candidateResults = value.candidates.map((candidate, index) =>
    parseResearchCandidate(candidate, index, requirements, registered),
  );
  const invalidCandidate = candidateResults.find((candidate) => !candidate.ok);
  if (invalidCandidate && !invalidCandidate.ok) {
    return {
      ok: false,
      reason: "research_candidate_invalid",
      candidateValidationReason: invalidCandidate.reason,
      ...("candidateSourceValidationReason" in invalidCandidate
        ? {
            candidateSourceValidationReason:
              invalidCandidate.candidateSourceValidationReason,
          }
        : {}),
    };
  }
  const parsed = candidateResults
    .filter(
      (
        candidate,
      ): candidate is ValidationSuccess<StagedTerraResearchCandidate> =>
        candidate.ok,
    )
    .map((candidate) => candidate.value);
  const identities = parsed.map((candidate) =>
    identityKey(candidate.brand, candidate.model),
  );
  if (
    identities.some((identity) => identity.length === 0) ||
    new Set(identities).size !== identities.length
  ) {
    return { ok: false, reason: "research_candidate_duplicate" };
  }
  return {
    ok: true,
    value: {
      schemaVersion: STAGED_TERRA_RESEARCH_SCHEMA_VERSION,
      candidates: parsed,
    },
  };
}

export function validateStagedTerraResearchIdentitySources({
  researchOutput,
  responseSources,
}: {
  researchOutput: StagedTerraResearchOutput;
  responseSources: readonly DirectTerraSource[];
}):
  | (ValidationSuccess<StagedTerraResearchOutput> & {
      identitySourceFilter: StagedTerraResearchIdentitySourceFilterDiagnostic;
    })
  | (ValidationFailure<"candidate_source_identity_unproven"> & {
      identitySourceFilter: StagedTerraResearchIdentitySourceFilterDiagnostic;
    }) {
  const sources = new Map(responseSources.map((source) => [source.url, source]));
  const identitySourceFilter: StagedTerraResearchIdentitySourceFilterDiagnostic = {
    submittedCandidates: researchOutput.candidates.length,
    acceptedCandidates: 0,
    deferredMissingTitleCandidates: 0,
    rejectedCandidates: 0,
    rejectionCandidateCounts: {
      brandNotInTitle: 0,
      modelNotInTitle: 0,
      modelConflictInTitle: 0,
      wrongProductType: 0,
    },
  };
  const accepted: StagedTerraResearchCandidate[] = [];
  for (const [index, candidate] of researchOutput.candidates.entries()) {
    const verification = verifyDirectTerraAssetCandidates({
      target: {
        key: candidate.candidateId,
        rank: index + 1,
        productName: candidate.productName,
        brand: candidate.brand,
        model: candidate.model,
        category: candidate.productType,
      },
      candidates: candidate.sourceUrls.map((url) => ({
        title: sources.get(url)?.title,
        productUrl: url,
      })),
    });
    if (verification.decisions.some((decision) => decision.identityAccepted)) {
      accepted.push(candidate);
      continue;
    }
    if (
      verification.decisions.some(
        (decision) => decision.identityReason === "missing_title",
      )
    ) {
      accepted.push(candidate);
      identitySourceFilter.deferredMissingTitleCandidates += 1;
      continue;
    }
    identitySourceFilter.rejectedCandidates += 1;
    for (const reason of new Set(
      verification.decisions.map((decision) => decision.identityReason),
    )) {
      const key = identitySourceRejectionKey(reason);
      if (key) identitySourceFilter.rejectionCandidateCounts[key] += 1;
    }
  }
  identitySourceFilter.acceptedCandidates = accepted.length;
  if (accepted.length === 0) {
    return {
      ok: false,
      reason: "candidate_source_identity_unproven",
      identitySourceFilter,
    };
  }
  return {
    ok: true,
    value: {
      schemaVersion: researchOutput.schemaVersion,
      candidates: accepted.map(reindexResearchCandidate),
    },
    identitySourceFilter,
  };
}

function identitySourceRejectionKey(
  reason: DirectTerraAssetDecision["identityReason"],
): keyof StagedTerraResearchIdentitySourceFilterDiagnostic["rejectionCandidateCounts"] | null {
  if (reason === "missing_title") return null;
  if (reason === "brand_not_in_title") return "brandNotInTitle";
  if (reason === "model_not_in_title") return "modelNotInTitle";
  if (reason === "model_conflict_in_title") return "modelConflictInTitle";
  if (reason === "wrong_product_type") return "wrongProductType";
  if (
    reason === "invalid_target_identity" ||
    reason === "weak_target_identity"
  ) {
    throw new Error("staged_terra_identity_source_filter_inconsistent");
  }
  return null;
}

function reindexResearchCandidate(
  candidate: StagedTerraResearchCandidate,
  index: number,
): StagedTerraResearchCandidate {
  const candidateId = `candidate_${index + 1}`;
  return {
    ...candidate,
    candidateId,
    factLeads: candidate.factLeads.map((fact, factIndex) => ({
      ...fact,
      factId: `${candidateId}_fact_${factIndex + 1}`,
    })),
  };
}

function parseEvidence(
  value: unknown,
  research: Map<string, StagedTerraResearchCandidate>,
): StagedTerraEvidence | null {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "evidence_id",
      "candidate_id",
      "kind",
      "url",
      "host",
      "title",
      "source_type",
    ]) ||
    !boundedString(value.evidence_id, 80) ||
    !/^e[1-9][0-9]{0,3}$/.test(value.evidence_id as string) ||
    !boundedString(value.candidate_id, 80) ||
    !research.has(value.candidate_id as string) ||
    !enumContains(EVIDENCE_KINDS, value.kind) ||
    !boundedString(value.host, 253) ||
    !boundedString(value.title, 500) ||
    !enumContains(SOURCE_TYPES, value.source_type)
  ) {
    return null;
  }
  const url = exactHttpsUrl(value.url);
  if (!url) return null;
  try {
    if (
      new URL(url).hostname.toLowerCase().replace(/^www\./, "") !==
      (value.host as string).toLowerCase().replace(/^www\./, "")
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return {
    evidenceId: value.evidence_id as string,
    candidateId: value.candidate_id as string,
    kind: value.kind,
    url,
    host: value.host as string,
    title: value.title as string,
    sourceType: value.source_type,
  };
}

function evidenceIdList(
  value: unknown,
  evidence: Map<string, StagedTerraEvidence>,
  candidateId: string,
  { minimum = 0, maximum = 12 }: { minimum?: number; maximum?: number } = {},
) {
  const ids = parseStringArray(value, {
    minimum,
    maximum,
    itemMaximum: 80,
  });
  return ids &&
    ids.every((id) => evidence.get(id)?.candidateId === candidateId)
    ? ids
    : null;
}

function parseVerifiedCandidate(
  value: unknown,
  requirements: DirectTerraRequirementContractEntry[],
  evidence: Map<string, StagedTerraEvidence>,
  research: Map<string, StagedTerraResearchCandidate>,
): StagedTerraVerifiedCandidate | null {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "candidate_id",
      "product_name",
      "brand",
      "model",
      "product_type",
      "eligibility",
      "exclusion_reason",
      "requirement_verdicts",
      "facts",
      "assets",
    ]) ||
    !boundedString(value.candidate_id, 80) ||
    !boundedString(value.product_name, 300) ||
    !boundedString(value.brand, 120) ||
    !boundedString(value.model, 200) ||
    !boundedString(value.product_type, 160) ||
    !["eligible", "close_match", "excluded"].includes(String(value.eligibility))
  ) {
    return null;
  }
  const researchCandidate = research.get(value.candidate_id as string);
  if (
    !researchCandidate ||
    researchCandidate.productName !== value.product_name ||
    researchCandidate.brand !== value.brand ||
    researchCandidate.model !== value.model ||
    researchCandidate.productType !== value.product_type
  ) {
    return null;
  }
  const eligibility = value.eligibility as StagedTerraVerifiedCandidate["eligibility"];
  if (
    (eligibility === "eligible" && value.exclusion_reason !== null) ||
    (eligibility !== "eligible" && !boundedString(value.exclusion_reason, 400))
  ) {
    return null;
  }
  if (
    !Array.isArray(value.requirement_verdicts) ||
    value.requirement_verdicts.length !== requirements.length
  ) {
    return null;
  }
  const requirementVerdicts: StagedTerraVerifiedRequirement[] = [];
  for (let index = 0; index < requirements.length; index++) {
    const verdict = value.requirement_verdicts[index];
    const requirement = requirements[index];
    if (
      !isRecord(verdict) ||
      !exactKeys(verdict, [
        "requirement_id",
        "verdict",
        "evidence_ids",
      ]) ||
      verdict.requirement_id !== requirement.id ||
      !["pass", "fail", "not_verified"].includes(String(verdict.verdict))
    ) {
      return null;
    }
    const evidenceIds = evidenceIdList(
      verdict.evidence_ids,
      evidence,
      researchCandidate.candidateId,
      {
      minimum: verdict.verdict === "not_verified" ? 0 : 1,
      },
    );
    if (
      !evidenceIds ||
      (verdict.verdict === "not_verified" && evidenceIds.length !== 0)
    ) {
      return null;
    }
    requirementVerdicts.push({
      requirementId: requirement.id,
      verdict: verdict.verdict as StagedTerraVerifiedRequirement["verdict"],
      evidenceIds,
    });
  }
  if (
    eligibility === "eligible" &&
    requirementVerdicts.some(
      (verdict, index) =>
        requirements[index].hard && verdict.verdict !== "pass",
    )
  ) {
    return null;
  }

  if (!Array.isArray(value.facts) || value.facts.length > 40) return null;
  const facts: StagedTerraVerifiedFact[] = [];
  const factIds = new Set<string>();
  for (const fact of value.facts) {
    if (
      !isRecord(fact) ||
      !exactKeys(fact, [
        "fact_id",
        "kind",
        "statement",
        "verification",
        "evidence_ids",
      ]) ||
      !boundedString(fact.fact_id, 100) ||
      factIds.has(fact.fact_id as string) ||
      !enumContains(VERIFIED_FACT_KINDS, fact.kind) ||
      !boundedString(fact.statement, 500) ||
      !["verified", "source_reported"].includes(String(fact.verification))
    ) {
      return null;
    }
    if (
      fact.verification === "verified" &&
      (fact.kind === "performance" || fact.kind === "owner_feedback")
    ) {
      return null;
    }
    const evidenceIds = evidenceIdList(
      fact.evidence_ids,
      evidence,
      researchCandidate.candidateId,
      { minimum: 1 },
    );
    if (!evidenceIds) return null;
    factIds.add(fact.fact_id as string);
    facts.push({
      factId: fact.fact_id as string,
      kind: fact.kind,
      statement: fact.statement as string,
      verification: fact.verification as StagedTerraVerifiedFact["verification"],
      evidenceIds,
    });
  }

  if (
    !isRecord(value.assets) ||
    !exactKeys(value.assets, [
      "product_url",
      "product_url_evidence_id",
      "image_url",
      "image_url_evidence_id",
    ])
  ) {
    return null;
  }
  const productUrl =
    value.assets.product_url === null
      ? null
      : exactHttpsUrl(value.assets.product_url);
  const imageUrl =
    value.assets.image_url === null
      ? null
      : exactHttpsUrl(value.assets.image_url);
  const productEvidenceId =
    value.assets.product_url_evidence_id === null
      ? null
      : boundedString(value.assets.product_url_evidence_id, 80)
        ? (value.assets.product_url_evidence_id as string)
        : null;
  const imageEvidenceId =
    value.assets.image_url_evidence_id === null
      ? null
      : boundedString(value.assets.image_url_evidence_id, 80)
        ? (value.assets.image_url_evidence_id as string)
        : null;
  if (
    (productUrl === null) !== (productEvidenceId === null) ||
    (imageUrl === null) !== (imageEvidenceId === null)
  ) {
    return null;
  }
  if (productUrl && productEvidenceId) {
    const item = evidence.get(productEvidenceId);
    if (
      !item ||
      item.candidateId !== researchCandidate.candidateId ||
      item.kind !== "product_page" ||
      item.url !== productUrl
    ) {
      return null;
    }
  }
  if (imageUrl && imageEvidenceId) {
    const item = evidence.get(imageEvidenceId);
    if (
      !item ||
      item.candidateId !== researchCandidate.candidateId ||
      item.kind !== "image" ||
      item.url !== imageUrl
    ) {
      return null;
    }
  }

  return {
    candidateId: value.candidate_id as string,
    productName: value.product_name as string,
    brand: value.brand as string,
    model: value.model as string,
    productType: value.product_type as string,
    eligibility,
    exclusionReason: value.exclusion_reason as string | null,
    requirementVerdicts,
    facts,
    assets: {
      productUrl,
      productUrlEvidenceId: productEvidenceId,
      imageUrl,
      imageUrlEvidenceId: imageEvidenceId,
    },
  };
}

export function validateStagedTerraEvidencePackage({
  value,
  shopperRequest,
  researchOutput,
}: {
  value: unknown;
  shopperRequest: DirectTerraShopperRequest;
  researchOutput: StagedTerraResearchOutput;
}): ValidationFailure | ValidationSuccess<StagedTerraEvidencePackage> {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "schema_version",
      "request_fingerprint",
      "requirements",
      "evidence",
      "candidates",
    ]) ||
    value.schema_version !== STAGED_TERRA_EVIDENCE_PACKAGE_VERSION ||
    value.request_fingerprint !==
      buildStagedTerraRequestFingerprint(shopperRequest) ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.evidence) ||
    !Array.isArray(value.candidates) ||
    value.candidates.length !== researchOutput.candidates.length
  ) {
    return { ok: false, reason: "evidence_package_shape" };
  }
  const requirements = buildDirectTerraRequirementContract(shopperRequest);
  if (
    JSON.stringify(value.requirements) !==
    JSON.stringify(requirements.map(publicContractEntry))
  ) {
    return { ok: false, reason: "evidence_requirement_contract" };
  }
  const research = new Map(
    researchOutput.candidates.map((candidate) => [
      candidate.candidateId,
      candidate,
    ]),
  );
  const parsedEvidence = value.evidence.map((item) =>
    parseEvidence(item, research),
  );
  if (parsedEvidence.some((item) => item === null)) {
    return { ok: false, reason: "evidence_entry_invalid" };
  }
  const evidenceItems = parsedEvidence as StagedTerraEvidence[];
  if (
    new Set(evidenceItems.map((item) => item.evidenceId)).size !==
    evidenceItems.length
  ) {
    return { ok: false, reason: "evidence_id_duplicate" };
  }
  const evidence = new Map(
    evidenceItems.map((item) => [item.evidenceId, item]),
  );
  const candidates = value.candidates.map((candidate) =>
    parseVerifiedCandidate(candidate, requirements, evidence, research),
  );
  if (candidates.some((candidate) => candidate === null)) {
    return { ok: false, reason: "verified_candidate_invalid" };
  }
  const parsedCandidates = candidates as StagedTerraVerifiedCandidate[];
  if (
    parsedCandidates.some(
      (candidate, index) =>
        candidate.candidateId !==
        researchOutput.candidates[index]?.candidateId,
    )
  ) {
    return { ok: false, reason: "verified_candidate_order" };
  }
  const allFactIds = parsedCandidates.flatMap((candidate) =>
    candidate.facts.map((fact) => fact.factId),
  );
  if (new Set(allFactIds).size !== allFactIds.length) {
    return { ok: false, reason: "verified_fact_id_duplicate" };
  }
  return {
    ok: true,
    value: {
      schemaVersion: STAGED_TERRA_EVIDENCE_PACKAGE_VERSION,
      requestFingerprint: value.request_fingerprint as string,
      requirements,
      evidence: evidenceItems,
      candidates: parsedCandidates,
    },
  };
}

function supportedPointSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string", minLength: 1, maxLength: 600 },
      fact_ids: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: { type: "string", minLength: 1, maxLength: 100 },
      },
    },
    required: ["text", "fact_ids"],
  } as const;
}

export function stagedTerraPresentationJsonSchema(
  requirements: DirectTerraRequirementContractEntry[],
) {
  const requirementIds = requirements.map((entry) => entry.id);
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      schema_version: {
        type: "string",
        const: STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
      },
      ranked_products: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            rank: { type: "integer", minimum: 1, maximum: 5 },
            candidate_id: { type: "string", minLength: 1, maxLength: 80 },
            product_name: { type: "string", minLength: 1, maxLength: 300 },
            why_ranked: supportedPointSchema(),
            best_for: supportedPointSchema(),
            main_tradeoff: supportedPointSchema(),
            requirement_explanations: {
              type: "array",
              minItems: requirementIds.length,
              maxItems: requirementIds.length,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  requirement_id: { type: "string", enum: requirementIds },
                  verdict: { type: "string", const: "pass" },
                  text: { type: "string", minLength: 1, maxLength: 400 },
                  evidence_ids: {
                    type: "array",
                    minItems: 1,
                    maxItems: 8,
                    items: { type: "string", minLength: 1, maxLength: 80 },
                  },
                },
                required: [
                  "requirement_id",
                  "verdict",
                  "text",
                  "evidence_ids",
                ],
              },
            },
            pros: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: supportedPointSchema(),
            },
            cons: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: supportedPointSchema(),
            },
          },
          required: [
            "rank",
            "candidate_id",
            "product_name",
            "why_ranked",
            "best_for",
            "main_tradeoff",
            "requirement_explanations",
            "pros",
            "cons",
          ],
        },
      },
      close_match_candidate_ids: {
        type: "array",
        maxItems: 5,
        items: { type: "string", minLength: 1, maxLength: 80 },
      },
      final_advice: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string", minLength: 1, maxLength: 600 },
            candidate_ids: {
              type: "array",
              minItems: 1,
              maxItems: 5,
              items: { type: "string", minLength: 1, maxLength: 80 },
            },
            fact_ids: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: { type: "string", minLength: 1, maxLength: 100 },
            },
          },
          required: ["text", "candidate_ids", "fact_ids"],
        },
      },
    },
    required: [
      "schema_version",
      "ranked_products",
      "close_match_candidate_ids",
      "final_advice",
    ],
  } as const;
}

function point(
  value: unknown,
  factIds: Set<string>,
): StagedTerraSupportedPoint | null {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["text", "fact_ids"]) ||
    !boundedString(value.text, 600) ||
    /https?:\/\//i.test(value.text as string)
  ) {
    return null;
  }
  const ids = parseStringArray(value.fact_ids, {
    minimum: 1,
    maximum: 8,
    itemMaximum: 100,
  });
  return ids && ids.every((id) => factIds.has(id))
    ? { text: value.text as string, factIds: ids }
    : null;
}

export function validateStagedTerraPresentationOutput({
  value,
  evidencePackage,
}: {
  value: unknown;
  evidencePackage: StagedTerraEvidencePackage;
}): ValidationFailure | ValidationSuccess<StagedTerraPresentationOutput> {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "schema_version",
      "ranked_products",
      "close_match_candidate_ids",
      "final_advice",
    ]) ||
    value.schema_version !== STAGED_TERRA_PRESENTATION_SCHEMA_VERSION ||
    /https?:\/\//i.test(JSON.stringify(value)) ||
    !Array.isArray(value.ranked_products) ||
    value.ranked_products.length < 1 ||
    value.ranked_products.length > 5
  ) {
    return { ok: false, reason: "presentation_shape" };
  }
  const eligible = new Map(
    evidencePackage.candidates
      .filter((candidate) => candidate.eligibility === "eligible")
      .map((candidate) => [candidate.candidateId, candidate]),
  );
  const rankedProducts: StagedTerraPresentationProduct[] = [];
  const rankedIds = new Set<string>();
  for (let index = 0; index < value.ranked_products.length; index++) {
    const item = value.ranked_products[index];
    if (
      !isRecord(item) ||
      !exactKeys(item, [
        "rank",
        "candidate_id",
        "product_name",
        "why_ranked",
        "best_for",
        "main_tradeoff",
        "requirement_explanations",
        "pros",
        "cons",
      ]) ||
      item.rank !== index + 1 ||
      !boundedString(item.candidate_id, 80) ||
      rankedIds.has(item.candidate_id as string)
    ) {
      return { ok: false, reason: "presentation_rank_invalid" };
    }
    const candidate = eligible.get(item.candidate_id as string);
    if (!candidate || item.product_name !== candidate.productName) {
      return { ok: false, reason: "presentation_candidate_invalid" };
    }
    const candidateFactIds = new Set(candidate.facts.map((fact) => fact.factId));
    const whyRanked = point(item.why_ranked, candidateFactIds);
    const bestFor = point(item.best_for, candidateFactIds);
    const mainTradeoff = point(item.main_tradeoff, candidateFactIds);
    if (!whyRanked || !bestFor || !mainTradeoff) {
      return { ok: false, reason: "presentation_support_invalid" };
    }
    if (
      !Array.isArray(item.requirement_explanations) ||
      item.requirement_explanations.length !==
        evidencePackage.requirements.length
    ) {
      return { ok: false, reason: "presentation_requirement_invalid" };
    }
    const requirementExplanations: StagedTerraPresentationProduct["requirementExplanations"] =
      [];
    for (
      let requirementIndex = 0;
      requirementIndex < evidencePackage.requirements.length;
      requirementIndex++
    ) {
      const explanation = item.requirement_explanations[requirementIndex];
      const requirement = evidencePackage.requirements[requirementIndex];
      const verified = candidate.requirementVerdicts[requirementIndex];
      if (
        !isRecord(explanation) ||
        !exactKeys(explanation, [
          "requirement_id",
          "verdict",
          "text",
          "evidence_ids",
        ]) ||
        explanation.requirement_id !== requirement.id ||
        explanation.verdict !== "pass" ||
        verified.requirementId !== requirement.id ||
        verified.verdict !== "pass" ||
        !boundedString(explanation.text, 400) ||
        /https?:\/\//i.test(explanation.text as string)
      ) {
        return { ok: false, reason: "presentation_requirement_invalid" };
      }
      const evidenceIds = parseStringArray(explanation.evidence_ids, {
        minimum: 1,
        maximum: 8,
        itemMaximum: 80,
      });
      if (
        !evidenceIds ||
        evidenceIds.some((id) => !verified.evidenceIds.includes(id))
      ) {
        return { ok: false, reason: "presentation_requirement_invalid" };
      }
      requirementExplanations.push({
        requirementId: requirement.id,
        verdict: "pass",
        text: explanation.text as string,
        evidenceIds,
      });
    }
    const parsePoints = (points: unknown) =>
      Array.isArray(points) && points.length >= 1 && points.length <= 5
        ? points.map((entry) => point(entry, candidateFactIds))
        : [];
    const pros = parsePoints(item.pros);
    const cons = parsePoints(item.cons);
    if (
      pros.length === 0 ||
      cons.length === 0 ||
      pros.some((entry) => entry === null) ||
      cons.some((entry) => entry === null)
    ) {
      return { ok: false, reason: "presentation_support_invalid" };
    }
    rankedIds.add(candidate.candidateId);
    rankedProducts.push({
      rank: index + 1,
      candidateId: candidate.candidateId,
      productName: candidate.productName,
      whyRanked,
      bestFor,
      mainTradeoff,
      requirementExplanations,
      pros: pros as StagedTerraSupportedPoint[],
      cons: cons as StagedTerraSupportedPoint[],
    });
  }

  const closeMatchIds = parseStringArray(value.close_match_candidate_ids, {
    maximum: 5,
    itemMaximum: 80,
  });
  const allowedCloseMatches = new Set(
    evidencePackage.candidates
      .filter((candidate) => candidate.eligibility === "close_match")
      .map((candidate) => candidate.candidateId),
  );
  if (
    !closeMatchIds ||
    closeMatchIds.some(
      (id) => !allowedCloseMatches.has(id) || rankedIds.has(id),
    )
  ) {
    return { ok: false, reason: "presentation_close_match_invalid" };
  }

  if (
    !Array.isArray(value.final_advice) ||
    value.final_advice.length < 1 ||
    value.final_advice.length > 5
  ) {
    return { ok: false, reason: "presentation_advice_invalid" };
  }
  const candidateById = new Map(
    evidencePackage.candidates.map((candidate) => [
      candidate.candidateId,
      candidate,
    ]),
  );
  const finalAdvice: StagedTerraPresentationOutput["finalAdvice"] = [];
  for (const advice of value.final_advice) {
    if (
      !isRecord(advice) ||
      !exactKeys(advice, ["text", "candidate_ids", "fact_ids"]) ||
      !boundedString(advice.text, 600)
    ) {
      return { ok: false, reason: "presentation_advice_invalid" };
    }
    const candidateIds = parseStringArray(advice.candidate_ids, {
      minimum: 1,
      maximum: 5,
      itemMaximum: 80,
    });
    const factIds = parseStringArray(advice.fact_ids, {
      minimum: 1,
      maximum: 12,
      itemMaximum: 100,
    });
    if (
      !candidateIds ||
      !factIds ||
      candidateIds.some((id) => !rankedIds.has(id)) ||
      factIds.some((factId) =>
        candidateIds.every(
          (candidateId) =>
            !candidateById
              .get(candidateId)!
              .facts.some((fact) => fact.factId === factId),
        ),
      ) ||
      candidateIds.some((candidateId) =>
        factIds.every(
          (factId) =>
            !candidateById
              .get(candidateId)!
              .facts.some((fact) => fact.factId === factId),
        ),
      )
    ) {
      return { ok: false, reason: "presentation_advice_invalid" };
    }
    finalAdvice.push({
      text: advice.text as string,
      candidateIds,
      factIds,
    });
  }

  return {
    ok: true,
    value: {
      schemaVersion: STAGED_TERRA_PRESENTATION_SCHEMA_VERSION,
      rankedProducts,
      closeMatchCandidateIds: closeMatchIds,
      finalAdvice,
    },
  };
}
