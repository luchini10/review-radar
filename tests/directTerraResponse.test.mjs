import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractDirectTerraAssetTargets,
  extractDirectTerraExactResponseSources,
  extractDirectTerraExactResponseSourceUrls,
  extractDirectTerraResponseSources,
  parseDirectTerraCompletedResponse,
} from "../lib/directTerraResponse.ts";
import { buildDirectTerraRequirementContract } from "../lib/directTerraCandidateSlate.ts";

const report = `# Refrigerator recommendations

## #1 Best Match — Example Deluxe Refrigerator Model A

The exact explanation stays here. [Official source](https://example.com/products/model-a?utm_source=openai)

**Current price:** AI-reported — not independently verified by ReviewRadar.`;

const candidateSlate = Array.from({ length: 8 }, (_, index) => ({
  product_name:
    index === 0
      ? "Example Deluxe Refrigerator Model A"
      : `Example Refrigerator Model X${index + 1}`,
  brand: "Example",
  model: index === 0 ? "Model A" : `X${index + 1}`,
  disposition: index === 0 ? "ranked" : "rejected",
  final_rank: index === 0 ? 1 : null,
  evidence_quality: index === 0 ? "high" : "medium",
  decision_reason: index === 0 ? "Best fit." : "Not selected.",
  source_urls: ["https://example.com/products/model-a?utm_source=openai"],
  requirement_verdicts: [
    {
      requirement_id: "market_us",
      verdict: "pass",
      source_urls: [
        "https://example.com/products/model-a?utm_source=openai",
      ],
    },
  ],
}));

function withCandidateSlate(outputText) {
  try {
    const parsed = JSON.parse(outputText);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      !("candidate_slate" in parsed)
    ) {
      return JSON.stringify({ ...parsed, candidate_slate: candidateSlate });
    }
  } catch {
    // Preserve intentionally malformed JSON.
  }
  return outputText;
}

