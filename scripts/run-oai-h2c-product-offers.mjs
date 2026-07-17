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
import { performance } from "node:perf_hooks";

import {
  SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
  searchApiOffersRequestParams,
  searchApiShoppingRequestParams,
  selectSearchApiProductToken,
  verifySearchApiProductOffers,
} from "../lib/autonomousCommerceVerifier.ts";

const INPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-2a-terra-2026-07-16-primary-01-v3-smoke-1d7a300/primary-01.json",
);
const OUTPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-h2c-product-offers-2026-07-16/h2c-result.json",
);
const ENDPOINT = "https://www.searchapi.io/api/v1/search";
const EXPECTED_TARGETS = 4;
const MAX_PHYSICAL_ATTEMPTS = 8;
const TIMEOUT_MS = 12_000;
const EXECUTE = process.argv.includes("--execute");
const APPROVED_ATTEMPTS = Number(
  process.argv
    .find((argument) => argument.startsWith("--approved-attempts="))
    ?.split("=")[1] || "0",
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function loadSearchApiKey() {
  if (process.env.SEARCHAPI_API_KEY) return process.env.SEARCHAPI_API_KEY;
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("SEARCHAPI_API_KEY="));
  if (!line) return "";
  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^['"]|['"]$/g, "");
}

function sourceCards(slate) {
  return [...(slate.products || []), ...(slate.close_matches || [])];
}

function targetsFromSlate(slate) {
  return sourceCards(slate).map((card) => ({
    key: `rank-${card.rank}-${card.identity.model}`,
    brand: card.identity.brand,
    productName: card.identity.product_name,
    model: card.identity.model,
    category: "vacuum cleaner",
  }));
}

function stringValue(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function numberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizedShoppingPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { schema: "invalid", shoppingResults: [] };
  }
  if (!Array.isArray(payload.shopping_results)) {
    return { schema: "invalid", shoppingResults: [] };
  }
  return {
    schema: "shopping_results_array",
    shoppingResults: payload.shopping_results.map((result, index) => {
      const token = stringValue(result?.product_token);
      return {
        position: numberValue(result?.position) ?? index + 1,
        title: stringValue(result?.title).slice(0, 300),
        hasProductToken: Boolean(token),
        productTokenSha256: token ? sha256(token) : null,
      };
    }),
  };
}

function sanitizedOffersPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { schema: "invalid", product: null, offers: [] };
  }
  const product =
    payload.product && typeof payload.product === "object" && !Array.isArray(payload.product)
      ? {
          title: stringValue(payload.product.title).slice(0, 300),
          brand: stringValue(payload.product.brand).slice(0, 120),
        }
      : null;
  if (!product || !Array.isArray(payload.offers)) {
    return { schema: "invalid", product, offers: [] };
  }
  return {
    schema: "product_and_offers_array",
    product,
    offers: payload.offers.map((offer, index) => ({
      position: numberValue(offer?.position) ?? index + 1,
      title: stringValue(offer?.title).slice(0, 300),
      link: stringValue(offer?.link).slice(0, 1200),
      price: stringValue(offer?.price).slice(0, 80),
      extractedPrice: numberValue(offer?.extracted_price),
      availability: stringValue(offer?.availability).slice(0, 160),
      condition: stringValue(offer?.condition).slice(0, 120),
      details: Array.isArray(offer?.details)
        ? offer.details.map(stringValue).filter(Boolean).slice(0, 12)
        : [],
      merchant:
        offer?.merchant && typeof offer.merchant === "object"
          ? { name: stringValue(offer.merchant.name).slice(0, 120) }
          : null,
    })),
  };
}

function sanitizedTokenSelection(selection) {
  return {
    ...selection,
    selected: selection.selected
      ? {
          providerPosition: selection.selected.providerPosition,
          title: selection.selected.title,
          matchedIdentifiers: selection.selected.matchedIdentifiers,
          productTokenSha256: sha256(selection.selected.productToken),
        }
      : null,
  };
}

async function oneSearchApiRequest(apiKey, params) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = performance.now();
  let status = null;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    status = response.status;
    if (!response.ok) throw new Error("provider_http_error");
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || payload.error) {
      throw new Error("provider_payload_error");
    }
    return {
      ok: true,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "request_timeout"
          : error instanceof Error &&
              ["provider_http_error", "provider_payload_error"].includes(error.message)
            ? error.message
            : "request_failed",
      payload: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const inputText = readFileSync(INPUT_PATH, "utf8");
const fixture = JSON.parse(inputText);
const slate = fixture.research?.slate;
if (!slate) throw new Error("accepted fixture has no research.slate");
const targets = targetsFromSlate(slate);
if (targets.length !== EXPECTED_TARGETS) {
  throw new Error(`expected ${EXPECTED_TARGETS} frozen targets; got ${targets.length}`);
}

const plan = {
  mode: EXECUTE ? "execute" : "dry-run",
  version: "oai-h2c-product-offers-run-v1",
  verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
  inputPath: INPUT_PATH,
  inputSha256: sha256(inputText),
  outputPath: OUTPUT_PATH,
  endpoint: ENDPOINT,
  bounds: {
    targets: EXPECTED_TARGETS,
    shoppingRequests: EXPECTED_TARGETS,
    offersRequests: `up to ${EXPECTED_TARGETS}; only after an exact token selection`,
    physicalAttempts: MAX_PHYSICAL_ATTEMPTS,
    retries: 0,
    fallbacks: 0,
    replacements: 0,
    additionalQueries: 0,
    timeoutMs: TIMEOUT_MS,
  },
  targets: targets.map((target) => ({
    ...target,
    shoppingRequest: searchApiShoppingRequestParams(target),
    offersRequestTemplate: {
      ...searchApiOffersRequestParams("<provider-token-from-exact-shopping-entity>"),
      product_token: "<redacted; token bound to selected Shopping entity>",
    },
  })),
};

if (!EXECUTE) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}
if (APPROVED_ATTEMPTS !== MAX_PHYSICAL_ATTEMPTS) {
  throw new Error(
    `live H2C requires --approved-attempts=${MAX_PHYSICAL_ATTEMPTS}; received ${APPROVED_ATTEMPTS}`,
  );
}
if (existsSync(OUTPUT_PATH)) {
  throw new Error(`refusing to repeat H2C: evidence already exists at ${OUTPUT_PATH}`);
}
const apiKey = loadSearchApiKey();
if (!apiKey) throw new Error("SEARCHAPI_API_KEY is unavailable");

