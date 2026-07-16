import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import {
  AUTONOMOUS_FACT_VERIFIER_VERSION,
  DEFAULT_HYBRID_FETCH_CONFIG,
  LIVE_HYBRID_FETCH_DEPENDENCIES,
  fetchHybridSource,
  observeHybridSourceHtml,
  verifyHybridProductSource,
} from "../lib/autonomousFactVerifier.ts";

const INPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json",
);
const OUTPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-h2-verifier-2026-07-16/h2-result.json",
);
const EXPECTED_SOURCE_COUNT = 10;
const MAX_HTTP_ATTEMPTS = 30;
const EXECUTE = process.argv.includes("--execute");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function collectSourceIds(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectSourceIds(entry, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "source_ids" && Array.isArray(entry)) {
      for (const id of entry) if (typeof id === "string") found.add(id);
    } else {
      collectSourceIds(entry, found);
    }
  }
  return found;
}

function provisionalProduct(card) {
  return {
    identity: {
      brand: card.identity.brand,
      productName: card.identity.product_name,
      model: card.identity.model,
    },
    priceAmount: card.purchase_offer.price_amount,
    currency: card.purchase_offer.currency || "",
    seller: card.purchase_offer.seller || "",
    productUrl: card.purchase_offer.product_url,
    imageUrl: card.image?.url || null,
    rating: card.owner_review?.rating ?? null,
    reviewCount: card.owner_review?.review_count ?? null,
  };
}

function fieldProjection(verifications, field) {
  const receipts = verifications.map((entry) => entry.verification[field]);
  const verified = receipts.filter(
    (receipt) => receipt?.status === "verified" && receipt.observedValue !== null,
  );
  const unique = new Map(
    verified.map((receipt) => [JSON.stringify(receipt.observedValue), receipt.observedValue]),
  );
  if (unique.size === 1) {
    return {
      disposition: "verified",
      value: [...unique.values()][0],
      sourceUrls: [...new Set(verified.map((receipt) => receipt.sourceUrl))],
    };
  }
  if (unique.size > 1) {
    return {
      disposition: "conflicting_verified_values",
      value: null,
      sourceUrls: [...new Set(verified.map((receipt) => receipt.sourceUrl))],
    };
  }
  const precedence = ["contradicted", "unavailable", "cleared", "inconclusive"];
  const disposition =
    precedence.find((status) => receipts.some((receipt) => receipt?.status === status)) ||
    "not_observed";
  return {
    disposition,
    value: null,
    sourceUrls: [],
  };
}

function buildProductResults(products, records) {
  return products.map((product) => {
    const verifications = records.flatMap((record) =>
      record.verifications.filter((entry) => entry.productKey === product.key),
    );
    const relevantPurchaseSources = records.filter(
      (record) =>
        product.sourceIds.includes(record.source.id) &&
        ["purchase_page", "official_product"].includes(record.source.role),
    );
    const fields = Object.fromEntries(
      [
        "identity",
        "price",
        "currency",
        "seller",
        "purchaseUrl",
        "availability",
        "imageUrl",
        "rating",
        "reviewCount",
        "editorialModel",
      ].map((field) => [field, fieldProjection(verifications, field)]),
    );
    return {
      key: product.key,
      rank: product.rank,
      recommendationStatus: product.recommendationStatus,
      provisionalIdentity: product.provisional.identity,
      citedSourceIds: product.sourceIds,
      relevantPurchaseFetches: relevantPurchaseSources.map((record) => ({
        sourceId: record.source.id,
        fetchOk: record.fetch.ok,
        failureReason: record.fetch.ok ? null : record.fetch.reason,
      })),
      fields,
      retainsVerifiedIdentityAndUsableDestination:
        fields.identity.disposition === "verified" &&
        fields.purchaseUrl.disposition === "verified",
      offerDisposition:
        fields.price.disposition === "verified" &&
        fields.purchaseUrl.disposition === "verified"
          ? "verified"
          : relevantPurchaseSources.length > 0
            ? "honest_unavailable_or_inconclusive"
            : "not_observed",
    };
  });
}

function summarize(result, products) {
  const productResults = buildProductResults(products, result.records);
  const identityDestinationCount = productResults.filter(
    (entry) => entry.retainsVerifiedIdentityAndUsableDestination,
  ).length;
  const safeOfferDispositionCount = productResults.filter((entry) =>
    ["verified", "honest_unavailable_or_inconclusive"].includes(
      entry.offerDisposition,
    ),
  ).length;
  const failures = result.records.filter((record) => !record.fetch.ok);
  return {
    productResults,
    fetchSummary: {
      topLevelFetches: result.records.length,
      physicalHttpAttempts: result.physicalHttpAttempts,
      successfulFetches: result.records.length - failures.length,
      failedFetches: failures.length,
      failureReasons: Object.fromEntries(
        [...new Set(failures.map((record) => record.fetch.reason))].map((reason) => [
          reason,
          failures.filter((record) => record.fetch.reason === reason).length,
        ]),
      ),
    },
    mechanicalGates: {
      identityAndDestinationCount: identityDestinationCount,
      identityAndDestinationFloor: 3,
      identityAndDestinationPass: identityDestinationCount >= 3,
      safeOfferDispositionCount,
      safeOfferDispositionFloor: 3,
      safeOfferDispositionPass: safeOfferDispositionCount >= 3,
      zeroFalseVerified: "requires_frozen_human_audit_comparison",
      knownCases: "requires_frozen_human_audit_comparison",
      finalVerdict: "pending_human_audit_comparison",
    },
  };
}

