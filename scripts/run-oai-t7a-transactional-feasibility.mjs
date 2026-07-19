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
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

import {
  SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
  searchApiOffersRequestParams,
  searchApiShoppingRequestParams,
  selectSearchApiProductToken,
  verifySearchApiProductOffers,
} from "../lib/autonomousCommerceVerifier.ts";
import { normalizeTwoLayerSourceUrl } from "../lib/twoLayerSourceUrl.ts";

export const T7A_APPROVAL_ID = "oai-t7a-saved-shop-vac-offer-feasibility-v1";
export const T7A_MAX_PHYSICAL_ATTEMPTS = 10;
export const T7A_REQUIRED_VERIFIED_OFFERS = 3;
export const T7A_INPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-t6d-v2-citation-granular-smoke-97a2a96/broad-shop-vac.run1.json",
);
export const T7A_INPUT_SHA256 =
  "477c9e957de2121dc44e3dde03aec38eebdb8814648e510553a52b7eca1faad1";
export const T7A_REPORT_SHA256 =
  "0019b4d7d08ef39b2cc6c452d410fa7e92f712627f40373a9b2fc15e8dfc5196";
export const T7A_OUTPUT_PATH = resolve(
  "tests/fixtures/review-radar-live/oai-t7a-transactional-feasibility/result.json",
);

export const T7A_TARGETS = Object.freeze([
  Object.freeze({
    key: "rank-1-DXV12P-QT",
    rank: 1,
    brand: "DEWALT",
    productName: "Stealthsonic Quiet 12-Gallon 5.5 PHP Wet/Dry Vacuum",
    model: "DXV12P-QT",
    category: "shop vac",
  }),
  Object.freeze({
    key: "rank-2-CMXEVBE17595",
    rank: 2,
    brand: "CRAFTSMAN",
    productName: "16-Gallon 6.5 Peak HP Corded Wet/Dry Shop Vac",
    model: "CMXEVBE17595",
    category: "shop vac",
  }),
  Object.freeze({
    key: "rank-3-VFB511B-0202",
    rank: 3,
    brand: "Vacmaster",
    productName: "Professional Beast Series VFB511B 0202, 5-Gallon 6 Peak HP Wet/Dry Vacuum",
    model: "VFB511B 0202",
    category: "shop vac",
  }),
  Object.freeze({
    key: "rank-4-HD1600",
    rank: 4,
    brand: "RIDGID",
    productName: "16-Gallon 6.5 Peak HP NXT Wet/Dry Vacuum with Detachable Blower",
    model: "HD1600",
    category: "shop vac",
  }),
  Object.freeze({
    key: "rank-5-0910-20",
    rank: 5,
    brand: "Milwaukee",
    productName: "M18 FUEL NEXUS 6-Gallon Wet/Dry Vacuum",
    model: "0910-20",
    category: "shop vac",
  }),
]);

const ENDPOINT = "https://www.searchapi.io/api/v1/search";
const TIMEOUT_MS = 12_000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function atomicWriteJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
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

function canonicalEvidenceUrl(value) {
  const url = stringValue(value).slice(0, 1200);
  if (!url) return null;
  try {
    return normalizeTwoLayerSourceUrl(url);
  } catch {
    return null;
  }
}

export function t7aPreflightPlan(commit = "UNCOMMITTED") {
  return {
    mode: "dry-run",
    version: "oai-t7a-transactional-feasibility-v1",
    approvalId: T7A_APPROVAL_ID,
    verifierVersion: SEARCHAPI_PRODUCT_OFFERS_VERIFIER_VERSION,
    commit,
    source: {
      inputPath: T7A_INPUT_PATH,
      inputSha256: T7A_INPUT_SHA256,
      reportSha256: T7A_REPORT_SHA256,
      capturedAtCommit: "97a2a96",
    },
    outputPath: T7A_OUTPUT_PATH,
    endpoint: ENDPOINT,
    bounds: {
      targets: T7A_TARGETS.length,
      shoppingRequests: T7A_TARGETS.length,
      offersRequests: `up to ${T7A_TARGETS.length}; only after an exact token selection`,
      physicalAttempts: T7A_MAX_PHYSICAL_ATTEMPTS,
      retries: 0,
      fallbacks: 0,
      replacements: 0,
      additionalQueries: 0,
      directPageFetches: 0,
      openAiCalls: 0,
      serperCalls: 0,
      timeoutMs: TIMEOUT_MS,
    },
    passRule: {
      requiredVerifiedOffers: T7A_REQUIRED_VERIFIED_OFFERS,
      unsafeVerifiedOffersAllowed: 0,
      finalVerdictRequiresFrozenHumanAudit: true,
    },
    targets: T7A_TARGETS.map((target) => ({
      ...target,
      shoppingRequest: searchApiShoppingRequestParams(target),
      offersRequestTemplate: {
        ...searchApiOffersRequestParams("<provider-token-from-exact-shopping-entity>"),
        product_token: "<redacted; token bound to selected Shopping entity>",
      },
    })),
  };
}

