import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { selectProducts } from "../lib/productSelection.ts";

const originalApiKey = process.env.SERPER_API_KEY;
const originalSerpApiKey = process.env.SERPAPI_API_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = originalApiKey;
  if (originalSerpApiKey === undefined) delete process.env.SERPAPI_API_KEY;
  else process.env.SERPAPI_API_KEY = originalSerpApiKey;
});

describe("market-quality discovery orchestration", () => {
  it("starts all three neutral Shopping searches while the scout plan is pending", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let finishPlan;
    let markThreeSearchesStarted;
    let fetchCalls = 0;
    const threeSearchesStarted = new Promise((resolve) => {
      markThreeSearchesStarted = resolve;
    });
    const pendingPlan = new Promise((resolve) => {
      finishPlan = resolve;
    });
    globalThis.fetch = async () => {
      fetchCalls += 1;
      if (fetchCalls === 3) markThreeSearchesStarted();
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selectionPromise = selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: pendingPlan,
    });

    await threeSearchesStarted;
    assert.equal(fetchCalls, 3);
    finishPlan({
      queries: [],
      targets: [],
    });
    const selected = await selectionPromise;

    assert.equal(selected.telemetry.logicalSearchCalls, 3);
    assert.deepEqual(selected.telemetry.marketTargetQueries, []);
    assert.deepEqual(selected.telemetry.marketTargets, []);
    assert.deepEqual(selected.telemetry.returnedCandidateSignals, []);
    assert.equal(selected.result.recommendations.length, 0);
  });

  it("adds no more than three exact Shopping searches and three strong-target page searches", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const targets = ["A100", "B200", "C300", "D400", "E500"].map(
      (model, consensusOrder) => ({
        aliases: [],
        brand: `Brand${consensusOrder}`,
        consensusOrder,
        evidenceTier: "strong",
        model,
        sourceUrls: ["https://www.rtings.com/example"],
      }),
    );

    const selected = await selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: { queries: [], targets },
    });

    assert.equal(fetchCalls, 9);
    assert.equal(selected.telemetry.neutralQueries.length, 3);
    assert.equal(selected.telemetry.marketTargetQueries.length, 3);
    assert.equal(selected.telemetry.logicalSearchCalls, 9);
    assert.equal(selected.telemetry.resolutionQueries.length, 3);
    assert.deepEqual(
      selected.telemetry.marketTargets.map(({ model, tier }) => ({ model, tier })),
      targets.map(({ model }) => ({ model, tier: "strong" })),
    );
    assert.deepEqual(
      selected.telemetry.marketTargetQueries.map((query) => query.split(" ")[1]),
      ["A100", "B200", "C300"],
    );
  });

  it("attaches strong evidence to an exact target recovered by page search", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url) => {
      const endpoint = String(url);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link: "https://www.alpha.com/products/alpha-a100",
                snippet: "Self-emptying robot vacuum",
                title: "Alpha A100 Robot Vacuum",
              },
              {
                link:
                  "https://www.consumerreports.org/appliances/robot-vacuums/alpha-a100/m123456/",
                snippet: "Independent test result",
                title: "Alpha A100 Robot Vacuum Review",
              },
              {
                link: "https://device.report/manual/alpha-a100",
                snippet: "Owner manual",
                title: "Alpha A100 Robot Vacuum Manual",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: {
        budget: "$300",
        priorities: "self-emptying",
        query: "robot vacuum",
      },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.equal(selected.telemetry.logicalSearchCalls, 5);
    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.equal(selected.telemetry.rankedCandidates[0].evidenceTier, "strong");
    assert.deepEqual(selected.telemetry.resolutionQueries, [
      "Alpha A100 robot vacuum",
    ]);
    assert.deepEqual(
      selected.telemetry.resolutionDiagnostics[0].pageCandidates.map(
        ({ score }) => score,
      ),
      [1, 0, 0],
    );
    assert.equal(selected.result.recommendations.length, 0);
  });

  it("does not let an aggregate Shopping hit suppress exact product-page recovery", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link: "https://www.examplestore.com/products/alpha-a100",
                snippet: "Current Alpha A100 robot vacuum product page",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "Alpha A100 robot vacuum") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&q=alpha+a100",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.deepEqual(selected.telemetry.marketTargetQueries, [
      "Alpha A100 robot vacuum",
    ]);
    assert.ok(
      selected.telemetry.resolutionQueries.includes(
        "Alpha a100 robot vacuum Example Store product page",
      ),
    );
    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.ok(
      selected.telemetry.rankedCandidates.some(
        (candidate) =>
          candidate.evidenceTier === "strong" &&
          candidate.price === 249 &&
          candidate.productUrl ===
            "https://www.examplestore.com/products/alpha-a100" &&
          candidate.retailer === "Example Store",
      ),
    );
    assert.ok(selected.telemetry.logicalSearchCalls <= 15);
  });

  it("recovers a strong target from an inline direct Shopping offer without another call", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 239,
                link: "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
                productId: "222",
                rating: 4.7,
                ratingCount: 800,
                source: "Home Depot",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "Alpha A100 robot vacuum") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:111",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.equal(selected.telemetry.marketEvidenceCandidates, 1);
    assert.ok(
      selected.telemetry.rankedCandidates.some(
        (candidate) =>
          candidate.evidenceTier === "strong" &&
          candidate.price === 239 &&
          candidate.productUrl ===
            "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
      ),
    );
    assert.ok(selected.telemetry.logicalSearchCalls <= 9);
  });

  it("resolves exact strong targets through canonical offers without transferring a sibling", async () => {
    process.env.SERPER_API_KEY = "test-only-serper-key";
    process.env.SERPAPI_API_KEY = "test-only-serpapi-key";
    let serpApiProductSearches = 0;
    let serpApiOfferLookups = 0;
    globalThis.fetch = async (url) => {
      const requestUrl = new URL(String(url));
      if (requestUrl.hostname === "serpapi.com") {
        const engine = requestUrl.searchParams.get("engine");
        if (engine === "google_shopping_light") {
          serpApiProductSearches += 1;
          return new Response(
            JSON.stringify({
              search_metadata: { status: "Success" },
              shopping_results: [
                {
                  extracted_price: 249,
                  immersive_product_page_token: "alpha-a100-token",
                  position: 1,
                  product_id: "alpha-a100-product",
                  product_link:
                    "https://www.google.com/shopping/product/alpha-a100-product?gl=us",
                  rating: 4.6,
                  reviews: 1000,
                  source: "Best Buy",
                  thumbnail: "https://cdn.example/alpha-a100.jpg",
                  title: "Alpha A100 Robot Vacuum",
                },
                {
                  extracted_price: 199,
                  immersive_product_page_token: "alpha-a100-pro-token",
                  position: 2,
                  product_id: "alpha-a100-pro-product",
                  product_link:
                    "https://www.google.com/shopping/product/alpha-a100-pro-product?gl=us",
                  rating: 5,
                  reviews: 1,
                  source: "Best Buy",
                  title: "Alpha A100 Pro Robot Vacuum",
                },
              ],
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          );
        }
        if (engine === "google_immersive_product") {
          serpApiOfferLookups += 1;
          assert.equal(
            requestUrl.searchParams.get("page_token"),
            "alpha-a100-token",
          );
          return new Response(
            JSON.stringify({
              product_results: {
                brand: "Alpha",
                rating: 4.6,
                reviews: 1000,
                stores: [
                  {
                    details_and_offers: ["In stock online", "Free delivery"],
                    extracted_price: 239,
                    link:
                      "https://www.bestbuy.com/site/alpha-a100-robot-vacuum/123456.p",
                    name: "Best Buy",
                    title: "Alpha A100 Robot Vacuum",
                  },
                  {
                    details_and_offers: ["In stock online"],
                    extracted_price: 199,
                    link:
                      "https://www.bestbuy.com/site/alpha-a100-pro-robot-vacuum/654321.p",
                    name: "Best Buy",
                    title: "Alpha A100 Pro Robot Vacuum",
                  },
                ],
                title: "Alpha A100 Robot Vacuum",
              },
              search_metadata: { status: "Success" },
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          );
        }
      }
      if (requestUrl.hostname === "google.serper.dev") {
        return new Response(JSON.stringify({ shopping: [] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      return new Response(
        `<!doctype html><html><head>
          <meta property="og:title" content="Alpha A100 Robot Vacuum">
          <meta property="product:price:amount" content="239">
          <meta property="product:price:currency" content="USD">
          <meta property="product:availability" content="in stock">
        </head><body>Alpha A100 Robot Vacuum is in stock for $239.</body></html>`,
        { headers: { "content-type": "text/html" }, status: 200 },
      );
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: {
        queries: [],
        targets: [
          {
            aliases: [],
            brand: "Alpha",
            consensusOrder: 0,
            evidenceTier: "strong",
            model: "A100",
            sourceUrls: ["https://www.rtings.com/example"],
          },
        ],
      },
    });

    assert.equal(serpApiProductSearches, 1);
    assert.equal(serpApiOfferLookups, 1);
    assert.deepEqual(selected.telemetry.canonicalCommerce, {
      candidatesReturned: 1,
      errorKinds: [],
      matchedProducts: 1,
      offerLookupAttempts: 1,
      productSearchAttempts: 1,
      targets: ["Alpha A100 robot vacuum"],
    });
    assert.equal(
      selected.telemetry.rankedCandidates.some(({ name }) => /A100 Pro/i.test(name)),
      false,
    );
    assert.equal(selected.telemetry.rankedCandidates[0].evidenceTier, "strong");
    assert.equal(selected.telemetry.logicalSearchCalls, 4);
    assert.ok(selected.telemetry.logicalSearchCalls <= 15);
    assert.ok(
      selected.telemetry.canonicalCommerce.productSearchAttempts <= 3 &&
        selected.telemetry.canonicalCommerce.offerLookupAttempts <= 3,
    );
  });

  it("caps canonical commerce at three product searches and three offer lookups", async () => {
    process.env.SERPER_API_KEY = "test-only-serper-key";
    process.env.SERPAPI_API_KEY = "test-only-serpapi-key";
    let productSearches = 0;
    let offerLookups = 0;
    globalThis.fetch = async (url) => {
      const requestUrl = new URL(String(url));
      if (requestUrl.hostname === "serpapi.com") {
        const engine = requestUrl.searchParams.get("engine");
        if (engine === "google_shopping_light") {
          productSearches += 1;
          const query = requestUrl.searchParams.get("q") || "";
          const [brand, model] = query.split(" ");
          return new Response(
            JSON.stringify({
              search_metadata: { status: "Success" },
              shopping_results: [
                {
                  extracted_price: 250,
                  immersive_product_page_token: `token-${model}`,
                  product_id: `product-${model}`,
                  product_link: `https://www.google.com/shopping/product/product-${model}?gl=us`,
                  source: "Example Store",
                  title: `${brand} ${model} Robot Vacuum`,
                },
              ],
            }),
            { headers: { "content-type": "application/json" }, status: 200 },
          );
        }
        offerLookups += 1;
        return new Response(
          JSON.stringify({
            product_results: { stores: [], title: "Bound product" },
            search_metadata: { status: "Success" },
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };
    const targets = [
      ["Dyson", "V15"],
      ["Shark", "RV2502AE"],
      ["Samsung", "QN90D"],
      ["Sony", "WH1000XM5"],
      ["LG", "OLED55C4PUA"],
    ].map(([brand, model], consensusOrder) => ({
      aliases: [],
      brand,
      consensusOrder,
      evidenceTier: "strong",
      model,
      sourceUrls: ["https://www.rtings.com/example"],
    }));

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: { queries: [], targets },
    });

    assert.equal(productSearches, 3);
    assert.equal(offerLookups, 3);
    assert.equal(selected.telemetry.canonicalCommerce.productSearchAttempts, 3);
    assert.equal(selected.telemetry.canonicalCommerce.offerLookupAttempts, 3);
    assert.equal(selected.telemetry.canonicalCommerce.targets.length, 3);
  });

  it("rejects a non-new condition exposed only by the resolved product URL", async () => {
    process.env.SERPER_API_KEY = "test-only-key";
    globalThis.fetch = async (url, init) => {
      const endpoint = String(url);
      const request = JSON.parse(init.body);
      if (endpoint.endsWith("/search")) {
        return new Response(
          JSON.stringify({
            organic: [
              {
                link:
                  "https://www.examplestore.com/products/alpha-a100-reconditioned",
                snippet: "Current Alpha A100 robot vacuum product page",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      if (request.q === "robot vacuum $300") {
        return new Response(
          JSON.stringify({
            shopping: [
              {
                extractedPrice: 249,
                link: "https://www.google.com/search?ibp=oshop&q=alpha+a100",
                source: "Example Store",
                title: "Alpha A100 Robot Vacuum",
              },
            ],
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }
      return new Response(JSON.stringify({ shopping: [] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    };

    const selected = await selectProducts({
      input: { budget: "$300", query: "robot vacuum" },
      plan: { queries: [], targets: [] },
    });

    assert.equal(selected.telemetry.rejectedByCondition, 1);
    assert.deepEqual(selected.result.recommendations, []);
  });
});
