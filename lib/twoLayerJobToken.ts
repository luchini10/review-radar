import { createHmac, timingSafeEqual } from "node:crypto";

import { TWO_LAYER_MASTER_PROMPT_VERSION } from "./twoLayerMasterPrompt.ts";

export const TWO_LAYER_JOB_TOKEN_VERSION = "oai-two-layer-job-v2";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_TOKEN_LIFETIME_MS = 30 * 60_000;
const MAXIMUM_TOKEN_LENGTH = 2_048;
const responseIdPattern = /^resp_[A-Za-z0-9_-]{8,}$/;
const promptHashPattern = /^[a-f0-9]{64}$/;

export type TwoLayerJobTokenPayload = {
  version: typeof TWO_LAYER_JOB_TOKEN_VERSION;
  responseId: string;
  promptVersion: typeof TWO_LAYER_MASTER_PROMPT_VERSION;
  promptHash: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

type IssueTokenInput = {
  responseId: string;
  promptVersion: string;
  promptHash: string;
  secret: string;
  nowMs?: number;
  ttlMs?: number;
};

type VerifyTokenInput = {
  token: string;
  secret: string;
  nowMs?: number;
};

function secretBytes(secret: string) {
  return Buffer.byteLength(secret, "utf8");
}

export function isValidTwoLayerJobTokenSecret(secret: string) {
  return secretBytes(secret) >= MINIMUM_SECRET_BYTES;
}

function assertSecret(secret: string) {
  if (!isValidTwoLayerJobTokenSecret(secret)) {
    throw new Error("Two-layer job-token secret must be at least 32 bytes");
  }
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function encodePayload(payload: TwoLayerJobTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

function payloadHasExactKeys(value: Record<string, unknown>) {
  const expected = [
    "expiresAtMs",
    "issuedAtMs",
    "promptHash",
    "promptVersion",
    "responseId",
    "version",
  ];
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function parsePayload(encodedPayload: string): TwoLayerJobTokenPayload | null {
  try {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const value: unknown = JSON.parse(decoded);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (!payloadHasExactKeys(record)) return null;
    if (record.version !== TWO_LAYER_JOB_TOKEN_VERSION) return null;
    if (!responseIdPattern.test(String(record.responseId ?? ""))) return null;
    if (record.promptVersion !== TWO_LAYER_MASTER_PROMPT_VERSION) return null;
    if (!isTwoLayerPromptHash(String(record.promptHash ?? ""))) return null;
    if (!isSafeInteger(record.issuedAtMs) || !isSafeInteger(record.expiresAtMs)) {
      return null;
    }
    if (record.issuedAtMs < 0 || record.expiresAtMs <= record.issuedAtMs) return null;
    if (record.expiresAtMs - record.issuedAtMs > MAXIMUM_TOKEN_LIFETIME_MS) {
      return null;
    }
    return record as TwoLayerJobTokenPayload;
  } catch {
    return null;
  }
}

export function issueTwoLayerJobToken({
  responseId,
  promptVersion,
  promptHash,
  secret,
  nowMs = Date.now(),
  ttlMs = 10 * 60_000,
}: IssueTokenInput) {
  assertSecret(secret);
  if (!responseIdPattern.test(responseId)) {
    throw new Error("Two-layer job token requires a valid OpenAI response ID");
  }
  if (promptVersion !== TWO_LAYER_MASTER_PROMPT_VERSION) {
    throw new Error("Two-layer job token requires the current prompt version");
  }
  if (!isTwoLayerPromptHash(promptHash)) {
    throw new Error("Two-layer job token requires a valid prompt hash");
  }
  if (!isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("Two-layer job token requires a valid issue time");
  }
  if (
    !isSafeInteger(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > MAXIMUM_TOKEN_LIFETIME_MS ||
    !Number.isSafeInteger(nowMs + ttlMs)
  ) {
    throw new Error("Two-layer job token lifetime must be 30 minutes or less");
  }

  const payload: TwoLayerJobTokenPayload = {
    version: TWO_LAYER_JOB_TOKEN_VERSION,
    responseId,
    promptVersion: TWO_LAYER_MASTER_PROMPT_VERSION,
    promptHash,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  };
  const encodedPayload = encodePayload(payload);
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyTwoLayerJobToken({
  token,
  secret,
  nowMs = Date.now(),
}: VerifyTokenInput):
  | { ok: true; payload: TwoLayerJobTokenPayload }
  | { ok: false; reason: "invalid_token" | "expired_token" } {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAXIMUM_TOKEN_LENGTH ||
    !isValidTwoLayerJobTokenSecret(secret) ||
    !isSafeInteger(nowMs) ||
    nowMs < 0
  ) {
    return { ok: false, reason: "invalid_token" };
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "invalid_token" };
  }

  const expected = Buffer.from(signPayload(parts[0], secret), "utf8");
  const provided = Buffer.from(parts[1], "utf8");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "invalid_token" };
  }

  const payload = parsePayload(parts[0]);
  if (!payload || payload.issuedAtMs > nowMs) {
    return { ok: false, reason: "invalid_token" };
  }
  if (nowMs >= payload.expiresAtMs) {
    return { ok: false, reason: "expired_token" };
  }
  return { ok: true, payload };
}

export function isTwoLayerPromptHash(value: string) {
  return promptHashPattern.test(value);
}
