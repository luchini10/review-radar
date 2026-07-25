import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import {
  buildStagedTerraRequestFingerprint,
} from "./stagedTerraContract.ts";
import { STAGED_TERRA_RESEARCH_PROMPT_VERSION } from "./stagedTerraPrompt.ts";
import type { DirectTerraShopperRequest } from "./directTerraPrompt.ts";
import type {
  SelectedSmartFeature,
  SmartFeatureValue,
} from "../types/smart-features.ts";

export const STAGED_TERRA_JOB_TOKEN_VERSION = "staged-terra-job-v1";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_TOKEN_LIFETIME_MS = 30 * 60_000;
const MAXIMUM_TOKEN_LENGTH = 12_000;
const NONCE_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
const KEY_SALT = Buffer.from("ReviewRadar staged Terra token salt v1", "utf8");
const KEY_INFO = Buffer.from("ReviewRadar staged Terra token key v1", "utf8");
const TOKEN_AAD = Buffer.from(STAGED_TERRA_JOB_TOKEN_VERSION, "utf8");
const responseIdPattern = /^resp_[A-Za-z0-9_-]{8,}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const validFeatureTypes = new Set([
  "enum",
  "boolean",
  "number",
  "range",
  "text",
  "exclusion",
]);
const validFeatureOperators = new Set([
  "equals",
  "not_equals",
  "includes",
  "not_includes",
  "lte",
  "gte",
  "between",
  "required",
]);

export type StagedTerraJobTokenPayload = {
  version: typeof STAGED_TERRA_JOB_TOKEN_VERSION;
  responseId: string;
  promptVersion: typeof STAGED_TERRA_RESEARCH_PROMPT_VERSION;
  requestFingerprint: string;
  shopperRequest: DirectTerraShopperRequest;
  issuedAtMs: number;
  expiresAtMs: number;
};

type IssueInput = {
  responseId: string;
  requestFingerprint: string;
  shopperRequest: DirectTerraShopperRequest;
  secret: string;
  nowMs?: number;
  ttlMs?: number;
};

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function validFeatureValue(value: unknown): value is SmartFeatureValue {
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return (
      typeof value !== "number" ||
      Number.isFinite(value)
    ) && (
      typeof value !== "string" ||
      value.length <= 500
    );
  }
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function validSelectedFeature(value: unknown): value is SelectedSmartFeature {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "id",
    "name",
    "type",
    "operator",
    "value",
    "unit",
    "required",
    "source",
  ]);
  return (
    !Object.keys(record).some((key) => !allowed.has(key)) &&
    typeof record.id === "string" &&
    record.id.trim().length > 0 &&
    record.id.length <= 100 &&
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    record.name.length <= 200 &&
    typeof record.type === "string" &&
    validFeatureTypes.has(record.type) &&
    typeof record.operator === "string" &&
    validFeatureOperators.has(record.operator) &&
    validFeatureValue(record.value) &&
    (record.unit === undefined ||
      (typeof record.unit === "string" && record.unit.length <= 50)) &&
    record.required === true &&
    record.source === "smart_features"
  );
}

export function isValidStagedTerraJobTokenSecret(secret: string) {
  return Buffer.byteLength(secret, "utf8") >= MINIMUM_SECRET_BYTES;
}

function keyForSecret(secret: string) {
  if (!isValidStagedTerraJobTokenSecret(secret)) {
    throw new Error("Staged Terra job-token secret must be at least 32 bytes");
  }
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      KEY_SALT,
      KEY_INFO,
      KEY_BYTES,
    ),
  );
}

function validShopperRequest(value: unknown): value is DirectTerraShopperRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    "query",
    "budget",
    "priorities",
    "avoid",
    "selectedFeatures",
  ]);
  if (Object.keys(record).some((key) => !allowed.has(key))) return false;
  if (
    typeof record.query !== "string" ||
    record.query.trim().length === 0 ||
    record.query.length > 200
  ) {
    return false;
  }
  for (const [key, maximum] of [
    ["budget", 500],
    ["priorities", 2_000],
    ["avoid", 2_000],
  ] as const) {
    const field = record[key];
    if (
      field !== undefined &&
      (typeof field !== "string" || field.length > maximum)
    ) {
      return false;
    }
  }
  return (
    record.selectedFeatures === undefined ||
    (Array.isArray(record.selectedFeatures) &&
      record.selectedFeatures.length <= 12 &&
      record.selectedFeatures.every(validSelectedFeature))
  );
}

function encodedTokenLength(payload: StagedTerraJobTokenPayload) {
  const encoded = (bytes: number) =>
    Buffer.alloc(bytes).toString("base64url").length;
  return (
    STAGED_TERRA_JOB_TOKEN_VERSION.length +
    3 +
    encoded(NONCE_BYTES) +
    encoded(Buffer.byteLength(JSON.stringify(payload), "utf8")) +
    encoded(AUTH_TAG_BYTES)
  );
}

