import {
  directTerraAssetTargetIsCoherent,
  verifyDirectTerraAssetCandidates,
  type DirectTerraAssetCandidate,
  type DirectTerraAssetTarget,
} from "./directTerraAssetVerifier.ts";
import { scoreDirectTerraProductLink } from "./directTerraLinkPreference.ts";
import { buildDirectTerraAssetQuery } from "./directTerraSerperAssetAdapter.ts";

export const DIRECT_TERRA_SERPER_ORGANIC_ADAPTER_VERSION =
  "direct-terra-serper-organic-adapter-v1";
export const DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT =
  "https://google.serper.dev/search";
export const MAX_DIRECT_TERRA_ORGANIC_TARGETS = 5;
export const MAX_DIRECT_TERRA_ORGANIC_RESULTS = 10;

export type DirectTerraSerperOrganicRequest = Readonly<{
  endpoint: typeof DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT;
  body: Readonly<{
    q: string;
    gl: "us";
    hl: "en";
    num: typeof MAX_DIRECT_TERRA_ORGANIC_RESULTS;
  }>;
}>;

export type DirectTerraSerperOrganicTransport = (
  request: DirectTerraSerperOrganicRequest,
) => Promise<unknown>;

export type DirectTerraSerperOrganicDiagnostic = {
  targetKey: string;
  rank: number;
  query: string;
  status: "completed" | "invalid_response" | "transport_error";
  payloadShape:
    | "organic_array"
    | "missing_organic_array"
    | "provider_error"
    | "non_object"
    | "transport_unavailable";
  rawOrganicResultCount: number;
  consideredOrganicResultCount: number;
  mappedCandidateCount: number;
  acceptedWebsiteCount: number;
};

export type DirectTerraSerperOrganicWebsite = {
  targetKey: string;
  rank: number;
  productName: string;
  status: DirectTerraSerperOrganicDiagnostic["status"];
  rawOrganicResultCount: number;
  mappedCandidateCount: number;
  productUrl: string | null;
};

export type DirectTerraSerperOrganicBatch = {
  adapterVersion: typeof DIRECT_TERRA_SERPER_ORGANIC_ADAPTER_VERSION;
  transportCallCount: number;
  items: DirectTerraSerperOrganicWebsite[];
};

type AdapterInput = {
  targets: DirectTerraAssetTarget[];
  transport: DirectTerraSerperOrganicTransport;
  /** Server-only hook. The query and counts must never enter the client result. */
  recordDiagnostic?: (diagnostic: DirectTerraSerperOrganicDiagnostic) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function httpUrl(value: unknown) {
  const text = boundedText(value, 4_096);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? text
      : undefined;
  } catch {
    return undefined;
  }
}

function organicCandidate(value: unknown): DirectTerraAssetCandidate | null {
  if (!isRecord(value)) return null;
  const title = boundedText(value.title, 300);
  const productUrl = httpUrl(value.link);
  if (!title || !productUrl) return null;
  return {
    title,
    productUrl,
    snippet: boundedText(value.snippet, 800),
  };
}

function parseOrganicResponse(value: unknown) {
  if (!isRecord(value)) {
    return { accepted: false as const, payloadShape: "non_object" as const };
  }
  if (Object.hasOwn(value, "error") && value.error != null) {
    return { accepted: false as const, payloadShape: "provider_error" as const };
  }
  if (!Array.isArray(value.organic)) {
    return {
      accepted: false as const,
      payloadShape: "missing_organic_array" as const,
    };
  }

  const rawOrganicResultCount = value.organic.length;
  const considered = value.organic.slice(0, MAX_DIRECT_TERRA_ORGANIC_RESULTS);
  const candidates = considered
    .map(organicCandidate)
    .filter((candidate): candidate is DirectTerraAssetCandidate => Boolean(candidate));
  return {
    accepted: true as const,
    payloadShape: "organic_array" as const,
    rawOrganicResultCount,
    consideredOrganicResultCount: considered.length,
    candidates,
  };
}

