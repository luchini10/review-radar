import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearCacheForTests } from "../lib/cache.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import {
  buildSearchObservabilitySnapshot,
  createSearchObservabilityLedger,
  runWithSearchObservabilityLedger,
} from "../lib/searchObservabilityLedger.ts";
import {
  MAX_ORGANIC_IDENTITY_RESOLUTION_QUERIES,
  diagnoseSerperShoppingResponse,
  resolveSerperIdentityLeads,
} from "../lib/search/serper.ts";

function request(query = "robot vacuum") {
  const input = { query };

  return {
    ...input,
    extractedRequirements: extractStructuredRequirements(input),
  };
}

function emptyStats() {
  return {
    categoryGroup: "general",
    generatedQueries: [],
    selectedSourcePack: [],
    searchedShoppingQueries: [],
    searchedOrganicQueries: [],
    searchedRetailerDomainQueries: [],
    searchedDirectRetailerQueries: [],
    shoppingCalls: 1,
    organicCalls: 0,
    retailerDomainCalls: 0,
    directRetailerCalls: 0,
    collectedCandidates: 0,
    duplicateCandidatesRemoved: 0,
    maxEnrichedProducts: 12,
    preFilteredCandidates: 0,
    rejectedCandidates: 0,
    searchDepth: "dev",
    sourceTimeouts: 0,
    seedSearchesRun: 0,
    seedProductNames: [],
    marketCoverage: {
      candidateCount: 0,
      pricedCandidateCount: 0,
      rescueQueriesRun: 0,
      retailerHostCount: 0,
    },
    funnel: {
      rawNames: [],
      dedupedNames: [],
      keptNames: [],
      rejected: [],
    },
  };
}

function searchResult({ candidates = [], leads = [] } = {}) {
  return {
    candidates,
    identityResolutionLeads: leads,
    stats: {
      ...emptyStats(),
      collectedCandidates: candidates.length,
      preFilteredCandidates: candidates.length,
      marketCoverage: {
        candidateCount: candidates.length,
        pricedCandidateCount: candidates.filter(
          (candidate) => candidate.price !== null,
        ).length,
        rescueQueriesRun: 0,
        retailerHostCount: candidates.length > 0 ? 1 : 0,
      },
      funnel: {
        rawNames: candidates.map((candidate) => candidate.name),
        dedupedNames: candidates.map((candidate) => candidate.name),
        keptNames: candidates.map((candidate) => candidate.name),
        rejected: [],
      },
    },
  };
}

function lead(overrides = {}) {
  return {
    identityKey: "example|rv200",
    parentQueryId: undefined,
    provider: "google_shopping",
    providerId: "provider-rv200",
    title: "Example RV200 Robot Vacuum",
    ...overrides,
  };
}

function rawCandidate(overrides = {}) {
  return {
    id: "candidate-rv200",
    name: "Example RV200 Robot Vacuum",
    brand: null,
    category: "robot vacuum",
    productUrl: "https://shop.example.com/products/example-rv200-robot-vacuum",
    imageUrl: null,
    retailer: "Example Store",
    price: 249,
    rating: null,
    reviewCount: null,
    availableColors: [],
    dimensions: {
      width: null,
      depth: null,
      height: null,
      unit: null,
    },
    keySpecs: [],
    evidenceSources: [
      {
        title: "Example RV200 Robot Vacuum",
        url: "https://shop.example.com/products/example-rv200-robot-vacuum",
        snippet: "Example RV200 robot vacuum product page.",
      },
    ],
    requirementCheck: {
      exactMatch: false,
      passed: [],
      failed: [],
      unknown: [],
    },
    ...overrides,
  };
}

function structuredOffer(title, id, extra = {}) {
  return {
    title,
    productLink:
      `https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A${id}`,
    source: "Example Store",
    price: "$249",
    ...extra,
  };
}

async function withMockedSerper(handler, run) {
  const previousFetch = global.fetch;
  const previousKey = process.env.SERPER_API_KEY;

  clearCacheForTests();
  process.env.SERPER_API_KEY = "test-serper-key";
  global.fetch = handler;

  try {
    return await run();
  } finally {
    clearCacheForTests();
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SERPER_API_KEY;
    else process.env.SERPER_API_KEY = previousKey;
  }
}

