import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  prefilterProductCandidates,
  productSearchTestExports,
  searchProductPages,
  searchShoppingProducts,
} from "../lib/productSearch.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.SERPER_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = originalApiKey;
});

function candidate(name, price = 100) {
  return {
    availableColors: [],
    brand: null,
    category: "robot vacuum",
    dimensions: {
      depth: null,
      height: null,
      unit: null,
      width: null,
    },
    evidenceSources: [
      {
        snippet: name,
        snippetProvenance: "source-derived",
        title: name,
        url: "https://shop.example/products/item",
      },
    ],
    id: name,
    imageUrl: null,
    keySpecs: [name],
    name,
    price,
    productUrl: "https://shop.example/products/item",
  };
}

describe("bounded product search", () => {
  it("removes site operators from Shopping queries", () => {
    assert.equal(
      productSearchTestExports.sanitizeQuery(
        'site:shopping.google.com robot vacuum site:example.com "self emptying"',
      ),
      'robot vacuum "self emptying"',
    );
  });

  it("normalizes shopping fields and rejects accessories", () => {
    const normalized = productSearchTestExports.normalizeShoppingResult(
      {
        extracted_price: 169.99,
        imageUrl: "https://cdn.example/ihome-nova.jpg",
        link: "https://www.walmart.com/ip/iHome-Nova-S1-Pro/123456",
        offers: "10+",
        position: 2,
        productId: "4195027484078128635",
        rating: 4.6,
        ratingCount: 1000,
        source: "Walmart",
        title: "iHome Nova S1 Pro Self-Emptying Robot Vacuum",
      },
      "robot vacuum",
    );
    const accessory = productSearchTestExports.normalizeShoppingResult(
      {
        link: "https://shop.example/products/filter",
        title: "Replacement filter for iHome Nova",
      },
      "robot vacuum",
    );

    assert.equal(normalized.candidate.price, 169.99);
    assert.equal(normalized.candidate.retailer, "Walmart");
    assert.equal(normalized.candidate.currentShoppingOffer, true);
    assert.deepEqual(normalized.candidate.commerceSignals, {
      offerCount: 10,
      position: 2,
      productId: "4195027484078128635",
      rating: 4.6,
      ratingCount: 1000,
    });
    assert.equal(accessory.candidate, null);
    assert.equal(accessory.reason, "accessory_or_part");
  });

  it("does not mark an incomplete Shopping result as a current offer", () => {
    const missingPrice = productSearchTestExports.normalizeShoppingResult(
      {
        link: "https://shop.example/products/shark-iq",
        source: "Example",
        title: "Shark IQ Robot Vacuum",
      },
      "robot vacuum",
    );

    assert.equal(missingPrice.candidate.currentShoppingOffer, undefined);
  });

  it("rejects editorial and manual URLs returned through the Shopping vertical", () => {
    for (const link of [
      "https://www.consumerreports.org/home-garden/leaf-blowers/ego-lb7654/m407121/",
      "https://www.rtings.com/robot-vacuum/tools/compare/one-vs-two/1/2",
      "https://device.report/manual/6818421",
    ]) {
      const normalized = productSearchTestExports.normalizeShoppingResult(
        {
          extractedPrice: 199,
          link,
          source: "Search result",
          title: "EGO LB7654 Cordless Leaf Blower",
        },
        "cordless leaf blower",
      );

      assert.equal(normalized.candidate, null);
      assert.equal(normalized.reason, "non_product_source");
    }
  });

  it("binds a priced direct Shopping result to its retailer hostname when source is absent", () => {
    const direct = productSearchTestExports.normalizeShoppingResult(
      {
        extractedPrice: 179,
        link: "https://www.homedepot.com/p/Milwaukee-M18-FUEL-2904-20/320326855",
        title: "Milwaukee M18 FUEL Hammer Drill Driver 2904-20",
      },
      "cordless drill",
    );

    assert.equal(direct.candidate.retailer, "homedepot.com");
    assert.equal(direct.candidate.currentShoppingOffer, true);
  });

  it("reuses direct inline Shopping offers from a product-page search response", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url) => {
      assert.match(String(url), /\/search$/);
      return new Response(
        JSON.stringify({
          organic: [
            {
              link: "https://www.breville.com/en-us/product/bdc465",
              title: "the Luxe Brewer Thermal",
            },
          ],
          shopping: [
            {
              extractedPrice: 349.95,
              link: "https://www.bestbuy.com/product/breville-luxe-brewer/J7266LF2LX",
              productId: "123456789",
              source: "Best Buy",
              title: "Breville BDC465 Luxe Brewer Thermal",
            },
            {
              extractedPrice: 349.95,
              link: "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:123456789",
              source: "Best Buy",
              title: "Breville BDC465 Luxe Brewer Thermal",
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };

    const pages = await searchProductPages(
      "Breville BDC465 coffee maker",
      "coffee maker",
    );

    assert.equal(pages.length, 2);
    assert.equal(pages[0].currentShoppingOffer, true);
    assert.equal(pages[0].price, 349.95);
    assert.equal(pages[0].retailer, "Best Buy");
    assert.equal(pages[0].commerceSignals.productId, "123456789");
    assert.equal(
      pages[1].productUrl,
      "https://www.breville.com/en-us/product/bdc465",
    );
  });

  it("filters wrong product types, accessories, non-new items, and extreme over-budget items", () => {
    const input = { query: "robot vacuum", budget: "$300" };
    const result = prefilterProductCandidates(
      [
        candidate("Shark IQ Robot Vacuum", 250),
        candidate("Cordless Stick Vacuum", 150),
        candidate("Replacement Filter for Shark Robot Vacuum", 20),
        candidate("Refurbished Shark IQ Robot Vacuum", 200),
        candidate("Recertified Shark IQ Robot Vacuum", 200),
        candidate("Open-Box Shark IQ Robot Vacuum", 200),
        {
          ...candidate("Shark IQ Robot Vacuum", 200),
          productUrl:
            "https://shop.example/products/shark-iq-reconditioned-vacuum",
        },
        candidate("Premium Robot Vacuum", 900),
      ],
      input,
      10,
    );

    assert.deepEqual(
      result.candidates.map((item) => item.name),
      ["Shark IQ Robot Vacuum"],
    );
    assert.deepEqual(
      new Set(result.rejected.map((item) => item.reason)),
      new Set([
        "wrong_category",
        "used_or_refurbished",
        "over_budget",
      ]),
    );
  });

  it("allows non-new condition terms only when the shopper requests them", () => {
    const result = prefilterProductCandidates(
      [candidate("Recertified MSI 27-inch Gaming Monitor", 110)],
      { query: "recertified gaming monitor", budget: "$150" },
      10,
    );

    assert.equal(result.candidates.length, 1);

    const urlOnly = prefilterProductCandidates(
      [
        {
          ...candidate("Shark IQ Robot Vacuum", 110),
          productUrl:
            "https://shop.example/products/shark-iq-reconditioned-vacuum",
        },
      ],
      { query: "reconditioned robot vacuum", budget: "$150" },
      10,
    );

    assert.equal(urlOnly.candidates.length, 1);
  });

  it("coalesces only within one request and refetches for a later search", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let fetchCalls = 0;
    let attempts = 0;
    globalThis.fetch = async (_url, init) => {
      fetchCalls += 1;
      const request = JSON.parse(init.body);
      assert.equal(request.num, 10);
      return new Response(
        JSON.stringify({
          shopping: [
            {
              extractedPrice: 249,
              link: "https://shop.example/products/shark-iq",
              source: "Example",
              title: "Shark IQ Robot Vacuum",
            },
          ],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    };

    const query = `robot vacuum unit test ${Date.now()}`;
    const requestCache = new Map();
    const first = await searchShoppingProducts(query, "robot vacuum", {
      onAttempt: () => {
        attempts += 1;
      },
      requestCache,
    });
    const second = await searchShoppingProducts(query, "robot vacuum", {
      onAttempt: () => {
        attempts += 1;
      },
      requestCache,
    });
    const laterSearch = await searchShoppingProducts(query, "robot vacuum", {
      onAttempt: () => {
        attempts += 1;
      },
      requestCache: new Map(),
    });

    assert.equal(first.candidates.length, 1);
    assert.equal(second.candidates.length, 1);
    assert.equal(laterSearch.candidates.length, 1);
    assert.equal(fetchCalls, 2);
    assert.equal(attempts, 2);
  });
});
