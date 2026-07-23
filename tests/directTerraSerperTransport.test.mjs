import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING,
  DIRECT_TERRA_SERPER_TIMEOUT_MS,
  DirectTerraSerperTransportError,
  createDirectTerraSerperOrganicTransport,
  createDirectTerraSerperShoppingTransport,
} from "../lib/directTerraSerperTransport.ts";
import {
  DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
  MAX_DIRECT_TERRA_SHOPPING_RESULTS,
} from "../lib/directTerraSerperAssetAdapter.ts";
import {
  DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT,
  MAX_DIRECT_TERRA_ORGANIC_RESULTS,
} from "../lib/directTerraSerperOrganicAdapter.ts";

const apiKey = "test-serper-key-with-enough-length";
const request = {
  endpoint: DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
  body: {
    q: "RIDGID HD1200 shop vacuum",
    gl: "us",
    hl: "en",
    num: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
  },
};
const organicRequest = {
  endpoint: DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT,
  body: {
    q: "RIDGID HD1200 shop vacuum product page",
    gl: "us",
    hl: "en",
    num: MAX_DIRECT_TERRA_ORGANIC_RESULTS,
  },
};

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    ...init,
  });
}

describe("Direct-Terra Serper Shopping server transport", () => {
  it("makes one exact no-cache POST with the process-supplied secret and returns only parsed JSON", async () => {
    const calls = [];
    const transport = createDirectTerraSerperShoppingTransport({
      apiKey,
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return jsonResponse({ shopping: [] });
      },
    });

    const payload = await transport(request);

    assert.deepEqual(payload, { shopping: [] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.redirect, "error");
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
    assert.equal(calls[0].init.headers["X-API-KEY"], apiKey);
    assert.deepEqual(JSON.parse(calls[0].init.body), request.body);
    assert.ok(calls[0].init.signal instanceof AbortSignal);
    assert.equal(JSON.stringify(payload).includes(apiKey), false);
  });

  it("uses the same one-attempt boundary for a fixed organic product-page request", async () => {
    const calls = [];
    const transport = createDirectTerraSerperOrganicTransport({
      apiKey,
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return jsonResponse({ organic: [] });
      },
    });

    assert.deepEqual(await transport(organicRequest), { organic: [] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT);
    assert.deepEqual(JSON.parse(calls[0].init.body), organicRequest.body);
    assert.equal(calls[0].init.redirect, "error");
    assert.equal(calls[0].init.cache, "no-store");
  });

  it("rejects malformed requests and secrets before any HTTP attempt", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return jsonResponse({ shopping: [] });
    };

    assert.throws(
      () => createDirectTerraSerperShoppingTransport({ apiKey: "short", fetchImpl }),
      (error) =>
        error instanceof DirectTerraSerperTransportError &&
        error.code === "invalid_transport_config",
    );
    const transport = createDirectTerraSerperShoppingTransport({ apiKey, fetchImpl });
    await assert.rejects(
      transport({ ...request, endpoint: "https://evil.example/shopping" }),
      (error) =>
        error instanceof DirectTerraSerperTransportError &&
        error.code === "invalid_request",
    );
    await assert.rejects(
      transport({ ...request, body: { ...request.body, q: "x\nX-API-KEY: stolen" } }),
      (error) =>
        error instanceof DirectTerraSerperTransportError &&
        error.code === "invalid_request",
    );
    assert.equal(calls, 0);
  });

  it("never retries HTTP, network, payload, or redirect failures and exposes only reason codes", async () => {
    const cases = [
      async () => new Response("unavailable", { status: 503 }),
      async () => {
        throw new Error(`network failed with ${apiKey}`);
      },
      async () => new Response("not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      async () => jsonResponse({ error: `provider echoed ${apiKey}` }),
    ];

    for (const fetchImpl of cases) {
      let calls = 0;
      const transport = createDirectTerraSerperShoppingTransport({
        apiKey,
        fetchImpl: async (...args) => {
          calls += 1;
          return fetchImpl(...args);
        },
      });
      await assert.rejects(transport(request), (error) => {
        assert.ok(error instanceof DirectTerraSerperTransportError);
        assert.equal(error.message.includes(apiKey), false);
        return true;
      });
      assert.equal(calls, 1);
    }
  });

  it("aborts once at the configured deadline without another attempt", async () => {
    let calls = 0;
    const transport = createDirectTerraSerperShoppingTransport({
      apiKey,
      timeoutMs: 5,
      fetchImpl: async (_url, init) => {
        calls += 1;
        return await new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      },
    });

    await assert.rejects(
      transport(request),
      (error) =>
        error instanceof DirectTerraSerperTransportError &&
        error.code === "request_timeout",
    );
    assert.equal(calls, 1);
  });

  it("rejects missing JSON content type and declared or actual oversized bodies", async () => {
    const cases = [
      async () => new Response("{}", { status: 200 }),
      async () => jsonResponse(
        { shopping: [] },
        { headers: { "content-length": String(DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING + 1) } },
      ),
      async () => new Response(
        "x".repeat(DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING + 1),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ];

    for (const fetchImpl of cases) {
      const transport = createDirectTerraSerperShoppingTransport({ apiKey, fetchImpl });
      await assert.rejects(transport(request), DirectTerraSerperTransportError);
    }
  });

  it("keeps fixed production bounds and has no env, legacy-client, route, or UI dependency", async () => {
    assert.equal(DIRECT_TERRA_SERPER_TIMEOUT_MS, 12_000);
    assert.equal(DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING, 512_000);
    const source = await readFile(
      new URL("../lib/directTerraSerperTransport.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /process\.env|\.env\.local/);
    assert.doesNotMatch(source, /search\/serper|app\/api|components\//);
    assert.doesNotMatch(source, /retry|fallback/i);
  });
});