describe("bounded organic identity resolution", () => {
  it("qualifies only structured, model-specific, requested-type-safe leads that merchant recovery cannot materialize", () => {
    const result = diagnoseSerperShoppingResponse(
      {
        shopping: [
          structuredOffer("Example RV200 Robot Vacuum", "rv200"),
          structuredOffer("Example Robot Vacuum", "generic"),
          structuredOffer("Example RV300 Replacement Filter", "filter"),
          structuredOffer("Example RV400 Robot Vacuum", "rv400", {
            link: "https://shop.example.com/products/example-rv400-robot-vacuum",
          }),
          {
            title: "Example RV500 Robot Vacuum",
            productLink:
              "https://www.google.com/search?q=RV500&ibp=oshop&udm=28",
            source: "Example Store",
            price: "$349",
          },
        ],
      },
      "robot vacuum",
      "robot vacuum",
    );

    assert.deepEqual(
      result.identityResolutionLeads.map((item) => item.title),
      ["Example RV200 Robot Vacuum"],
    );
  });

  it("qualifies the three model-specific C5 identities and leaves the ambiguous identity unresolved", () => {
    const result = diagnoseSerperShoppingResponse(
      {
        shopping: [
          structuredOffer(
            "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
            "ridgid-hd1200",
          ),
          structuredOffer(
            "Vacmaster 5 Gallon Wet Dry Vacuum",
            "vacmaster-generic",
          ),
          structuredOffer(
            "Craftsman 6 Gallon 3.5 Peak HP Wet/Dry Shop Vacuum CMXEVBE17584",
            "craftsman-cmxevbe17584",
          ),
          structuredOffer(
            "Stanley Wet/Dry Vacuum SL18115",
            "stanley-sl18115",
          ),
        ],
      },
      "shop vac",
      "shop vac",
    );

    assert.deepEqual(
      result.identityResolutionLeads.map((item) => item.title),
      [
        "Ridgid 12 Gallon NXT Wet/Dry Shop Vacuum HD1200",
        "Craftsman 6 Gallon 3.5 Peak HP Wet/Dry Shop Vacuum CMXEVBE17584",
        "Stanley Wet/Dry Vacuum SL18115",
      ],
    );
  });

  it("keeps the default-off branch call-free and byte-identical", async () => {
    const original = searchResult({ leads: [lead()] });

    await withMockedSerper(
      async () => {
        throw new Error("flag-off resolution must not dispatch");
      },
      async () => {
        const resolved = await resolveSerperIdentityLeads(
          original,
          request(),
          { enabled: false },
        );

        assert.strictEqual(resolved, original);
        assert.equal(JSON.stringify(resolved), JSON.stringify(original));
      },
    );
  });

  it("wires the default-off resolver to its environment flag", async () => {
    const previous = process.env.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION;
    let calls = 0;

    try {
      await withMockedSerper(
        async () => {
          calls += 1;
          return new Response(JSON.stringify({ organic: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
        async () => {
          delete process.env.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION;
          const original = searchResult({ leads: [lead()] });
          const defaultOff = await resolveSerperIdentityLeads(
            original,
            request(),
          );
          assert.strictEqual(defaultOff, original);
          assert.equal(calls, 0);

          process.env.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION = "on";
          await resolveSerperIdentityLeads(
            searchResult({ leads: [lead()] }),
            request(),
          );
          assert.equal(calls, 1);
        },
      );
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION;
      } else {
        process.env.REVIEW_RADAR_ORGANIC_IDENTITY_RESOLUTION = previous;
      }
    }
  });

  it("uses one organic product-page query and keeps only the safely matching page", async () => {
    const outbound = [];

    await withMockedSerper(
      async (url, init) => {
        const body = JSON.parse(init.body);
        outbound.push({ body, url });
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: "Example RV200 Robot Vacuum",
                link: "https://shop.example.com/products/example-rv200-robot-vacuum",
                snippet: "Example RV200 robot vacuum product page.",
              },
              {
                title: "Example RV300 Robot Vacuum",
                link: "https://shop.example.com/products/example-rv300-robot-vacuum",
                snippet: "Different model.",
              },
              {
                title: "Example RV200 Replacement Filter",
                link: "https://shop.example.com/products/example-rv200-filter",
                snippet: "Replacement filter for RV200.",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
      async () => {
        const resolved = await resolveSerperIdentityLeads(
          searchResult({ leads: [lead()] }),
          request(),
          { enabled: true },
        );

        assert.equal(outbound.length, 1);
        assert.match(outbound[0].url, /\/search$/);
        assert.deepEqual(outbound[0].body, {
          gl: "us",
          hl: "en",
          num: 10,
          q: "Example RV200 Robot Vacuum product page",
        });
        assert.deepEqual(
          resolved.candidates.map((candidate) => candidate.name),
          ["Example RV200 Robot Vacuum"],
        );
        assert.equal(resolved.stats.organicCalls, 1);
        assert.deepEqual(resolved.stats.searchedOrganicQueries, [
          "Example RV200 Robot Vacuum product page",
        ]);
      },
    );
  });

  it("deduplicates identities, skips already-materialized pages, and enforces the request cap", async () => {
    const outboundQueries = [];
    const leads = [
      lead(),
      lead({ providerId: "duplicate-provider" }),
      ...Array.from({ length: 6 }, (_, index) => {
        const model = `RV${300 + index}`;
        return lead({
          identityKey: `example|${model.toLowerCase()}`,
          providerId: `provider-${model.toLowerCase()}`,
          title: `Example ${model} Robot Vacuum`,
        });
      }),
    ];

    await withMockedSerper(
      async (_url, init) => {
        const query = JSON.parse(init.body).q;
        const model = query.match(/RV\d+/)?.[0] || "RV000";
        outboundQueries.push(query);
        return new Response(
          JSON.stringify({
            organic: [
              {
                title: `Example ${model} Robot Vacuum`,
                link: `https://shop.example.com/products/example-${model.toLowerCase()}-robot-vacuum`,
                snippet: `Example ${model} robot vacuum product page.`,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
      async () => {
        const resolved = await resolveSerperIdentityLeads(
          searchResult({
            candidates: [rawCandidate()],
            leads,
          }),
          request(),
          { enabled: true },
        );

        assert.equal(
          outboundQueries.length,
          MAX_ORGANIC_IDENTITY_RESOLUTION_QUERIES,
        );
        assert.equal(new Set(outboundQueries).size, outboundQueries.length);
        assert.equal(
          outboundQueries.includes("Example RV200 Robot Vacuum product page"),
          false,
        );
        assert.equal(
          resolved.candidates.filter((candidate) => /RV200/.test(candidate.name))
            .length,
          1,
        );
      },
    );
  });

  it("records shadow plans and exact enabled first-loss reasons in the existing ledger", async () => {
    const ledgerState = createSearchObservabilityLedger({
      commitHash: "test",
      finalModel: "none",
      flags: {},
      helperModel: "none",
      serperCacheEmptyAtStart: true,
    });

    await withMockedSerper(
      async () =>
        new Response(
          JSON.stringify({
            organic: [
              {
                title: "Example RV300 Robot Vacuum",
                link: "https://shop.example.com/products/example-rv300-robot-vacuum",
                snippet: "Different model.",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      async () => {
        const shadow = await runWithSearchObservabilityLedger(
          ledgerState,
          async () => {
            await resolveSerperIdentityLeads(
              searchResult({ leads: [lead()] }),
              request(),
              { enabled: false },
            );
            return buildSearchObservabilitySnapshot();
          },
        );
        const [shadowQuery] = shadow.planAssembly.filter(
          (query) => query.origin === "identity_resolution",
        );
        assert.equal(shadowQuery.status, "culled");
        assert.equal(shadowQuery.cullReason, "identity_resolution_flag_off");

        const enabledState = createSearchObservabilityLedger({
          commitHash: "test",
          finalModel: "none",
          flags: {},
          helperModel: "none",
          serperCacheEmptyAtStart: true,
        });
        const enabled = await runWithSearchObservabilityLedger(
          enabledState,
          async () => {
            await resolveSerperIdentityLeads(
              searchResult({ leads: [lead()] }),
              request(),
              { enabled: true },
            );
            return buildSearchObservabilitySnapshot();
          },
        );
        const rejected = enabled.candidateLineage.candidates.find(
          (candidate) => candidate.name === "Example RV300 Robot Vacuum",
        );

        assert.equal(rejected.firstLoss.stage, "identity_resolution");
        assert.equal(
          rejected.firstLoss.subreason,
          "product_page_identity_selector_rejected",
        );
      },
    );
  });
});