const evidence = {
  ...plan,
  mode: "execute",
  status: "running",
  repositoryCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  startedAt: new Date().toISOString(),
  completedAt: null,
  physicalAttempts: 0,
  records: [],
  summary: null,
};
atomicWriteJson(OUTPUT_PATH, evidence);

for (const target of targets) {
  if (evidence.physicalAttempts >= MAX_PHYSICAL_ATTEMPTS) {
    throw new Error("H2C physical-attempt ceiling reached before Shopping request");
  }
  const shoppingParams = searchApiShoppingRequestParams(target);
  evidence.physicalAttempts += 1;
  atomicWriteJson(OUTPUT_PATH, evidence);
  const shoppingProvider = await oneSearchApiRequest(apiKey, shoppingParams);
  const tokenSelection = selectSearchApiProductToken({
    target,
    payload: shoppingProvider.payload,
  });
  const record = {
    target,
    shoppingRequest: {
      endpoint: ENDPOINT,
      params: shoppingParams,
      attempt: evidence.physicalAttempts,
    },
    shoppingProvider: shoppingProvider.ok
      ? {
          ok: true,
          status: shoppingProvider.status,
          durationMs: shoppingProvider.durationMs,
        }
      : {
          ok: false,
          status: shoppingProvider.status,
          durationMs: shoppingProvider.durationMs,
          reason: shoppingProvider.reason,
        },
    sanitizedShoppingPayload: sanitizedShoppingPayload(shoppingProvider.payload),
    tokenSelection: sanitizedTokenSelection(tokenSelection),
    offersRequest: null,
    offersProvider: null,
    sanitizedOffersPayload: null,
    verification: null,
  };
  evidence.records.push(record);
  atomicWriteJson(OUTPUT_PATH, evidence);

  if (shoppingProvider.ok && tokenSelection.selected) {
    if (evidence.physicalAttempts >= MAX_PHYSICAL_ATTEMPTS) {
      throw new Error("H2C physical-attempt ceiling reached before Offers request");
    }
    const token = tokenSelection.selected.productToken;
    const offersParams = searchApiOffersRequestParams(token);
    evidence.physicalAttempts += 1;
    record.offersRequest = {
      endpoint: ENDPOINT,
      sanitizedParams: {
        ...offersParams,
        product_token: "<redacted>",
        productTokenSha256: sha256(token),
      },
      attempt: evidence.physicalAttempts,
    };
    atomicWriteJson(OUTPUT_PATH, evidence);
    const offersProvider = await oneSearchApiRequest(apiKey, offersParams);
    record.offersProvider = offersProvider.ok
      ? {
          ok: true,
          status: offersProvider.status,
          durationMs: offersProvider.durationMs,
        }
      : {
          ok: false,
          status: offersProvider.status,
          durationMs: offersProvider.durationMs,
          reason: offersProvider.reason,
        };
    record.sanitizedOffersPayload = sanitizedOffersPayload(offersProvider.payload);
    record.verification = verifySearchApiProductOffers({
      target,
      selectedShoppingTitle: tokenSelection.selected.title,
      payload: offersProvider.payload,
    });
    atomicWriteJson(OUTPUT_PATH, evidence);
  }

  evidence.summary = {
    completedTargets: evidence.records.length,
    selectedProductTokens: evidence.records.filter(
      (entry) => entry.tokenSelection.disposition === "selected",
    ).length,
    verifiedOffers: evidence.records.filter(
      (entry) => entry.verification?.disposition === "verified",
    ).length,
    requiredVerifiedOffers: 3,
    finalVerdict: "pending_frozen_human_audit_comparison",
  };
  atomicWriteJson(OUTPUT_PATH, evidence);
  console.log(
    `${target.key}: ${record.verification?.disposition || tokenSelection.disposition}`,
  );
}

evidence.status = "complete";
evidence.completedAt = new Date().toISOString();
const verifiedOffers = evidence.records.filter(
  (record) => record.verification?.disposition === "verified",
).length;
evidence.summary = {
  completedTargets: evidence.records.length,
  physicalAttempts: evidence.physicalAttempts,
  selectedProductTokens: evidence.records.filter(
    (record) => record.tokenSelection.disposition === "selected",
  ).length,
  verifiedOffers,
  requiredVerifiedOffers: 3,
  mechanicalCoveragePass: verifiedOffers >= 3,
  zeroFalseVerified: "requires_frozen_human_audit_comparison",
  finalVerdict: "pending_frozen_human_audit_comparison",
};
atomicWriteJson(OUTPUT_PATH, evidence);
console.log(JSON.stringify(evidence.summary, null, 2));
