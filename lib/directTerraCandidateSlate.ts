import type { SelectedSmartFeature } from "../types/smart-features.ts";
import {
  directTerraAssetTargetIsCoherent,
} from "./directTerraAssetVerifier.ts";
import {
  parseDirectTerraRankedSections,
} from "./directTerraReportOutline.ts";

export const DIRECT_TERRA_CANDIDATE_SLATE_VERSION =
  "direct-terra-candidate-slate-v1";
export const DIRECT_TERRA_CANDIDATE_DIAGNOSTIC_VERSION =
  "direct-terra-candidate-slate-diagnostic-v1";

export type DirectTerraRequirementKind =
  | "us_availability"
  | "budget"
  | "important_details"
  | "smart_feature"
  | "dealbreakers";

export type DirectTerraRequirementContractEntry = {
  id: string;
  kind: DirectTerraRequirementKind;
  hard: true;
};

export type DirectTerraRequirementVerdict = {
  requirementId: string;
  verdict: "pass" | "fail" | "needs_verification";
  sourceUrls: string[];
};

export type DirectTerraCandidateSlateEntry = {
  productName: string;
  brand: string;
  model: string;
  disposition: "ranked" | "close_match" | "rejected";
  finalRank: number | null;
  evidenceQuality: "high" | "medium" | "low";
  decisionReason: string;
  sourceUrls: string[];
  requirementVerdicts: DirectTerraRequirementVerdict[];
};

export type DirectTerraCandidateSlateDiagnostic = {
  schemaVersion: typeof DIRECT_TERRA_CANDIDATE_DIAGNOSTIC_VERSION;
  candidateCount: number;
  entries: {
    identityKey: string;
    disposition: DirectTerraCandidateSlateEntry["disposition"];
    finalRank: number | null;
    evidenceQuality: DirectTerraCandidateSlateEntry["evidenceQuality"];
    requirementVerdicts: {
      requirementId: string;
      verdict: DirectTerraRequirementVerdict["verdict"];
    }[];
  }[];
};

type RequirementRequest = {
  budget?: string;
  priorities?: string;
  avoid?: string;
  selectedFeatures?: SelectedSmartFeature[];
};

const FIXED_REQUIREMENT_IDS = new Set([
  "market_us",
  "budget",
  "important_details",
  "dealbreakers",
]);
const SMART_FEATURE_PREFIX = "smart_feature:";
const MAX_REQUIREMENT_COUNT = 29;
const MAX_SOURCE_URLS = 12;

function compactText(value: unknown, maximum: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
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

export function isDirectTerraRequirementId(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }
  return (
    FIXED_REQUIREMENT_IDS.has(value) ||
    (value.startsWith(SMART_FEATURE_PREFIX) &&
      value.length > SMART_FEATURE_PREFIX.length)
  );
}

function requirementOrderIsValid(ids: string[]) {
  if (
    ids.length === 0 ||
    ids.length > MAX_REQUIREMENT_COUNT ||
    ids[0] !== "market_us" ||
    new Set(ids).size !== ids.length
  ) {
    return false;
  }
  const stage = (id: string) => {
    if (id === "market_us") return 0;
    if (id === "budget") return 1;
    if (id === "important_details") return 2;
    if (id.startsWith(SMART_FEATURE_PREFIX)) return 3;
    if (id === "dealbreakers") return 4;
    return -1;
  };
  let previous = -1;
  for (const id of ids) {
    if (!isDirectTerraRequirementId(id)) return false;
    const current = stage(id);
    if (current < previous) return false;
    previous = current;
  }
  return true;
}

