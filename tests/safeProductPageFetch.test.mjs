import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fetchSafeProductPage,
  isPublicProductPageAddress,
} from "../lib/safeProductPageFetch.ts";

const config = {
  allowedContentTypes: ["text/html"],
  maxBytes: 1_024,
  maxRedirects: 2,
  timeoutMs: 500,
};

function response(body, overrides = {}) {
  return {
    body: Buffer.from(body),
    headers: { "content-type": "text/html; charset=utf-8" },
    status: 200,
    ...overrides,
  };
}

describe("safe product page fetch", () => {
  it("allows public IPs and rejects local, private, reserved, and mapped addresses", () => {
    assert.equal(isPublicProductPageAddress("8.8.8.8"), true);
    assert.equal(isPublicProductPageAddress("2606:4700:4700::1111"), true);
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "192.168.1.1",
      "203.0.113.4",
      "::1",
      "::ffff:127.0.0.1",
    ]) {
      assert.equal(isPublicProductPageAddress(address), false, address);
    }
  });

  it("rejects unsafe URL forms before resolution or transport", async () => {
    let resolutions = 0;
    let transports = 0;
    const dependencies = {
      resolveHost: async () => {
        resolutions += 1;
        return ["8.8.8.8"];
      },
      transport: async () => {
        transports += 1;
        return response("unused");
      },
    };
    const cases = new Map([
      ["file:///etc/passwd", "invalid_url"],
      ["https://user:secret@shop.example/product", "credentials_forbidden"],
      ["https://shop.example:8443/product", "non_default_port"],
    ]);

    for (const [url, reason] of cases) {
      const result = await fetchSafeProductPage(url, dependencies, config);
      assert.equal(result.ok, false);
      assert.equal(result.reason, reason);
    }
    assert.equal(resolutions, 0);
    assert.equal(transports, 0);
  });

  it("blocks private DNS and revalidates every redirect host", async () => {
    let transports = 0;
    const direct = await fetchSafeProductPage(
      "https://private.example/product",
      {
        resolveHost: async () => ["127.0.0.1"],
        transport: async () => {
          transports += 1;
          return response("unused");
        },
      },
      config,
    );
    assert.equal(direct.reason, "non_public_address");
    assert.equal(transports, 0);

    const redirected = await fetchSafeProductPage(
      "https://public.example/product",
      {
        resolveHost: async (host) =>
          host === "public.example" ? ["8.8.8.8"] : ["10.0.0.2"],
        transport: async () => {
          transports += 1;
          return response("", {
            headers: { location: "https://internal.example/secret" },
            status: 302,
          });
        },
      },
      config,
    );
    assert.equal(redirected.reason, "non_public_address");
    assert.equal(transports, 1);
  });

  it("enforces redirect, content-type, and byte limits", async () => {
    const publicDns = async () => ["8.8.8.8"];
    const redirect = await fetchSafeProductPage(
      "https://shop.example/a",
      {
        resolveHost: publicDns,
        transport: async ({ url }) =>
          response("", {
            headers: { location: new URL("/next", url).toString() },
            status: 302,
          }),
      },
      { ...config, maxRedirects: 1 },
    );
    assert.equal(redirect.reason, "redirect_limit_exceeded");

    const type = await fetchSafeProductPage(
      "https://shop.example/product",
      {
        resolveHost: publicDns,
        transport: async () =>
          response("pdf", {
            headers: { "content-type": "application/pdf" },
          }),
      },
      config,
    );
    assert.equal(type.reason, "unsupported_content_type");

    const large = await fetchSafeProductPage(
      "https://shop.example/product",
      {
        resolveHost: publicDns,
        transport: async () =>
          response("x".repeat(2_000), { bodyTruncated: true }),
      },
      config,
    );
    assert.equal(large.reason, "response_too_large");
  });

  it("returns bounded HTML and final redirect identity", async () => {
    const result = await fetchSafeProductPage(
      "https://shop.example/start",
      {
        resolveHost: async () => ["8.8.8.8"],
        transport: async ({ url }) =>
          url.pathname === "/start"
            ? response("", {
                headers: { location: "/products/acer-xv272u" },
                status: 302,
              })
            : response("<html><h1>Acer XV272U</h1></html>"),
      },
      config,
    );

    assert.equal(result.ok, true);
    assert.equal(result.redirectCount, 1);
    assert.equal(
      result.finalUrl,
      "https://shop.example/products/acer-xv272u",
    );
    assert.match(result.body, /Acer XV272U/);
  });
});