export function validateT7aSavedFixture(inputText) {
  if (sha256(inputText) !== T7A_INPUT_SHA256) {
    throw new Error("saved T6D fixture hash does not match the frozen input");
  }
  const fixture = JSON.parse(inputText);
  const report = fixture?.result?.reportMarkdown;
  if (typeof report !== "string" || sha256(report) !== T7A_REPORT_SHA256) {
    throw new Error("saved T6D report hash does not match the frozen report");
  }
  if (
    fixture?.outcome?.status !== "passed" ||
    fixture?.result?.pipeline !== "direct_terra" ||
    fixture?.result?.transactionalStatus !== "unverified"
  ) {
    throw new Error("saved T6D fixture is not the passed unverified direct-Terra result");
  }
  for (const target of T7A_TARGETS) {
    const headingPrefix = `### #${target.rank} Best Match`;
    const heading = report
      .split(/\r?\n/)
      .find((line) => line.startsWith(headingPrefix));
    if (!heading || !heading.includes(target.brand) || !heading.includes(target.model)) {
      throw new Error(`saved T6D heading does not bind ${target.key}`);
    }
  }
  return { fixture, report };
}

export function validateT7aExecution(input) {
  if (input.approvalId !== T7A_APPROVAL_ID) {
    throw new Error(`live T7A requires --approval-id=${T7A_APPROVAL_ID}`);
  }
  if (input.approvedAttempts !== T7A_MAX_PHYSICAL_ATTEMPTS) {
    throw new Error(
      `live T7A requires --approved-attempts=${T7A_MAX_PHYSICAL_ATTEMPTS}`,
    );
  }
  if (!/^[a-f0-9]{7,40}$/i.test(input.approvedCommit || "")) {
    throw new Error("live T7A requires --approved-commit=<commit>");
  }
  if (!input.currentCommit.startsWith(input.approvedCommit)) {
    throw new Error("current commit does not match the approved T7A commit");
  }
  if (input.trackedStatus.trim()) {
    throw new Error("tracked worktree must be clean before live T7A");
  }
  if (input.outputExists) {
    throw new Error("refusing to repeat T7A because its evidence path already exists");
  }
}

