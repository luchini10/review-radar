import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readBoundedJsonBody } from "../lib/boundedJsonRequest.ts";

function request(body, headers = {}) {
  return new Request("http://localhost/test", {
    body,
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST",
  });
}

describe("bounded JSON request reader", () => {
  it("rejects declared and actual oversized bodies", async () => {
    const declared = await readBoundedJsonBody(
      request('{"ok":true}', { "Content-Length": "17" }),
      { maxBytes: 16 },
    );
    const actual = await readBoundedJsonBody(
      request(`{"value":"${"x".repeat(20)}"}`),
      { maxBytes: 16 },
    );

    assert.deepEqual(declared, { ok: false, reason: "body_too_large" });
    assert.deepEqual(actual, { ok: false, reason: "body_too_large" });
  });

  it("rejects malformed content length before reading", async () => {
    const result = await readBoundedJsonBody(
      request('{"ok":true}', { "Content-Length": "not-a-number" }),
      { maxBytes: 100 },
    );

    assert.deepEqual(result, { ok: false, reason: "invalid_content_length" });
  });

  it("counts UTF-8 bytes and accepts an exact-boundary valid body", async () => {
    const body = JSON.stringify({ value: "é" });
    const byteLength = Buffer.byteLength(body);
    const accepted = await readBoundedJsonBody(request(body), {
      maxBytes: byteLength,
    });
    const rejected = await readBoundedJsonBody(request(body), {
      maxBytes: byteLength - 1,
    });

    assert.deepEqual(accepted, {
      ok: true,
      byteLength,
      value: { value: "é" },
    });
    assert.deepEqual(rejected, { ok: false, reason: "body_too_large" });
  });

  it("distinguishes invalid JSON within the bounded envelope", async () => {
    const result = await readBoundedJsonBody(request("{"), { maxBytes: 16 });

    assert.deepEqual(result, { ok: false, reason: "invalid_json" });
  });
});
