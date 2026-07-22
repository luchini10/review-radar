import {
  directTerraAssetTargetIsCoherent,
  verifyDirectTerraAssetCandidates,
  type DirectTerraAssetCandidate,
  type DirectTerraAssetTarget,
  type DirectTerraAssetVerification,
} from "./directTerraAssetVerifier.ts";

export const DIRECT_TERRA_SERPER_ASSET_ADAPTER_VERSION =
  "direct-terra-serper-asset-adapter-v1";
export const DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT =
  "https://google.serper.dev/shopping";
export const MAX_DIRECT_TERRA_ASSET_TARGETS = 5;
export const MAX_DIRECT_TERRA_SHOPPING_RESULTS = 20;

const MAX_IDENTITY_QUERY_LENGTH = 180;

export type DirectTerraSerperShoppingRequest = Readonly<{
  endpoint: typeof DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT;
  body: Readonly<{
    q: string;
    gl: "us";
    hl: "en";
    num: typeof MAX_DIRECT_TERRA_SHOPPING_RESULTS;
  }>;
}>;

export type DirectTerraSerperShoppingTransport = (
  request: DirectTerraSerperShoppingRequest,
) => Promise<unknown>;

export type DirectTerraSerperAssetDiagnostic = {
  targetKey: string;
  rank: number;
  query: string;
  providerStatus: "completed" | "invalid_response" | "transport_error";
  rawShoppingResultCount: number;
  mappedCandidateCount: number;
  directProductUrlCandidateCount: number;
  imageCandidateCount: number;
  googleWrapperOnlyRowCount: number;
};

export type DirectTerraSerperAssetItem = {
  targetKey: string;
  rank: number;
  productName: string;
  providerStatus: DirectTerraSerperAssetDiagnostic["providerStatus"];
  rawShoppingResultCount: number;
  mappedCandidateCount: number;
  verification: DirectTerraAssetVerification;
};

export type DirectTerraSerperAssetBatch = {
  adapterVersion: typeof DIRECT_TERRA_SERPER_ASSET_ADAPTER_VERSION;
  transportCallCount: number;
  items: DirectTerraSerperAssetItem[];
};

type DirectTerraSerperAssetAdapterInput = {
  targets: DirectTerraAssetTarget[];
  transport: DirectTerraSerperShoppingTransport;
  /** Server-only observability hook. Never serialize its query to a client. */
  recordDiagnostic?: (diagnostic: DirectTerraSerperAssetDiagnostic) => void;
};

function queryTokens(value: string) {
  return value.normalize("NFKC").match(/[A-Za-z0-9][A-Za-z0-9+./-]*/g) || [];
}

function queryTokenKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildDirectTerraAssetQuery(target: DirectTerraAssetTarget) {
  if (!directTerraAssetTargetIsCoherent(target)) {
    throw new Error(`Incoherent target identity for ${target.key || "unknown"}.`);
  }

  const seen = new Set<string>();
  const tokens = [target.brand, target.model, target.category]
    .flatMap(queryTokens)
    .filter((token) => {
      const key = queryTokenKey(token);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const query = tokens.join(" ");

  if (!query || query.length > MAX_IDENTITY_QUERY_LENGTH) {
    throw new Error(`Invalid exact-identity query for ${target.key}.`);
  }

  return query;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.slice(0, maxLength);
}

function parsedHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isGoogleWrapper(value: string) {
  const parsed = parsedHttpUrl(value);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  return host === "google.com" || host.endsWith(".google.com");
}

function rowProductUrls(row: Record<string, unknown>) {
  return [row.productLink, row.product_link, row.link]
    .map((value) => boundedText(value, 4_096))
    .filter((value): value is string => Boolean(value && parsedHttpUrl(value)));
}

function directProductUrl(row: Record<string, unknown>) {
  for (const url of rowProductUrls(row)) {
    if (isGoogleWrapper(url)) continue;
    return url;
  }
  return undefined;
}

function firstBoundedText(
  values: unknown[],
  maxLength: number,
) {
  for (const value of values) {
    const text = boundedText(value, maxLength);
    if (text) return text;
  }
  return undefined;
}

function mapShoppingRow(value: unknown): DirectTerraAssetCandidate | null {
  if (!isRecord(value)) return null;

  const title = boundedText(value.title, 300);
  if (!title) return null;

  return {
    title,
    productUrl: directProductUrl(value),
    imageUrl: firstBoundedText(
      [value.imageUrl, value.image, value.thumbnailUrl, value.thumbnail],
      4_096,
    ),
    snippet: boundedText(value.snippet, 800),
  };
}

function rowImageUrl(row: Record<string, unknown>) {
  return firstBoundedText(
    [row.imageUrl, row.image, row.thumbnailUrl, row.thumbnail],
    4_096,
  );
}

function parseShoppingResponse(response: unknown) {
  if (!isRecord(response) || !Array.isArray(response.shopping)) return null;
  if (boundedText(response.error, 1_000)) return null;
  if (response.shopping.length > MAX_DIRECT_TERRA_SHOPPING_RESULTS) return null;

  const rows = response.shopping.filter(isRecord);
  const candidates = rows
    .map(mapShoppingRow)
    .filter((candidate): candidate is DirectTerraAssetCandidate => Boolean(candidate));

  return {
    rawShoppingResultCount: response.shopping.length,
    candidates,
    directProductUrlCandidateCount: rows.filter((row) => directProductUrl(row)).length,
    imageCandidateCount: rows.filter((row) => rowImageUrl(row)).length,
    googleWrapperOnlyRowCount: rows.filter((row) => {
      const urls = rowProductUrls(row);
      return urls.length > 0 && urls.every(isGoogleWrapper);
    }).length,
  };
}

function validateBatch(targets: DirectTerraAssetTarget[]) {
  if (targets.length > MAX_DIRECT_TERRA_ASSET_TARGETS) {
    throw new Error(
      `Direct-Terra asset target ceiling is ${MAX_DIRECT_TERRA_ASSET_TARGETS}.`,
    );
  }

  const keys = new Set<string>();
  const ranks = new Set<number>();
  for (const target of targets) {
    if (!directTerraAssetTargetIsCoherent(target)) {
      throw new Error(`Incoherent target identity for ${target.key || "unknown"}.`);
    }
    if (keys.has(target.key)) {
      throw new Error(`Duplicate target key: ${target.key}.`);
    }
    if (ranks.has(target.rank)) {
      throw new Error(`Duplicate target rank: ${target.rank}.`);
    }
    keys.add(target.key);
    ranks.add(target.rank);
    buildDirectTerraAssetQuery(target);
  }
}

function unavailableVerification(target: DirectTerraAssetTarget) {
  return verifyDirectTerraAssetCandidates({ target, candidates: [] });
}

export async function resolveDirectTerraAssetsWithSerperShopping(
  input: DirectTerraSerperAssetAdapterInput,
): Promise<DirectTerraSerperAssetBatch> {
  const targets = input.targets
    .map((target) => ({ ...target }))
    .sort((left, right) => left.rank - right.rank);
  validateBatch(targets);

  const items: DirectTerraSerperAssetItem[] = [];
  let transportCallCount = 0;

  for (const target of targets) {
    const query = buildDirectTerraAssetQuery(target);
    let providerStatus: DirectTerraSerperAssetItem["providerStatus"];
    let rawShoppingResultCount = 0;
    let candidates: DirectTerraAssetCandidate[] = [];
    let directProductUrlCandidateCount = 0;
    let imageCandidateCount = 0;
    let googleWrapperOnlyRowCount = 0;

    try {
      transportCallCount += 1;
      const response = await input.transport({
        endpoint: DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
        body: {
          q: query,
          gl: "us",
          hl: "en",
          num: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
        },
      });
      const parsed = parseShoppingResponse(response);
      if (parsed) {
        providerStatus = "completed";
        rawShoppingResultCount = parsed.rawShoppingResultCount;
        candidates = parsed.candidates;
        directProductUrlCandidateCount = parsed.directProductUrlCandidateCount;
        imageCandidateCount = parsed.imageCandidateCount;
        googleWrapperOnlyRowCount = parsed.googleWrapperOnlyRowCount;
      } else {
        providerStatus = "invalid_response";
      }
    } catch {
      providerStatus = "transport_error";
    }

    const verification = candidates.length
      ? verifyDirectTerraAssetCandidates({ target, candidates })
      : unavailableVerification(target);
    const diagnostic = {
      targetKey: target.key,
      rank: target.rank,
      query,
      providerStatus,
      rawShoppingResultCount,
      mappedCandidateCount: candidates.length,
      directProductUrlCandidateCount,
      imageCandidateCount,
      googleWrapperOnlyRowCount,
    } satisfies DirectTerraSerperAssetDiagnostic;

    input.recordDiagnostic?.(diagnostic);
    items.push({
      targetKey: target.key,
      rank: target.rank,
      productName: target.productName,
      providerStatus,
      rawShoppingResultCount,
      mappedCandidateCount: candidates.length,
      verification,
    });
  }

  return {
    adapterVersion: DIRECT_TERRA_SERPER_ASSET_ADAPTER_VERSION,
    transportCallCount,
    items,
  };
}