export function stagedTerraJobTokenCanCarryShopperRequest({
  shopperRequest,
  nowMs = Date.now(),
  ttlMs = 10 * 60_000,
}: {
  shopperRequest: DirectTerraShopperRequest;
  nowMs?: number;
  ttlMs?: number;
}) {
  if (
    !validShopperRequest(shopperRequest) ||
    !isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !isSafeInteger(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > MAXIMUM_TOKEN_LIFETIME_MS ||
    !Number.isSafeInteger(nowMs + ttlMs)
  ) {
    return false;
  }
  const payload: StagedTerraJobTokenPayload = {
    version: STAGED_TERRA_JOB_TOKEN_VERSION,
    // Reserve a deliberately conservative provider-ID length before spending.
    responseId: `resp_${"x".repeat(251)}`,
    promptVersion: STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    requestFingerprint: buildStagedTerraRequestFingerprint(shopperRequest),
    shopperRequest,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  };
  return encodedTokenLength(payload) <= MAXIMUM_TOKEN_LENGTH;
}

function parsePayload(value: string): StagedTerraJobTokenPayload | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const expected = [
      "expiresAtMs",
      "issuedAtMs",
      "promptVersion",
      "requestFingerprint",
      "responseId",
      "shopperRequest",
      "version",
    ];
    if (
      JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expected)
    ) {
      return null;
    }
    if (
      record.version !== STAGED_TERRA_JOB_TOKEN_VERSION ||
      record.promptVersion !== STAGED_TERRA_RESEARCH_PROMPT_VERSION ||
      !responseIdPattern.test(String(record.responseId ?? "")) ||
      !hashPattern.test(String(record.requestFingerprint ?? "")) ||
      !validShopperRequest(record.shopperRequest) ||
      !isSafeInteger(record.issuedAtMs) ||
      !isSafeInteger(record.expiresAtMs) ||
      record.issuedAtMs < 0 ||
      record.expiresAtMs <= record.issuedAtMs ||
      record.expiresAtMs - record.issuedAtMs > MAXIMUM_TOKEN_LIFETIME_MS
    ) {
      return null;
    }
    if (
      buildStagedTerraRequestFingerprint(record.shopperRequest) !==
      record.requestFingerprint
    ) {
      return null;
    }
    return record as StagedTerraJobTokenPayload;
  } catch {
    return null;
  }
}

export function issueStagedTerraJobToken({
  responseId,
  requestFingerprint,
  shopperRequest,
  secret,
  nowMs = Date.now(),
  ttlMs = 10 * 60_000,
}: IssueInput) {
  const key = keyForSecret(secret);
  if (!responseIdPattern.test(responseId) || responseId.length > 256) {
    throw new Error("Staged Terra job token requires a valid response ID");
  }
  if (
    !hashPattern.test(requestFingerprint) ||
    !validShopperRequest(shopperRequest) ||
    buildStagedTerraRequestFingerprint(shopperRequest) !== requestFingerprint
  ) {
    throw new Error("Staged Terra job token requires a valid shopper request");
  }
  if (
    !isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !isSafeInteger(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > MAXIMUM_TOKEN_LIFETIME_MS ||
    !Number.isSafeInteger(nowMs + ttlMs)
  ) {
    throw new Error("Staged Terra job token requires a valid lifetime");
  }
  const payload: StagedTerraJobTokenPayload = {
    version: STAGED_TERRA_JOB_TOKEN_VERSION,
    responseId,
    promptVersion: STAGED_TERRA_RESEARCH_PROMPT_VERSION,
    requestFingerprint,
    shopperRequest,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  };
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const token = [
    STAGED_TERRA_JOB_TOKEN_VERSION,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
  if (token.length > MAXIMUM_TOKEN_LENGTH) {
    throw new Error("Staged Terra job token exceeds the safe header ceiling");
  }
  return token;
}

export function verifyStagedTerraJobToken({
  token,
  secret,
  nowMs = Date.now(),
}: {
  token: string;
  secret: string;
  nowMs?: number;
}):
  | { ok: true; payload: StagedTerraJobTokenPayload }
  | { ok: false; reason: "invalid_token" | "expired_token" } {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAXIMUM_TOKEN_LENGTH ||
    !isValidStagedTerraJobTokenSecret(secret) ||
    !isSafeInteger(nowMs)
  ) {
    return { ok: false, reason: "invalid_token" };
  }
  const parts = token.split(".");
  if (
    parts.length !== 4 ||
    parts[0] !== STAGED_TERRA_JOB_TOKEN_VERSION
  ) {
    return { ok: false, reason: "invalid_token" };
  }
  try {
    const nonce = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    const authTag = Buffer.from(parts[3], "base64url");
    if (nonce.length !== NONCE_BYTES || authTag.length !== AUTH_TAG_BYTES) {
      return { ok: false, reason: "invalid_token" };
    }
    const decipher = createDecipheriv("aes-256-gcm", keyForSecret(secret), nonce);
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(authTag);
    const payload = parsePayload(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
        "utf8",
      ),
    );
    if (!payload || payload.issuedAtMs > nowMs) {
      return { ok: false, reason: "invalid_token" };
    }
    if (nowMs >= payload.expiresAtMs) {
      return { ok: false, reason: "expired_token" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid_token" };
  }
}
