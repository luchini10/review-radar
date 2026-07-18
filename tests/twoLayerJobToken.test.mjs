import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  issueTwoLayerJobToken,
  TWO_LAYER_JOB_TOKEN_VERSION,
  verifyTwoLayerJobToken,
} from "../lib/twoLayerJobToken.ts";
import { TWO_LAYER_MASTER_PROMPT_VERSION } from "../lib/twoLayerMasterPrompt.ts";

const secret = "test-only-secret-with-at-least-32-bytes";
const nowMs = 1_789_000_000_000;

function issue(overrides = {}) {
  return issueTwoLayerJobToken({
    responseId: "resp_test_123456789",
    promptVersion: TWO_LAYER_MASTER_PROMPT_VERSION,
    promptHash: "a".repeat(64),
    requirementsHash: "b".repeat(64),
    secret,
    nowMs,
    ttlMs: 10 * 60_000,
    ...overrides,
  });
}

describe("OAI-T4A signed background-job token", () => {
  it("round-trips only the frozen non-shopper fields", () => {
    const token = issue();
    const verified = verifyTwoLayerJobToken({ token, secret, nowMs: nowMs + 1 });

    assert.equal(verified.ok, true);
    assert.deepEqual(verified.payload, {
      version: TWO_LAYER_JOB_TOKEN_VERSION,
      responseId: "resp_test_123456789",
      promptVersion: TWO_LAYER_MASTER_PROMPT_VERSION,
      promptHash: "a".repeat(64),
      requirementsHash: "b".repeat(64),
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + 10 * 60_000,
    });
    assert.equal(token.includes(secret), false);
    assert.equal(token.includes("shopper"), false);
  });

  it("does not expose provider IDs or prompt hashes in client-decodable segments", () => {
    const token = issue();
    const decodedSegments = token.split(".").map((segment) =>
      Buffer.from(segment, "base64url").toString("utf8"),
    );

    assert.equal(token.includes("resp_test_123456789"), false);
    assert.equal(decodedSegments.some((value) => value.includes("resp_test_123456789")), false);
    assert.equal(decodedSegments.some((value) => value.includes("a".repeat(64))), false);
    assert.equal(decodedSegments.some((value) => value.includes("b".repeat(64))), false);
  });

  it("rejects ciphertext, nonce, and authentication-tag tampering", () => {
    const token = issue();
    const parts = token.split(".");
    assert.equal(parts.length, 4);

    for (const index of [1, 2, 3]) {
      const tamperedParts = [...parts];
      const first = tamperedParts[index][0];
      tamperedParts[index] = `${first === "A" ? "B" : "A"}${tamperedParts[index].slice(1)}`;
      assert.deepEqual(
        verifyTwoLayerJobToken({ token: tamperedParts.join("."), secret, nowMs }),
        { ok: false, reason: "invalid_token" },
      );
    }
  });

  it("rejects the wrong secret and expired tokens", () => {
    const token = issue();
    assert.deepEqual(
      verifyTwoLayerJobToken({
        token,
        secret: "different-test-secret-with-at-least-32-bytes",
        nowMs,
      }),
      { ok: false, reason: "invalid_token" },
    );
    assert.deepEqual(
      verifyTwoLayerJobToken({
        token,
        secret,
        nowMs: nowMs + 10 * 60_000,
      }),
      { ok: false, reason: "expired_token" },
    );
  });

  it("rejects malformed tokens without throwing", () => {
    for (const token of ["", "abc", "abc.def.ghi", ".", "not-base64.abc"]) {
      assert.deepEqual(
        verifyTwoLayerJobToken({ token, secret, nowMs }),
        { ok: false, reason: "invalid_token" },
      );
    }
  });

  it("refuses weak secrets, invalid response IDs, and excessive lifetimes", () => {
    assert.throws(() => issue({ secret: "too-short" }), /at least 32 bytes/);
    assert.throws(() => issue({ responseId: "not-a-response-id" }), /response ID/);
    assert.throws(() => issue({ requirementsHash: "not-a-hash" }), /requirements hash/);
    assert.throws(() => issue({ ttlMs: 31 * 60_000 }), /lifetime/);
  });
});
