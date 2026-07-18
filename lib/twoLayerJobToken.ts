import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { TWO_LAYER_MASTER_PROMPT_VERSION } from "./twoLayerMasterPrompt.ts";

export const TWO_LAYER_JOB_TOKEN_VERSION = "oai-two-layer-job-v3";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_TOKEN_LIFETIME_MS = 30 * 60_000;
const MAXIMUM_TOKEN_LENGTH = 2_048;
const TOKEN_NONCE_BYTES = 12;
const TOKEN_AUTH_TAG_BYTES = 16;
const TOKEN_KEY_BYTES = 32;
const TOKEN_KEY_SALT = Buffer.from(
  "ReviewRadar two-layer job token salt v1",
  "utf8",
);
const TOKEN_KEY_INFO = Buffer.from(
  "ReviewRadar two-layer job token encryption v3",
  "utf8",
);
const TOKEN_AAD = Buffer.from(TWO_LAYER_JOB_TOKEN_VERSION, "utf8");
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

function tokenKey(secret: string) {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      TOKEN_KEY_SALT,
      TOKEN_KEY_INFO,
      TOKEN_KEY_BYTES,
    ),
  );
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

function parsePayload(decoded: string): TwoLayerJobTokenPayload | null {
  try {
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
  const nonce = randomBytes(TOKEN_NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(secret), nonce, {
    authTagLength: TOKEN_AUTH_TAG_BYTES,
  });
  cipher.setAAD(TOKEN_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    TWO_LAYER_JOB_TOKEN_VERSION,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
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
  if (
    parts.length !== 4 ||
    parts[0] !== TWO_LAYER_JOB_TOKEN_VERSION ||
    !parts[1] ||
    !parts[2] ||
    !parts[3]
  ) {
    return { ok: false, reason: "invalid_token" };
  }

  let payload: TwoLayerJobTokenPayload | null = null;
  try {
    const nonce = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    const authTag = Buffer.from(parts[3], "base64url");
    if (
      nonce.length !== TOKEN_NONCE_BYTES ||
      ciphertext.length === 0 ||
      authTag.length !== TOKEN_AUTH_TAG_BYTES
    ) {
      return { ok: false, reason: "invalid_token" };
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      tokenKey(secret),
      nonce,
      { authTagLength: TOKEN_AUTH_TAG_BYTES },
    );
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    payload = parsePayload(plaintext);
  } catch {
    return { ok: false, reason: "invalid_token" };
  }

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