export function buildDirectTerraRequirementContract(
  request: RequirementRequest,
): DirectTerraRequirementContractEntry[] {
  const entries: DirectTerraRequirementContractEntry[] = [
    { id: "market_us", kind: "us_availability", hard: true },
  ];
  if (compactText(request.budget, 500)) {
    entries.push({ id: "budget", kind: "budget", hard: true });
  }
  if (compactText(request.priorities, 2_000)) {
    entries.push({
      id: "important_details",
      kind: "important_details",
      hard: true,
    });
  }

  const seenFeatureIds = new Set<string>();
  for (const feature of request.selectedFeatures ?? []) {
    const featureId = compactText(feature?.id, 100);
    const id = `${SMART_FEATURE_PREFIX}${featureId}`;
    if (
      !featureId ||
      !isDirectTerraRequirementId(id) ||
      seenFeatureIds.has(id)
    ) {
      throw new Error("Direct Terra requires unique stable Smart Feature IDs");
    }
    seenFeatureIds.add(id);
    entries.push({ id, kind: "smart_feature", hard: true });
  }

  if (compactText(request.avoid, 2_000)) {
    entries.push({
      id: "dealbreakers",
      kind: "dealbreakers",
      hard: true,
    });
  }
  if (!requirementOrderIsValid(entries.map((entry) => entry.id))) {
    throw new Error("Direct Terra requirement contract is invalid");
  }
  return entries;
}

export function directTerraRequirementContractFromIds(
  ids: unknown,
): DirectTerraRequirementContractEntry[] | null {
  if (
    !Array.isArray(ids) ||
    !ids.every(isDirectTerraRequirementId) ||
    !requirementOrderIsValid(ids)
  ) {
    return null;
  }
  return ids.map((id) => ({
    id,
    kind:
      id === "market_us"
        ? "us_availability"
        : id === "budget"
          ? "budget"
          : id === "important_details"
            ? "important_details"
            : id === "dealbreakers"
              ? "dealbreakers"
              : "smart_feature",
    hard: true,
  }));
}

export function directTerraCandidateSlateSchema(
  requirementContract: DirectTerraRequirementContractEntry[],
) {
  const requirementIds = requirementContract.map((entry) => entry.id);
  return {
    type: "array",
    minItems: 8,
    maxItems: 15,
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        product_name: { type: "string", minLength: 1, maxLength: 300 },
        brand: { type: "string", minLength: 1, maxLength: 120 },
        model: { type: "string", minLength: 1, maxLength: 200 },
        disposition: {
          type: "string",
          enum: ["ranked", "close_match", "rejected"],
        },
        final_rank: {
          anyOf: [
            { type: "integer", minimum: 1, maximum: 5 },
            { type: "null" },
          ],
        },
        evidence_quality: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        decision_reason: {
          type: "string",
          minLength: 1,
          maxLength: 500,
        },
        source_urls: {
          type: "array",
          minItems: 1,
          maxItems: MAX_SOURCE_URLS,
          items: { type: "string", minLength: 1, maxLength: 4_096 },
        },
        requirement_verdicts: {
          type: "array",
          minItems: requirementIds.length,
          maxItems: requirementIds.length,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              requirement_id: {
                type: "string",
                enum: requirementIds,
              },
              verdict: {
                type: "string",
                enum: ["pass", "fail", "needs_verification"],
              },
              source_urls: {
                type: "array",
                minItems: 1,
                maxItems: MAX_SOURCE_URLS,
                items: {
                  type: "string",
                  minLength: 1,
                  maxLength: 4_096,
                },
              },
            },
            required: ["requirement_id", "verdict", "source_urls"],
          },
        },
      },
      required: [
        "product_name",
        "brand",
        "model",
        "disposition",
        "final_rank",
        "evidence_quality",
        "decision_reason",
        "source_urls",
        "requirement_verdicts",
      ],
    },
  } as const;
}

function exactHttpSourceUrl(value: unknown, registered: Set<string>) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 4_096 ||
    !registered.has(value)
  ) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function parseSourceUrls(value: unknown, registered: Set<string>) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SOURCE_URLS
  ) {
    return null;
  }
  const urls = value.map((url) => exactHttpSourceUrl(url, registered));
  if (
    urls.some((url) => url === null) ||
    new Set(urls).size !== urls.length
  ) {
    return null;
  }
  return urls as string[];
}

function parseRequirementVerdicts(
  value: unknown,
  requirementContract: DirectTerraRequirementContractEntry[],
  registered: Set<string>,
  candidateSources: Set<string>,
) {
  if (
    !Array.isArray(value) ||
    value.length !== requirementContract.length
  ) {
    return null;
  }
  const verdicts: DirectTerraRequirementVerdict[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (
      !isRecord(item) ||
      !exactKeys(item, ["requirement_id", "verdict", "source_urls"]) ||
      item.requirement_id !== requirementContract[index].id ||
      !["pass", "fail", "needs_verification"].includes(
        String(item.verdict),
      )
    ) {
      return null;
    }
    const sourceUrls = parseSourceUrls(item.source_urls, registered);
    if (
      !sourceUrls ||
      sourceUrls.some((url) => !candidateSources.has(url))
    ) {
      return null;
    }
    verdicts.push({
      requirementId: item.requirement_id as string,
      verdict: item.verdict as DirectTerraRequirementVerdict["verdict"],
      sourceUrls,
    });
  }
  return verdicts;
}