function validateTargets(targets: DirectTerraAssetTarget[]) {
  if (targets.length > MAX_DIRECT_TERRA_ORGANIC_TARGETS) {
    throw new Error(
      `Direct-Terra organic target ceiling is ${MAX_DIRECT_TERRA_ORGANIC_TARGETS}.`,
    );
  }
  const keys = new Set<string>();
  const ranks = new Set<number>();
  for (const target of targets) {
    if (!directTerraAssetTargetIsCoherent(target)) {
      throw new Error(`Incoherent target identity for ${target.key || "unknown"}.`);
    }
    if (keys.has(target.key) || ranks.has(target.rank)) {
      throw new Error(`Duplicate target identity: ${target.key}.`);
    }
    keys.add(target.key);
    ranks.add(target.rank);
    buildDirectTerraOrganicProductPageQuery(target);
  }
}

export function buildDirectTerraOrganicProductPageQuery(
  target: DirectTerraAssetTarget,
) {
  const query = `${buildDirectTerraAssetQuery(target)} product page`;
  if (query.length > 180) {
    throw new Error(`Invalid organic identity query for ${target.key}.`);
  }
  return query;
}

export async function resolveDirectTerraWebsitesWithSerperOrganic(
  input: AdapterInput,
): Promise<DirectTerraSerperOrganicBatch> {
  const targets = input.targets
    .map((target) => ({ ...target }))
    .sort((left, right) => left.rank - right.rank);
  validateTargets(targets);

  const items: DirectTerraSerperOrganicWebsite[] = [];
  let transportCallCount = 0;
  for (const target of targets) {
    const query = buildDirectTerraOrganicProductPageQuery(target);
    let status: DirectTerraSerperOrganicDiagnostic["status"] = "transport_error";
    let payloadShape: DirectTerraSerperOrganicDiagnostic["payloadShape"] =
      "transport_unavailable";
    let rawOrganicResultCount = 0;
    let consideredOrganicResultCount = 0;
    let candidates: DirectTerraAssetCandidate[] = [];

    try {
      transportCallCount += 1;
      const parsed = parseOrganicResponse(
        await input.transport({
          endpoint: DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT,
          body: {
            q: query,
            gl: "us",
            hl: "en",
            num: MAX_DIRECT_TERRA_ORGANIC_RESULTS,
          },
        }),
      );
      payloadShape = parsed.payloadShape;
      if (parsed.accepted) {
        status = "completed";
        rawOrganicResultCount = parsed.rawOrganicResultCount;
        consideredOrganicResultCount = parsed.consideredOrganicResultCount;
        candidates = parsed.candidates;
      } else {
        status = "invalid_response";
      }
    } catch {
      status = "transport_error";
    }

    const verification = verifyDirectTerraAssetCandidates({ target, candidates });
    // T8B host preference: among ALL identity-accepted pages in this response,
    // prefer the manufacturer's own site or a popular retailer (and a URL
    // whose path carries the model) over whichever page merely appeared first.
    // Preference only reorders already-verified links; it admits nothing new.
    const acceptedUrls = verification.decisions
      .filter((decision) => decision.productUrlAccepted && decision.productUrl)
      .map((decision) => decision.productUrl as string);
    const preferredProductUrl = acceptedUrls.reduce<string | null>(
      (best, candidateUrl) =>
        scoreDirectTerraProductLink(candidateUrl, target) >
        scoreDirectTerraProductLink(best, target)
          ? candidateUrl
          : best,
      null,
    );
    input.recordDiagnostic?.({
      targetKey: target.key,
      rank: target.rank,
      query,
      status,
      payloadShape,
      rawOrganicResultCount,
      consideredOrganicResultCount,
      mappedCandidateCount: candidates.length,
      acceptedWebsiteCount: acceptedUrls.length,
    });
    items.push({
      targetKey: target.key,
      rank: target.rank,
      productName: target.productName,
      status,
      rawOrganicResultCount,
      mappedCandidateCount: candidates.length,
      productUrl: preferredProductUrl ?? verification.productUrl,
    });
  }

  return {
    adapterVersion: DIRECT_TERRA_SERPER_ORGANIC_ADAPTER_VERSION,
    transportCallCount,
    items,
  };
}