function completedResponse({
  outputText = JSON.stringify({
    report_markdown: report,
    candidate_slate: candidateSlate,
    price_observations: [],
  }),
} = {}) {
  return {
    id: "resp_direct_123456789",
    status: "completed",
    model: "gpt-5.6-terra",
    output: [
      {
        type: "web_search_call",
        action: {
          sources: [
            {
              type: "url",
              url: "https://example.com/products/model-a?utm_source=openai",
            },
          ],
        },
      },
      {
        type: "message",
        content: [
          { type: "output_text", text: withCandidateSlate(outputText) },
        ],
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
    },
  };
}

describe("direct Terra V2 response boundary", () => {
  it("derives every strong ranked identity without requiring price observations", () => {
    const reportMarkdown = [
      "## Ranked recommendations",
      "### #1 Best Match — CRAFTSMAN CMXEVBE17595 16-Gallon Wet/Dry Shop Vac",
      "### #2 Best Match — RIDGID HD1400 14-Gallon NXT Wet/Dry Vac",
      "### #3 Best Match — DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
      "### #4 Best Match — STANLEY SL18116P 6-Gallon Wet/Dry Vacuum",
      "### #5 Best Match — Milwaukee 0910-20 M18 FUEL Wet/Dry Vacuum",
    ].join("\n\n");

    assert.deepEqual(
      extractDirectTerraAssetTargets({
        reportMarkdown,
        priceObservations: [],
      }).map(({ rank, brand, model }) => ({ rank, brand, model })),
      [
        { rank: 1, brand: "CRAFTSMAN", model: "CMXEVBE17595" },
        { rank: 2, brand: "RIDGID", model: "HD1400" },
        { rank: 3, brand: "DeWalt", model: "DXV12P-QT" },
        { rank: 4, brand: "STANLEY", model: "SL18116P" },
        { rank: 5, brand: "Milwaukee", model: "0910-20" },
      ],
    );
  });

  it("derives targets from bare ranked labels required by the prompt contract", () => {
    assert.deepEqual(
      extractDirectTerraAssetTargets({
        reportMarkdown: [
          "#1 Best Match — Monument Grills M415BZ Propane Gas Grill",
          "#2 Best Match — Nexgrill 720-0830XF Gas Grill",
          "#3 Best Match — Char-Broil 463366022 Performance Gas Grill",
        ].join("\n\n"),
        priceObservations: [
          { rank: 1, brand: "Monument Grills", model: "M415BZ", observations: [] },
          { rank: 2, brand: "Nexgrill", model: "720-0830XF", observations: [] },
          { rank: 3, brand: "Char-Broil", model: "463366022", observations: [] },
        ],
      }).map(({ rank, brand, model }) => ({ rank, brand, model })),
      [
        // Strong heading identity remains authoritative when available.
        { rank: 1, brand: "Monument", model: "M415BZ" },
        { rank: 2, brand: "Nexgrill", model: "720-0830XF" },
        // A numeric-only model is not inferred from prose; the structured
        // same-rank identity supplies the existing safe fallback.
        { rank: 3, brand: "Char-Broil", model: "463366022" },
      ],
    );
  });

  it("does not mistake size or power specifications for heading identity", () => {
    for (const productName of [
      "Acme 16-Gallon 6.5-HP Wet/Dry Shop Vacuum",
      "Acme 4-Burner Propane Gas Grill",
      "Acme 12-Cup Programmable Coffee Maker",
      "Acme 3-Stage Air Purifier",
      "Acme 20-Volt Cordless Drill",
    ]) {
      assert.deepEqual(
        extractDirectTerraAssetTargets({
          reportMarkdown: `## #1 Best Match — ${productName}`,
          priceObservations: [],
        }),
        [],
        productName,
      );
    }
  });

  it("keeps a real model when the same heading also contains feature counts", () => {
    for (const productName of [
      "Acme X100 4-Burner Propane Gas Grill",
      "Acme X100 12-Cup Programmable Coffee Maker",
      "Acme X100 3-Stage Air Purifier",
      "Acme X100 2-Door Refrigerator",
      "Acme X100 5Ah Cordless Drill",
      "Acme X100 3000RPM Rotary Tool",
    ]) {
      assert.deepEqual(
        extractDirectTerraAssetTargets({
          reportMarkdown: `## #1 Best Match — ${productName}`,
          priceObservations: [],
        }).map(({ brand, model }) => ({ brand, model })),
        [{ brand: "Acme", model: "X100" }],
        productName,
      );
    }
  });

  it("drops date-shaped headings but keeps the heading identity over a disagreeing price identity", () => {
    // A date-shaped heading exposes no model token, so it produces no target.
    assert.deepEqual(
      extractDirectTerraAssetTargets({
        reportMarkdown:
          "## #1 Best Match — Acme 2026-07-22 Wet/Dry Shop Vacuum",
        priceObservations: [],
      }),
      [],
    );

    // The ranked heading (Acme X100) is Terra's authoritative identity. A
    // price-observation naming a different model (X200) no longer suppresses
    // the target and never overwrites the heading: the card decorates the
    // product the user actually sees ranked, and downstream page gates keep
    // any link matched to X100.
    assert.deepEqual(
      extractDirectTerraAssetTargets({
        reportMarkdown:
          "## #1 Best Match — Acme X100 Wet/Dry Shop Vacuum",
        priceObservations: [
          { rank: 1, brand: "Acme", model: "X200", observations: [] },
        ],
      }).map(({ brand, model }) => ({ brand, model })),
      [{ brand: "Acme", model: "X100" }],
    );
  });

  it("derives safe heading targets even when optional price metadata is unusable", () => {
    assert.deepEqual(
      extractDirectTerraAssetTargets({
        reportMarkdown:
          "## #1 Best Match — Acme X100 Wet/Dry Shop Vacuum",
        priceObservations: "not-an-array",
      }).map(({ brand, model }) => ({ brand, model })),
      [{ brand: "Acme", model: "X100" }],
    );
  });

  it("accepts titleless response-owned sources and preserves Terra's report exactly", () => {
    const response = completedResponse();
    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.reportMarkdown, report);
    assert.deepEqual(parsed.citationUrls, [
      "https://example.com/products/model-a?utm_source=openai",
    ]);
    assert.deepEqual(parsed.sourceHosts, ["example.com"]);
    assert.equal(parsed.disabledCitationCount, 0);
    assert.deepEqual(parsed.priceEstimates, []);
  });

  it("accepts any exact response-owned URL even when public sources canonicalize it away", () => {
    const laterExactUrl =
      "https://example.com/products/model-a?utm_campaign=later";
    const exactSlate = structuredClone(candidateSlate);
    for (const candidate of exactSlate) {
      candidate.source_urls = [laterExactUrl];
      candidate.requirement_verdicts[0].source_urls = [laterExactUrl];
    }
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: report,
        candidate_slate: exactSlate,
        price_observations: [
          {
            rank: 1,
            brand: "Example",
            model: "Model A",
            observations: [],
          },
        ],
      }),
    });
    response.output[0].action.sources.push({
      type: "url",
      url: laterExactUrl,
    });

    const parsed = parseDirectTerraCompletedResponse(response, {
      requirementContract: buildDirectTerraRequirementContract({}),
    });

    assert.equal(parsed.ok, true);
    assert.equal(parsed.candidateSlateDiagnostic.candidateCount, 8);
    assert.equal(
      extractDirectTerraResponseSources(response).length,
      1,
      "the client-facing source collection remains canonically deduplicated",
    );
  });

  it("calculates an estimated range from two response-owned source hosts", () => {
    const priceObservations = [
      {
        rank: 1,
        brand: "Example",
        model: "Model A",
        observations: [
          {
            seller: "Store One",
            price_amount: 399.99,
            currency: "USD",
            condition: "new",
            offer_type: "standalone_product",
            source_url:
              "https://example.com/products/model-a?utm_source=openai",
          },
          {
            seller: "Store Two",
            price_amount: 449.99,
            currency: "USD",
            condition: "new",
            offer_type: "standalone_product",
            source_url: "https://store-two.example/model-a",
          },
        ],
      },
    ];
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: report,
        price_observations: priceObservations,
      }),
    });
    response.output[0].action.sources.push({
      type: "url",
      url: "https://store-two.example/model-a",
    });

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.priceEstimates, [
      {
        rank: 1,
        brand: "Example",
        model: "Model A",
        currency: "USD",
        low: 399.99,
        high: 449.99,
        median: 424.99,
        sourceCount: 2,
      },
    ]);
    assert.deepEqual(parsed.assetTargets, [
      {
        key: "rank-1-example-model-a",
        rank: 1,
        productName: "Example Deluxe Refrigerator Model A",
        brand: "Example",
        model: "Model A",
        category: "Example Deluxe Refrigerator Model A",
      },
    ]);
    assert.equal(parsed.responseSources.length, 2);
    assert.deepEqual(parsed.searchActions, [
      {
        type: "unknown",
        queries: [],
        host: null,
        pattern: null,
      },
    ]);
    assert.equal(parsed.reportMarkdown, report);
  });

  it("extracts bounded search actions without retaining opened URLs", () => {
    const response = completedResponse();
    response.output.unshift(
      {
        type: "web_search_call",
        action: {
          type: "search",
          queries: ["  best\u0000 Example Model A   reviews  "],
          sources: [],
        },
      },
      {
        type: "web_search_call",
        action: {
          type: "open_page",
          url: "https://store.example/products/model-a?provider_id=secret",
          sources: [],
        },
      },
    );

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.searchActions, [
      {
        type: "search",
        queries: ["best Example Model A reviews"],
        host: null,
        pattern: null,
      },
      {
        type: "open_page",
        queries: [],
        host: "store.example",
        pattern: null,
      },
      {
        type: "unknown",
        queries: [],
        host: null,
        pattern: null,
      },
    ]);
    assert.equal(
      JSON.stringify(parsed.searchActions).includes("provider_id"),
      false,
    );
  });

  it("drops unowned and duplicate-host observations without rejecting the report", () => {
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: report,
        price_observations: [
          {
            rank: 1,
            brand: "Example",
            model: "Model A",
            observations: [
              {
                seller: "Store One",
                price_amount: 399,
                currency: "USD",
                condition: "new",
                offer_type: "standalone_product",
                source_url: "https://example.com/products/model-a",
              },
              {
                seller: "Same host",
                price_amount: 350,
                currency: "USD",
                condition: "new",
                offer_type: "standalone_product",
                source_url: "https://www.example.com/other-model-a",
              },
              {
                seller: "Invented source",
                price_amount: 1,
                currency: "USD",
                condition: "new",
                offer_type: "standalone_product",
                source_url: "https://invented.example/model-a",
              },
            ],
          },
        ],
      }),
    });
    response.output[0].action.sources[0].url =
      "https://example.com/products/model-a";
    response.output[0].action.sources.push({
      type: "url",
      url: "https://www.example.com/other-model-a",
    });

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.reportMarkdown, report);
    assert.deepEqual(parsed.priceEstimates, []);
    assert.equal(parsed.rejectedPriceObservationCount, 2);
  });

  it("refuses to bind an estimate to a different ranked model", () => {
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: report,
        price_observations: [
          {
            rank: 1,
            brand: "Example",
            model: "Model B",
            observations: [
              {
                seller: "Store One",
                price_amount: 399,
                currency: "USD",
                condition: "new",
                offer_type: "standalone_product",
                source_url: "https://example.com/products/model-a",
              },
            ],
          },
        ],
      }),
    });

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.priceEstimates, []);
    assert.equal(parsed.rejectedPriceObservationCount, 1);
  });

  it("withholds a range when response-owned amounts disagree implausibly", () => {
    const observations = [100, 500].map((price_amount, index) => ({
      seller: `Store ${index + 1}`,
      price_amount,
      currency: "USD",
      condition: "new",
      offer_type: "standalone_product",
      source_url:
        index === 0
          ? "https://example.com/products/model-a"
          : "https://store-two.example/model-a",
    }));
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: report,
        price_observations: [
          { rank: 1, brand: "Example", model: "Model A", observations },
        ],
      }),
    });
    response.output[0].action.sources[0].url = observations[0].source_url;
    response.output[0].action.sources.push({
      type: "url",
      url: observations[1].source_url,
    });

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.priceEstimates, []);
    assert.equal(parsed.rejectedPriceObservationCount, 2);
  });

  it("extracts both direct and nested URL-citation annotations", () => {
    const sources = extractDirectTerraResponseSources({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "{}",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://one.example/product",
                  title: "One",
                },
                {
                  type: "url_citation",
                  url_citation: {
                    url: "https://two.example/product",
                    title: "Two",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    assert.deepEqual(
      sources.map((source) => source.url),
      ["https://one.example/product", "https://two.example/product"],
    );
  });

  it("keeps canonical display dedupe separate from exact ownership variants", () => {
    const tracked = "https://one.example/product?utm_source=hosted-search";
    const exact = "https://one.example/product";
    const response = {
      output: [
        {
          type: "web_search_call",
          action: {
            sources: [{ type: "url", url: tracked, title: "Tracked" }],
          },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "{}",
              annotations: [
                { type: "url_citation", url: exact, title: "Exact" },
                {
                  type: "url_citation",
                  url_citation: { url: exact, title: "Exact duplicate" },
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(
      extractDirectTerraResponseSources(response).map((source) => source.url),
      [tracked],
    );
    assert.deepEqual(extractDirectTerraExactResponseSourceUrls(response), [
      tracked,
      exact,
    ]);
    assert.deepEqual(extractDirectTerraExactResponseSources(response), [
      { url: tracked, title: "Tracked" },
      { url: exact, title: "Exact" },
    ]);
  });

  it("backfills a titleless exact action source from the same exact annotation", () => {
    const url = "https://one.example/product?sku=exact-1";
    const response = {
      output: [
        {
          type: "web_search_call",
          action: { sources: [{ type: "url", url }] },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "{}",
              annotations: [
                {
                  type: "url_citation",
                  url,
                  title: "Exact product title",
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(extractDirectTerraExactResponseSources(response), [
      { url, title: "Exact product title" },
    ]);
  });

  it("preserves an invented citation in the report but disables its link", () => {
    const invented = report.replace(
      "https://example.com/products/model-a?utm_source=openai",
      "https://invented.example/model-a",
    );
    const parsed = parseDirectTerraCompletedResponse(
      completedResponse({
        outputText: JSON.stringify({
          report_markdown: invented,
          price_observations: [],
        }),
      }),
    );

    assert.equal(parsed.ok, true);
    assert.equal(parsed.reportMarkdown, invented);
    assert.deepEqual(parsed.citationUrls, []);
    assert.deepEqual(parsed.sourceHosts, []);
    assert.equal(parsed.disabledCitationCount, 1);
  });

  it("keeps response-owned links active while disabling only unmatched links", () => {
    const registeredUrl = "https://example.com/products/model-a";
    const inventedUrl = "https://invented.example/model-b";
    const mixedReport = [
      "# Result",
      "",
      `[Registered](${registeredUrl}) and [unmatched](${inventedUrl}).`,
    ].join("\n");
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: mixedReport,
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url = registeredUrl;

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.reportMarkdown, mixedReport);
    assert.deepEqual(parsed.citationUrls, [registeredUrl]);
    assert.deepEqual(parsed.sourceHosts, ["example.com"]);
    assert.equal(parsed.disabledCitationCount, 1);
  });

  it("rejects malformed wrappers, extra fields, and reports without citations", () => {
    for (const outputText of [
      "not json",
      JSON.stringify({ report_markdown: report, price_observations: [], cards: [] }),
      JSON.stringify({ report_markdown: "# No citations", price_observations: [] }),
    ]) {
      assert.equal(
        parseDirectTerraCompletedResponse(completedResponse({ outputText })).ok,
        false,
      );
    }
  });

  it("keeps identity-bearing query parameters and parses balanced URL parentheses", () => {
    const citationUrl =
      "https://example.com/product/widget_(2026)?variant=large&utm_source=openai";
    const balancedReport = `# Result\n\n[Source](${citationUrl})`;
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: balancedReport,
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url = citationUrl;

    const parsed = parseDirectTerraCompletedResponse(response);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.citationUrls, [citationUrl]);
  });

  it("validates GFM autolinks with the same grammar used by the report renderer", () => {
    const registeredUrl = "https://example.com/products/model-a";
    const bareReport = `# Result\n\nProvider page: ${registeredUrl}`;
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: bareReport,
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url = registeredUrl;

    const accepted = parseDirectTerraCompletedResponse(response);
    assert.equal(accepted.ok, true);
    assert.deepEqual(accepted.citationUrls, [registeredUrl]);

    response.output[1].content[0].text = withCandidateSlate(
      JSON.stringify({
        report_markdown:
          "# Result\n\nProvider page: https://invented.example/products/model-a",
        price_observations: [],
      }),
    );
    const disabled = parseDirectTerraCompletedResponse(response);
    assert.equal(disabled.ok, true);
    assert.deepEqual(disabled.citationUrls, []);
    assert.equal(disabled.disabledCitationCount, 1);
  });

  it("resolves reference links and ignores link-shaped text inside code", () => {
    const registeredUrl = "https://example.com/products/model-a";
    const referenceReport = [
      "# Result",
      "",
      "Read the [provider page][model-a].",
      "",
      "```md",
      "[not rendered](https://invented.example/not-a-citation)",
      "```",
      "",
      `[model-a]: ${registeredUrl} \"Model A\"`,
    ].join("\n");
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: referenceReport,
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url = registeredUrl;

    const parsed = parseDirectTerraCompletedResponse(response);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.citationUrls, [registeredUrl]);
  });

  it("rejects report images even when their URL belongs to the response", () => {
    const imageUrl = "https://example.com/images/model-a.jpg";
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown: `# Result\n\n![Remote product image](${imageUrl})`,
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url = imageUrl;

    assert.deepEqual(parseDirectTerraCompletedResponse(response), {
      ok: false,
      reason: "report_images_not_allowed",
    });
  });

  it("does not collapse distinct hosts, fragments, or identity-bearing query order", () => {
    const cases = [
      [
        "https://www.example.com/products/model-a",
        "https://example.com/products/model-a",
      ],
      [
        "https://example.com/products/model-a#blue",
        "https://example.com/products/model-a#red",
      ],
      [
        "https://example.com/products/model-a?variant=blue&seller=one",
        "https://example.com/products/model-a?seller=one&variant=blue",
      ],
    ];

    for (const [registeredUrl, citedUrl] of cases) {
      const response = completedResponse({
        outputText: JSON.stringify({
          report_markdown: `# Result\n\n[Provider](${citedUrl})`,
          price_observations: [],
        }),
      });
      response.output[0].action.sources[0].url = registeredUrl;
      const parsed = parseDirectTerraCompletedResponse(response);
      assert.equal(parsed.ok, true);
      assert.deepEqual(parsed.citationUrls, []);
      assert.equal(
        parsed.disabledCitationCount,
        1,
        `${citedUrl} must not inherit ownership from ${registeredUrl}`,
      );
    }
  });

  it("normalizes only established tracking parameters", () => {
    const response = completedResponse({
      outputText: JSON.stringify({
        report_markdown:
          "# Result\n\n[Provider](https://example.com/products/model-a?variant=blue&utm_campaign=test)",
        price_observations: [],
      }),
    });
    response.output[0].action.sources[0].url =
      "https://example.com/products/model-a?variant=blue&utm_source=openai";

    assert.equal(parseDirectTerraCompletedResponse(response).ok, true);
  });
});
