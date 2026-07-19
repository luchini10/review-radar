import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { DIRECT_TERRA_PROMPT_VERSION } from "./directTerraPrompt.ts";

export const DIRECT_TERRA_JOB_TOKEN_VERSION = "direct-terra-job-v1";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_TOKEN_LIFETIME_MS = 30 * 60_000;
const MAXIMUM_TOKEN_LENGTH = 2_048;
const NONCE_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
const KEY_SALT = Buffer.from("ReviewRadar direct Terra token salt v1", "utf8");
const KEY_INFO = Buffer.from("ReviewRadar direct Terra token key v1", "utf8");
const TOKEN_AAD = Buffer.from(DIRECT_TERRA_JOB_TOKEN_VERSION, "utf8");
const responseIdPattern = /^resp_[A-Za-z0-9_-]{8,}$/;
const hashPattern = /^[a-f0-9]{64}$/;

export type DirectTerraJobTokenPayload = {
  version: typeof DIRECT_TERRA_JOB_TOKEN_VERSION;
  responseId: string;
  promptVersion: typeof DIRECT_TERRA_PROMPT_VERSION;
  promptHash: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

type IssueInput = {
  responseId: string;
  promptVersion: string;
  promptHash: string;
  secret: string;
  nowMs?: number;
  ttlMs?: number;
};

type VerifyInput = {
  token: string;
  secret: string;
  nowMs?: number;
};

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function isValidDirectTerraJobTokenSecret(secret: string) {
  return Buffer.byteLength(secret, "utf8") >= MINIMUM_SECRET_BYTES;
}

export function isDirectTerraPromptHash(value: string) {
  return hashPattern.test(value);
}

function keyForSecret(secret: string) {
  if (!isValidDirectTerraJobTokenSecret(secret)) {
    throw new Error("Direct Terra job-token secret must be at least 32 bytes");
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

function parsePayload(text: string): DirectTerraJobTokenPayload | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const expectedKeys = [
      "expiresAtMs",
      "issuedAtMs",
      "promptHash",
      "promptVersion",
      "responseId",
      "version",
    ];
    if (
      JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expectedKeys)
    ) {
      return null;
    }
    if (record.version !== DIRECT_TERRA_JOB_TOKEN_VERSION) return null;
    if (!responseIdPattern.test(String(record.responseId ?? ""))) return null;
    if (record.promptVersion !== DIRECT_TERRA_PROMPT_VERSION) return null;
    if (!isDirectTerraPromptHash(String(record.promptHash ?? ""))) return null;
    if (!isSafeInteger(record.issuedAtMs) || !isSafeInteger(record.expiresAtMs)) {
      return null;
    }
    if (
      record.issuedAtMs < 0 ||
      record.expiresAtMs <= record.issuedAtMs ||
      record.expiresAtMs - record.issuedAtMs > MAXIMUM_TOKEN_LIFETIME_MS
    ) {
      return null;
    }
    return record as DirectTerraJobTokenPayload;
  } catch {
    return null;
  }
}

export function issueDirectTerraJobToken({
  responseId,
  promptVersion,
  promptHash,
  secret,
  nowMs = Date.now(),
  ttlMs = 10 * 60_000,
}: IssueInput) {
  const key = keyForSecret(secret);
  if (!responseIdPattern.test(responseId)) {
    throw new Error("Direct Terra job token requires a valid response ID");
  }
  if (promptVersion !== DIRECT_TERRA_PROMPT_VERSION) {
    throw new Error("Direct Terra job token requires the current prompt version");
  }
  if (!isDirectTerraPromptHash(promptHash)) {
    throw new Error("Direct Terra job token requires a valid prompt hash");
  }
  if (!isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("Direct Terra job token requires a valid issue time");
  }
  if (
    !isSafeInteger(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > MAXIMUM_TOKEN_LIFETIME_MS ||
    !Number.isSafeInteger(nowMs + ttlMs)
  ) {
    throw new Error("Direct Terra job token lifetime must be 30 minutes or less");
  }

  const payload: DirectTerraJobTokenPayload = {
    version: DIRECT_TERRA_JOB_TOKEN_VERSION,
    responseId,
    promptVersion: DIRECT_TERRA_PROMPT_VERSION,
    promptHash,
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
  const authTag = cipher.getAuthTag();
  return [
    DIRECT_TERRA_JOB_TOKEN_VERSION,
    nonce.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

export function verifyDirectTerraJobToken({
  token,
  secret,
  nowMs = Date.now(),
}: VerifyInput):
  | { ok: true; payload: DirectTerraJobTokenPayload }
  | { ok: false; reason: "invalid_token" | "expired_token" } {
  if (
    !isValidDirectTerraJobTokenSecret(secret) ||
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAXIMUM_TOKEN_LENGTH ||
    !isSafeInteger(nowMs)
  ) {
    return { ok: false, reason: "invalid_token" };
  }
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== DIRECT_TERRA_JOB_TOKEN_VERSION) {
    return { ok: false, reason: "invalid_token" };
  }

  try {
    const nonce = Buffer.from(parts[1], "base64url");
    const ciphertext = Buffer.from(parts[2], "base64url");
    const authTag = Buffer.from(parts[3], "base64url");
    if (nonce.length !== NONCE_BYTES || authTag.length !== AUTH_TAG_BYTES) {
      return { ok: false, reason: "invalid_token" };
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyForSecret(secret),
      nonce,
    );
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
