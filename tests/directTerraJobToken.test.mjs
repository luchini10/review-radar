import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_JOB_TOKEN_VERSION,
  issueDirectTerraJobToken,
  verifyDirectTerraJobToken,
} from "../lib/directTerraJobToken.ts";
import { DIRECT_TERRA_PROMPT_VERSION } from "../lib/directTerraPrompt.ts";

const secret = "test-only-direct-terra-secret-32-bytes";
const nowMs = 1_789_000_000_000;

describe("direct Terra V2 job capability", () => {
  it("encrypts provider state and round-trips the frozen payload", () => {
    const token = issueDirectTerraJobToken({
      responseId: "resp_direct_123456789",
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash: "a".repeat(64),
      productCategory: "refrigerator",
      secret,
      nowMs,
    });
    const verified = verifyDirectTerraJobToken({
      token,
      secret,
      nowMs: nowMs + 1,
    });

    assert.equal(verified.ok, true);
    assert.equal(verified.payload.version, DIRECT_TERRA_JOB_TOKEN_VERSION);
    assert.equal(verified.payload.responseId, "resp_direct_123456789");
    assert.equal(verified.payload.productCategory, "refrigerator");
    assert.equal(token.includes("resp_direct_123456789"), false);
    assert.equal(token.includes("a".repeat(64)), false);
    assert.equal(token.includes("refrigerator"), false);
  });

  it("rejects tampering, wrong secrets, and expiration", () => {
    const token = issueDirectTerraJobToken({
      responseId: "resp_direct_123456789",
      promptVersion: DIRECT_TERRA_PROMPT_VERSION,
      promptHash: "a".repeat(64),
      productCategory: "refrigerator",
      secret,
      nowMs,
      ttlMs: 1_000,
    });
    const parts = token.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;

    assert.equal(
      verifyDirectTerraJobToken({ token: parts.join("."), secret, nowMs }).ok,
      false,
    );
    assert.equal(
      verifyDirectTerraJobToken({
        token,
        secret: "different-direct-terra-secret-32-bytes",
        nowMs,
      }).ok,
      false,
    );
    assert.deepEqual(
      verifyDirectTerraJobToken({ token, secret, nowMs: nowMs + 1_000 }),
      { ok: false, reason: "expired_token" },
    );
  });
});