function parseCandidate(
  value: unknown,
  requirementContract: DirectTerraRequirementContractEntry[],
  registered: Set<string>,
) {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "product_name",
      "brand",
      "model",
      "disposition",
      "final_rank",
      "evidence_quality",
      "decision_reason",
      "source_urls",
      "requirement_verdicts",
    ])
  ) {
    return null;
  }
  const productName = compactText(value.product_name, 300);
  const brand = compactText(value.brand, 120);
  const model = compactText(value.model, 200);
  const decisionReason = compactText(value.decision_reason, 500);
  const disposition = value.disposition;
  const evidenceQuality = value.evidence_quality;
  const finalRank =
    value.final_rank === null
      ? null
      : Number.isInteger(value.final_rank) &&
          (value.final_rank as number) >= 1 &&
          (value.final_rank as number) <= 5
        ? (value.final_rank as number)
        : undefined;
  if (
    !productName ||
    !brand ||
    !model ||
    !decisionReason ||
    !["ranked", "close_match", "rejected"].includes(String(disposition)) ||
    !["high", "medium", "low"].includes(String(evidenceQuality)) ||
    finalRank === undefined ||
    (disposition === "ranked" ? finalRank === null : finalRank !== null) ||
    !directTerraAssetTargetIsCoherent({
      key: "candidate-slate",
      rank: finalRank ?? 1,
      productName,
      brand,
      model,
      category: productName,
    })
  ) {
    return null;
  }
  const sourceUrls = parseSourceUrls(value.source_urls, registered);
  if (!sourceUrls) return null;
  const requirementVerdicts = parseRequirementVerdicts(
    value.requirement_verdicts,
    requirementContract,
    registered,
    new Set(sourceUrls),
  );
  if (!requirementVerdicts) return null;
  return {
    productName,
    brand,
    model,
    disposition: disposition as DirectTerraCandidateSlateEntry["disposition"],
    finalRank,
    evidenceQuality:
      evidenceQuality as DirectTerraCandidateSlateEntry["evidenceQuality"],
    decisionReason,
    sourceUrls,
    requirementVerdicts,
  } satisfies DirectTerraCandidateSlateEntry;
}

function identityKey(brand: string, model: string) {
  const normalizedBrand =
    brand
      .normalize("NFKC")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.join(" ") ?? "";
  // Model punctuation and spacing are presentation variants, not identity
  // boundaries ("0910-20" and "0910 20", "A-100" and "A100"). Compacting
  // only the model portion catches those duplicate slate entries while exact
  // digits still keep sibling models such as Q7 and Q70 distinct.
  const normalizedModel =
    model
      .normalize("NFKC")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.join("") ?? "";
  return `${normalizedBrand} ${normalizedModel}`.trim().slice(0, 200);
}

function visibleNeedsVerificationCount(section: string) {
  return section.match(/\bneeds?\s+verification\b/gi)?.length ?? 0;
}

function priceIdentityMap(value: unknown) {
  if (!Array.isArray(value) || value.length > 5) return null;
  const map = new Map<number, { brand: string; model: string }>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      !exactKeys(item, ["rank", "brand", "model", "observations"]) ||
      !Number.isInteger(item.rank) ||
      (item.rank as number) < 1 ||
      (item.rank as number) > 5 ||
      map.has(item.rank as number) ||
      !compactText(item.brand, 120) ||
      !compactText(item.model, 200) ||
      !Array.isArray(item.observations)
    ) {
      return null;
    }
    map.set(item.rank as number, {
      brand: compactText(item.brand, 120),
      model: compactText(item.model, 200),
    });
  }
  return map;
}

