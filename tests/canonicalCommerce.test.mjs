import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  canonicalCommerceTestExports,
  fetchCanonicalCommerceOffers,
  searchCanonicalCommerceProducts,
} from "../lib/canonicalCommerce.ts";

const originalApiKey = process.env.SERPAPI_API_KEY;
const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.SERPAPI_API_KEY;
  else process.env.SERPAPI_API_KEY = originalApiKey;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

beforeEach(() => {
  process.env.NODE_ENV = "test";
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function shoppingPayload() {
  return {
    search_metadata: { status: "Success" },
    shopping_results: [
      {
        extracted_price: 249.99,
        extensions: ["Free delivery"],
        immersive_product_page_token: "token-alpha-a100",
        position: 1,
        product_id: "google-product-100",
        product_link:
          "https://www.google.com/shopping/product/google-product-100?gl=us",
        rating: 4.6,
        reviews: 1000,
        source: "Example Store",
        thumbnail: "https://cdn.example/alpha-a100.jpg",
        title: "Alpha A100 Robot Vacuum",
      },
      {
        extracted_price: 219,
        product_id: "missing-token",
        product_link:
          "https://www.google.com/shopping/product/missing-token?gl=us",
        title: "Alpha A90 Robot Vacuum",
      },
    ],
  };
}

function offersPayload() {
  return {
    product_results: {
      brand: "Alpha",
      rating: 4.6,
      reviews: 1000,
      stores: [
        {
          details_and_offers: ["In stock online", "Free delivery"],
          extracted_price: 239.99,
          link: "https://shop.example/products/alpha-a100",
          name: "Example Store",
          title: "Alpha A100 Robot Vacuum",
        },
        {
          details_and_offers: ["Out of stock"],
          extracted_price: 229.99,
          link: "https://soldout.example/products/alpha-a100",
          name: "Sold Out Store",
          title: "Alpha A100 Robot Vacuum",
        },
        {
          details_and_offers: ["Free delivery"],
          extracted_price: 244.99,
          link: "https://unknown.example/products/alpha-a100",
          name: "Unknown Store",
          title: "Alpha A100 Robot Vacuum",
        },
        {
          details_and_offers: ["In stock"],
          extracted_price: 10,
          link: "javascript:alert(1)",
          name: "Unsafe Store",
          title: "Alpha A100 Robot Vacuum",
        },
      ],
      title: "Alpha A100 Robot Vacuum",
    },
    search_metadata: { status: "Success" },
  };
}

describe("canonical commerce provider", () => {
  it("binds a Google product token to direct current seller offers", async () => {
    process.env.SERPAPI_API_KEY = "test-only-key";
    globalThis.fetch = async (url) => {
      const requestUrl = new URL(String(url));
      assert.equal(requestUrl.hostname, "serpapi.com");
      assert.equal(requestUrl.searchParams.get("api_key"), "test-only-key");
      return requestUrl.searchParams.get("engine") === "google_shopping_light"
        ? jsonResponse(shoppingPayload())
        : jsonResponse(offersPayload());
    };

    const searched = await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
    );
    assert.equal(searched.products.length, 1);
    assert.equal(searched.products[0].productId, "google-product-100");
    assert.equal(searched.products[0].candidate.discoveryProvider, "serpapi");
    assert.deepEqual(searched.products[0].candidate.commerceSignals, {
      offerCount: null,
      position: 1,
      productId: "google-product-100",
      rating: 4.6,
      ratingCount: 1000,
    });

    const resolved = await fetchCanonicalCommerceOffers(
      searched.products[0],
      "robot vacuum",
    );
    assert.equal(resolved.diagnostics.rawResults, 4);
    assert.equal(resolved.candidates.length, 2);
    assert.deepEqual(
      resolved.candidates.map((candidate) => ({
        current: candidate.currentShoppingOffer === true,
        name: candidate.name,
        price: candidate.price,
        provider: candidate.discoveryProvider,
        url: candidate.productUrl,
      })),
      [
        {
          current: true,
          name: "Alpha A100 Robot Vacuum",
          price: 239.99,
          provider: "serpapi",
          url: "https://shop.example/products/alpha-a100",
        },
        {
          current: false,
          name: "Alpha A100 Robot Vacuum",
          price: 244.99,
          provider: "serpapi",
          url: "https://unknown.example/products/alpha-a100",
        },
      ],
    );
    assert.equal(resolved.candidates[0].commerceSignals.offerCount, 4);
    assert.match(
      resolved.candidates[0].evidenceSources[0].snippet,
      /Alpha A100.*In stock online/i,
    );
  });

  it("coalesces identical calls only within one request cache", async () => {
    process.env.SERPAPI_API_KEY = "test-only-key";
    let fetchCalls = 0;
    const attempts = [];
    globalThis.fetch = async (url) => {
      fetchCalls += 1;
      const engine = new URL(String(url)).searchParams.get("engine");
      return engine === "google_shopping_light"
        ? jsonResponse(shoppingPayload())
        : jsonResponse(offersPayload());
    };
    const options = {
      onAttempt: (kind) => attempts.push(kind),
      requestCache: new Map(),
    };

    const first = await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
      options,
    );
    const second = await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
      options,
    );
    await fetchCanonicalCommerceOffers(first.products[0], "robot vacuum", options);
    await fetchCanonicalCommerceOffers(second.products[0], "robot vacuum", options);
    await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
      { requestCache: new Map() },
    );

    assert.equal(fetchCalls, 3);
    assert.deepEqual(attempts, ["product_search", "offer_lookup"]);
  });

  it("fails open to the existing path for missing credentials and provider errors", async () => {
    delete process.env.SERPAPI_API_KEY;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("must not fetch");
    };
    const missing = await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
    );
    assert.equal(missing.diagnostics.errorKind, "missing_api_key_or_query");
    assert.equal(fetchCalls, 0);

    process.env.SERPAPI_API_KEY = "test-only-key";
    globalThis.fetch = async () => jsonResponse({ error: "provider failed" });
    const failed = await searchCanonicalCommerceProducts(
      "Alpha A100 robot vacuum",
      "robot vacuum",
    );
    assert.equal(failed.diagnostics.errorKind, "api_error");
    assert.deepEqual(failed.products, []);
  });

  it("forwards request cancellation and never places the key in cache identity", async () => {
    process.env.SERPAPI_API_KEY = "test-only-key";
    const controller = new AbortController();
    controller.abort("test cancellation");
    await assert.rejects(
      searchCanonicalCommerceProducts(
        "Alpha A100 robot vacuum",
        "robot vacuum",
        { signal: controller.signal },
      ),
      { name: "RequestCancelledError" },
    );

    const parameters = new URLSearchParams({
      api_key: "secret",
      engine: "google_shopping_light",
      q: "Alpha A100",
    });
    assert.doesNotMatch(
      canonicalCommerceTestExports.requestKey(parameters),
      /secret|api_key/i,
    );
    assert.equal(
      canonicalCommerceTestExports.sanitizeQuery(
        "site:example.com Alpha A100 robot vacuum",
      ),
      "Alpha A100 robot vacuum",
    );
  });
});