function sanitizedFetch(fetchResult) {
  if (!fetchResult.ok) return fetchResult;
  return {
    ok: true,
    requestedUrl: fetchResult.requestedUrl,
    finalUrl: fetchResult.finalUrl,
    status: fetchResult.status,
    contentType: fetchResult.contentType,
    byteLength: fetchResult.byteLength,
    redirectCount: fetchResult.redirectCount,
    attempts: fetchResult.attempts,
    contentHash: fetchResult.contentHash,
  };
}

const inputText = readFileSync(INPUT_PATH, "utf8");
const fixture = JSON.parse(inputText);
const slate = fixture.research?.slate;
if (!slate) throw new Error("accepted fixture has no research.slate");

const sources = slate.sources || [];
const uniqueUrls = new Set(sources.map((source) => source.url));
if (sources.length !== EXPECTED_SOURCE_COUNT || uniqueUrls.size !== EXPECTED_SOURCE_COUNT) {
  throw new Error(
    `expected ${EXPECTED_SOURCE_COUNT} unique registered sources; got ${sources.length}/${uniqueUrls.size}`,
  );
}

const cards = [...(slate.products || []), ...(slate.close_matches || [])];
const products = cards.map((card) => ({
  key: `rank-${card.rank}-${card.identity.model}`,
  rank: card.rank,
  recommendationStatus: card.recommendation_status,
  sourceIds: [...collectSourceIds(card)].sort(),
  provisional: provisionalProduct(card),
}));
if (products.length !== 4) throw new Error(`expected four products; got ${products.length}`);

const plan = {
  mode: EXECUTE ? "execute" : "dry-run",
  inputPath: INPUT_PATH,
  inputSha256: sha256(inputText),
  outputPath: OUTPUT_PATH,
  verifierVersion: AUTONOMOUS_FACT_VERIFIER_VERSION,
  registeredSources: sources.map(({ id, role, url }) => ({ id, role, url })),
  productKeys: products.map((product) => product.key),
  bounds: {
    topLevelFetches: EXPECTED_SOURCE_COUNT,
    retryCount: 0,
    maxRedirectsPerFetch: DEFAULT_HYBRID_FETCH_CONFIG.maxRedirects,
    maxPhysicalHttpAttempts: MAX_HTTP_ATTEMPTS,
    maxBytesPerFetch: DEFAULT_HYBRID_FETCH_CONFIG.maxBytes,
    timeoutMsPerAttempt: DEFAULT_HYBRID_FETCH_CONFIG.timeoutMs,
  },
};

if (!EXECUTE) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (existsSync(OUTPUT_PATH)) {
  throw new Error(`refusing to repeat H2: evidence already exists at ${OUTPUT_PATH}`);
}

const result = {
  version: "oai-h2-verifier-run-v1",
  status: "running",
  startedAt: new Date().toISOString(),
  completedAt: null,
  repositoryCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  ...plan,
  mode: "execute",
  physicalHttpAttempts: 0,
  records: [],
  summary: null,
};
atomicWriteJson(OUTPUT_PATH, result);

for (const source of sources) {
  const fetchResult = await fetchHybridSource(
    source.url,
    LIVE_HYBRID_FETCH_DEPENDENCIES,
    DEFAULT_HYBRID_FETCH_CONFIG,
  );
  result.physicalHttpAttempts += fetchResult.attempts;
  if (result.physicalHttpAttempts > MAX_HTTP_ATTEMPTS) {
    result.status = "attempt_cap_exceeded";
    result.completedAt = new Date().toISOString();
    atomicWriteJson(OUTPUT_PATH, result);
    throw new Error("H2 physical HTTP-attempt ceiling exceeded");
  }

  const record = {
    source: {
      id: source.id,
      role: source.role,
      publisher: source.publisher,
      requestedUrl: source.url,
    },
    fetch: sanitizedFetch(fetchResult),
    observation: null,
    verifications: [],
  };
  if (fetchResult.ok) {
    const observation = observeHybridSourceHtml({
      html: fetchResult.body,
      requestedUrl: fetchResult.requestedUrl,
      finalUrl: fetchResult.finalUrl,
      observedAt: new Date().toISOString(),
      status: fetchResult.status,
      contentType: fetchResult.contentType,
      redirectCount: fetchResult.redirectCount,
    });
    record.observation = observation;
    for (const product of products.filter((entry) => entry.sourceIds.includes(source.id))) {
      record.verifications.push({
        productKey: product.key,
        verification: verifyHybridProductSource({
          product: product.provisional,
          sourceRole: source.role,
          observation,
        }),
      });
    }
  }
  result.records.push(record);
  result.summary = summarize(result, products);
  atomicWriteJson(OUTPUT_PATH, result);
  console.log(
    `${source.id}: ${fetchResult.ok ? "ok" : fetchResult.reason} (${fetchResult.attempts} attempt${fetchResult.attempts === 1 ? "" : "s"})`,
  );
}

result.status = "complete";
result.completedAt = new Date().toISOString();
result.summary = summarize(result, products);
atomicWriteJson(OUTPUT_PATH, result);
console.log(JSON.stringify(result.summary, null, 2));