export function validateDirectTerraCandidateSlate({
  candidateSlate,
  reportMarkdown,
  priceObservations,
  requirementContract,
  responseSourceUrls,
}: {
  candidateSlate: unknown;
  reportMarkdown: string;
  priceObservations: unknown;
  requirementContract: DirectTerraRequirementContractEntry[];
  responseSourceUrls: string[];
}):
  | {
      ok: true;
      candidates: DirectTerraCandidateSlateEntry[];
      diagnostic: DirectTerraCandidateSlateDiagnostic;
    }
  | { ok: false; reason: string } {
  if (
    !requirementOrderIsValid(
      requirementContract.map((entry) => entry.id),
    ) ||
    !Array.isArray(candidateSlate) ||
    candidateSlate.length < 8 ||
    candidateSlate.length > 15
  ) {
    return { ok: false, reason: "candidate_slate_shape" };
  }
  const registered = new Set(responseSourceUrls);
  const candidates = candidateSlate.map((candidate) =>
    parseCandidate(candidate, requirementContract, registered),
  );
  if (candidates.some((candidate) => candidate === null)) {
    return { ok: false, reason: "candidate_entry_invalid" };
  }
  const parsed = candidates as DirectTerraCandidateSlateEntry[];
  const identityKeys = parsed.map((candidate) =>
    identityKey(candidate.brand, candidate.model),
  );
  if (
    identityKeys.some((key) => !key) ||
    new Set(identityKeys).size !== identityKeys.length
  ) {
    return { ok: false, reason: "candidate_identity_duplicate" };
  }

  const rankedSections = parseDirectTerraRankedSections(reportMarkdown);
  const rankedCandidates = parsed
    .filter((candidate) => candidate.disposition === "ranked")
    .sort((left, right) => (left.finalRank ?? 0) - (right.finalRank ?? 0));
  if (
    rankedSections.length === 0 ||
    rankedSections.length > 5 ||
    rankedCandidates.length !== rankedSections.length
  ) {
    return { ok: false, reason: "ranked_slate_count_mismatch" };
  }
  for (let index = 0; index < rankedSections.length; index += 1) {
    const section = rankedSections[index];
    const candidate = rankedCandidates[index];
    if (
      section.rank !== index + 1 ||
      candidate.finalRank !== section.rank ||
      candidate.productName !== section.name
    ) {
      return { ok: false, reason: "ranked_identity_mismatch" };
    }
    if (
      candidate.requirementVerdicts.some(
        (verdict) => verdict.verdict === "fail",
      )
    ) {
      return { ok: false, reason: "ranked_hard_requirement_failed" };
    }
    const needsVerification = candidate.requirementVerdicts.filter(
      (verdict) => verdict.verdict === "needs_verification",
    ).length;
    if (section.rank === 1 && needsVerification > 0) {
      return {
        ok: false,
        reason: "best_match_hard_requirement_unverified",
      };
    }
    if (
      section.rank > 1 &&
      visibleNeedsVerificationCount(section.section) < needsVerification
    ) {
      return {
        ok: false,
        reason: "ranked_unverified_requirement_not_visible",
      };
    }
  }

  const priceByRank = priceIdentityMap(priceObservations);
  if (!priceByRank || priceByRank.size !== rankedCandidates.length) {
    return { ok: false, reason: "price_identity_count_mismatch" };
  }
  for (const candidate of rankedCandidates) {
    const priceIdentity = priceByRank.get(candidate.finalRank!);
    if (
      !priceIdentity ||
      identityKey(candidate.brand, candidate.model) !==
        identityKey(priceIdentity.brand, priceIdentity.model)
    ) {
      return { ok: false, reason: "price_identity_mismatch" };
    }
  }

  return {
    ok: true,
    candidates: parsed,
    diagnostic: {
      schemaVersion: DIRECT_TERRA_CANDIDATE_DIAGNOSTIC_VERSION,
      candidateCount: parsed.length,
      entries: parsed.map((candidate) => ({
        identityKey: identityKey(candidate.brand, candidate.model),
        disposition: candidate.disposition,
        finalRank: candidate.finalRank,
        evidenceQuality: candidate.evidenceQuality,
        requirementVerdicts: candidate.requirementVerdicts.map((verdict) => ({
          requirementId: verdict.requirementId,
          verdict: verdict.verdict,
        })),
      })),
    },
  };
}
