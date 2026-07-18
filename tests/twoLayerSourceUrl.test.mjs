import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeTwoLayerSourceUrl } from "../lib/twoLayerSourceUrl.ts";

describe("OAI-T4B source URL canonicalization", () => {
  it("removes only conservative tracking parameters", () => {
    assert.equal(
      normalizeTwoLayerSourceUrl(
        "https://shop.example.com/product?utm_source=openai&variant=blue&gclid=abc&sku=EV100#details",
      ),
      "https://shop.example.com/product?variant=blue&sku=EV100#details",
    );
  });

  it("preserves identity-bearing parameters and their values", () => {
    assert.notEqual(
      normalizeTwoLayerSourceUrl("https://shop.example.com/product?sku=EV100&variant=blue"),
      normalizeTwoLayerSourceUrl("https://shop.example.com/product?sku=EV200&variant=red"),
    );
    assert.equal(
      normalizeTwoLayerSourceUrl("https://shop.example.com/product?pid=42&id=7&ref=identity-token"),
      "https://shop.example.com/product?pid=42&id=7&ref=identity-token",
    );
  });

  it("preserves parameter order and fragments that may carry signed or routed identity", () => {
    assert.equal(
      normalizeTwoLayerSourceUrl(
        "https://shop.example.com/product?signature=abc&sku=EV100#/variant/blue",
      ),
      "https://shop.example.com/product?signature=abc&sku=EV100#/variant/blue",
    );
  });
});
