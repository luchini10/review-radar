import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractDirectTerraResponseSources,
  parseDirectTerraCompletedResponse,
} from "../lib/directTerraResponse.ts";

const report = `# Refrigerator recommendations

## #1 Best Match — Example Model A

The exact explanation stays here. [Official source](https://example.com/products/model-a?utm_source=openai)

**Current price:** AI-reported — not independently verified by ReviewRadar.`;

function completedResponse({ outputText = JSON.stringify({ report_markdown: report }) } = {}) {
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
        content: [{ type: "output_text", text: outputText }],
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

  it("preserves an invented citation in the report but disables its link", () => {
    const invented = report.replace(
      "https://example.com/products/model-a?utm_source=openai",
      "https://invented.example/model-a",
    );
    const parsed = parseDirectTerraCompletedResponse(
      completedResponse({
        outputText: JSON.stringify({ report_markdown: invented }),
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
      outputText: JSON.stringify({ report_markdown: mixedReport }),
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
      JSON.stringify({ report_markdown: report, cards: [] }),
      JSON.stringify({ report_markdown: "# No citations" }),
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
      outputText: JSON.stringify({ report_markdown: balancedReport }),
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
      outputText: JSON.stringify({ report_markdown: bareReport }),
    });
    response.output[0].action.sources[0].url = registeredUrl;

    const accepted = parseDirectTerraCompletedResponse(response);
    assert.equal(accepted.ok, true);
    assert.deepEqual(accepted.citationUrls, [registeredUrl]);

    response.output[1].content[0].text = JSON.stringify({
      report_markdown:
        "# Result\n\nProvider page: https://invented.example/products/model-a",
    });
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
      outputText: JSON.stringify({ report_markdown: referenceReport }),
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
      }),
    });
    response.output[0].action.sources[0].url =
      "https://example.com/products/model-a?variant=blue&utm_source=openai";

    assert.equal(parseDirectTerraCompletedResponse(response).ok, true);
  });
});