export function sanitizedShoppingPayload(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.shopping_results)) {
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

export function sanitizedOffersPayload(payload) {
  const product =
    payload?.product && typeof payload.product === "object" && !Array.isArray(payload.product)
      ? {
          title: stringValue(payload.product.title).slice(0, 300),
          brand: stringValue(payload.product.brand).slice(0, 120),
        }
      : null;
  if (!product || !Array.isArray(payload?.offers)) {
    return { schema: "invalid", product, offers: [] };
  }
  return {
    schema: "product_and_offers_array",
    product,
    offers: payload.offers.map((offer, index) => ({
      position: numberValue(offer?.position) ?? index + 1,
      title: stringValue(offer?.title).slice(0, 300),
      link: canonicalEvidenceUrl(offer?.link),
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

export function sanitizedOfferVerification(verification) {
  if (!verification || typeof verification !== "object") return null;
  return {
    ...verification,
    decisions: Array.isArray(verification.decisions)
      ? verification.decisions.map((decision) => ({
          ...decision,
          productUrl: canonicalEvidenceUrl(decision?.productUrl),
        }))
      : [],
    offer: verification.offer
      ? {
          ...verification.offer,
          productUrl: canonicalEvidenceUrl(verification.offer.productUrl),
        }
      : null,
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

function loadSearchApiKey() {
  if (process.env.SEARCHAPI_API_KEY?.trim()) return process.env.SEARCHAPI_API_KEY.trim();
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return "";
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("SEARCHAPI_API_KEY="));
  if (!line) return "";
  return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
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

function summaryFor(evidence, complete = false) {
  const verifiedOffers = evidence.records.filter(
    (record) => record.verification?.disposition === "verified",
  ).length;
  return {
    completedTargets: evidence.records.length,
    physicalAttempts: evidence.physicalAttempts,
    selectedProductTokens: evidence.records.filter(
      (record) => record.tokenSelection.disposition === "selected",
    ).length,
    verifiedOffers,
    requiredVerifiedOffers: T7A_REQUIRED_VERIFIED_OFFERS,
    mechanicalCoveragePass: complete
      ? verifiedOffers >= T7A_REQUIRED_VERIFIED_OFFERS
      : null,
    zeroFalseVerified: "requires_frozen_human_audit_comparison",
    finalVerdict: "pending_frozen_human_audit_comparison",
  };
}

async function main() {
  const execute = process.argv.includes("--execute");
  const currentCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const inputText = readFileSync(T7A_INPUT_PATH, "utf8");
  validateT7aSavedFixture(inputText);
  const plan = t7aPreflightPlan(currentCommit);

  if (!execute) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const argumentValue = (name) =>
    process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";
  const trackedStatus = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf8" },
  );
  validateT7aExecution({
    approvalId: argumentValue("--approval-id"),
    approvedAttempts: Number(argumentValue("--approved-attempts")),
    approvedCommit: argumentValue("--approved-commit"),
    currentCommit,
    trackedStatus,
    outputExists: existsSync(T7A_OUTPUT_PATH),
  });
  const apiKey = loadSearchApiKey();
  if (!apiKey) throw new Error("SEARCHAPI_API_KEY is unavailable");

  const evidence = {
    ...plan,
    mode: "execute",
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    physicalAttempts: 0,
    records: [],
    summary: null,
  };
  atomicWriteJson(T7A_OUTPUT_PATH, evidence);

  for (const target of T7A_TARGETS) {
    if (evidence.physicalAttempts >= T7A_MAX_PHYSICAL_ATTEMPTS) {
      throw new Error("T7A attempt ceiling reached before Shopping request");
    }
    const shoppingParams = searchApiShoppingRequestParams(target);
    evidence.physicalAttempts += 1;
    atomicWriteJson(T7A_OUTPUT_PATH, evidence);
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
      shoppingProvider: {
        ok: shoppingProvider.ok,
        status: shoppingProvider.status,
        durationMs: shoppingProvider.durationMs,
        ...(shoppingProvider.ok ? {} : { reason: shoppingProvider.reason }),
      },
      sanitizedShoppingPayload: sanitizedShoppingPayload(shoppingProvider.payload),
      tokenSelection: sanitizedTokenSelection(tokenSelection),
      offersRequest: null,
      offersProvider: null,
      sanitizedOffersPayload: null,
      verification: null,
    };
    evidence.records.push(record);
    atomicWriteJson(T7A_OUTPUT_PATH, evidence);

    if (shoppingProvider.ok && tokenSelection.selected) {
      if (evidence.physicalAttempts >= T7A_MAX_PHYSICAL_ATTEMPTS) {
        throw new Error("T7A attempt ceiling reached before Offers request");
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
      atomicWriteJson(T7A_OUTPUT_PATH, evidence);
      const offersProvider = await oneSearchApiRequest(apiKey, offersParams);
      record.offersProvider = {
        ok: offersProvider.ok,
        status: offersProvider.status,
        durationMs: offersProvider.durationMs,
        ...(offersProvider.ok ? {} : { reason: offersProvider.reason }),
      };
      record.sanitizedOffersPayload = sanitizedOffersPayload(offersProvider.payload);
      record.verification = sanitizedOfferVerification(
        verifySearchApiProductOffers({
          target,
          selectedShoppingTitle: tokenSelection.selected.title,
          payload: offersProvider.payload,
        }),
      );
    }

    evidence.summary = summaryFor(evidence);
    atomicWriteJson(T7A_OUTPUT_PATH, evidence);
    console.log(`${target.key}: ${record.verification?.disposition || tokenSelection.disposition}`);
  }

  evidence.status = "complete";
  evidence.completedAt = new Date().toISOString();
  evidence.summary = summaryFor(evidence, true);
  atomicWriteJson(T7A_OUTPUT_PATH, evidence);
  console.log(JSON.stringify(evidence.summary, null, 2));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  await main();
}
