import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_CITATION_WEBSITE_RESOLVER_VERSION,
  resolveDirectTerraCitationWebsites,
} from "../lib/directTerraCitationWebsiteResolver.ts";
import {
  extractDirectTerraResponseSources,
  parseDirectTerraCompletedResponse,
} from "../lib/directTerraResponse.ts";

const ridgid = {
  key: "rank-1-ridgid-hd1200",
  rank: 1,
  productName: "RIDGID HD1200 Wet/Dry Shop Vacuum",
  brand: "RIDGID",
  model: "HD1200",
  category: "shop vacuum",
};

const dewalt = {
  key: "rank-2-dewalt-dxv12p-qt",
  rank: 2,
  productName: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
  brand: "DEWALT",
  model: "DXV12P-QT",
  category: "shop vacuum",
};

const ridgidUrl =
  "https://merchant.example/products/ridgid-hd1200?utm_source=terra&variant=standard";
const dewaltUrl =
  "https://merchant.example/products/dewalt-dxv12p-qt?variant=standard";

function source(url, title) {
  return { url, title };
}

function resolve(overrides = {}) {
  const reportMarkdown = [
    "# Shop vacuum report",
    "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
    `Exact product. [RIDGID product page](${ridgidUrl})`,
    "## #2 Best Match — DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
    `Quiet choice. [DEWALT product page](${dewaltUrl})`,
    "## Comparison table",
    "No product-section citations below this point.",
  ].join("\n\n");

  return resolveDirectTerraCitationWebsites({
    targets: [ridgid, dewalt],
    reportMarkdown,
    activeCitationUrls: [ridgidUrl, dewaltUrl],
    responseSources: [
      source(
        "https://merchant.example/products/ridgid-hd1200?utm_campaign=research&variant=standard",
        "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
      ),
      source(
        dewaltUrl,
        "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
      ),
    ],
    ...overrides,
  });
}

describe("Direct-Terra registered-citation website resolver", () => {
  it("selects exact registered product pages from their own ranked sections", () => {
    const result = resolve();

    assert.equal(
      result.resolverVersion,
      DIRECT_TERRA_CITATION_WEBSITE_RESOLVER_VERSION,
    );
    assert.deepEqual(
      result.items.map((item) => [item.rank, item.productName]),
      [
        [ridgid.rank, ridgid.productName],
        [dewalt.rank, dewalt.productName],
      ],
    );
    assert.equal(
      result.items[0].productUrl,
      "https://merchant.example/products/ridgid-hd1200?variant=standard",
    );
    assert.equal(result.items[1].productUrl, dewaltUrl);
    assert.ok(
      result.items.every(
        (item) => item.productUrlStatus === "accepted_identity_safe",
      ),
    );
  });

  it("hands an abbreviated exact-model manufacturer page to bounded page verification", () => {
    const milwaukee = {
      key: "rank-5-milwaukee-0910-20",
      rank: 5,
      productName: "Milwaukee 0910-20 M18 FUEL 6-Gallon Wet/Dry Vacuum",
      brand: "Milwaukee",
      model: "0910-20",
      category: "shop vacuum",
    };
    const exactUrl = "https://www.milwaukeetool.com/0910-20";
    const pageCandidates = [];
    const result = resolve({
      targets: [milwaukee],
      reportMarkdown: [
        `## #5 Best Match — ${milwaukee.productName}`,
        `[Official product page](${exactUrl})`,
      ].join("\n\n"),
      activeCitationUrls: [exactUrl],
      responseSources: [
        source(exactUrl, "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum"),
      ],
      recordPageFetchCandidate: (candidate) => {
        pageCandidates.push(candidate);
      },
    });

    assert.equal(result.items[0].productUrl, null);
    assert.equal(result.items[0].productUrlStatus, "unavailable");
    assert.deepEqual(pageCandidates, [
      {
        targetKey: milwaukee.key,
        rank: milwaukee.rank,
        productUrl: exactUrl,
      },
    ]);
  });

  it("does not let abbreviated titles bless sibling-model or non-brand URLs", () => {
    const milwaukee = {
      key: "rank-5-milwaukee-0910-20",
      rank: 5,
      productName: "Milwaukee 0910-20 M18 FUEL 6-Gallon Wet/Dry Vacuum",
      brand: "Milwaukee",
      model: "0910-20",
      category: "shop vacuum",
    };
    const rejected = [
      source(
        "https://www.milwaukeetool.com/0910-21",
        "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum",
      ),
      source(
        "https://merchant.example/products/0910-20",
        "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum",
      ),
      source(
        "https://www.milwaukeetool.com/0910-20",
        "DEWALT 6 Gallon Wet/Dry Vacuum",
      ),
      source(
        "https://www.milwaukeetool.com/reviews/0910-20",
        "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum Review",
      ),
      source(
        "https://milwaukeetool.evil.example/0910-20",
        "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum",
      ),
      source(
        "https://www.milwaukeetool.com/accessories/0910-20-filter",
        "Milwaukee M18 FUEL 6 Gallon Wet/Dry Vacuum",
      ),
    ];
    const result = resolve({
      targets: [milwaukee],
      reportMarkdown: [
        `## #5 Best Match — ${milwaukee.productName}`,
        ...rejected.map(
          ({ url }, index) => `[Rejected ${index + 1}](${url})`,
        ),
      ].join("\n\n"),
      activeCitationUrls: rejected.map(({ url }) => url),
      responseSources: rejected,
    });

    assert.equal(result.items[0].productUrl, null);
    assert.equal(result.items[0].productUrlStatus, "unavailable");
  });

  it("does not borrow an exact citation from another ranked product section", () => {
    const result = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        "No direct product citation in this section.",
        "## #2 Best Match — DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
        `[Wrong section](${ridgidUrl})`,
      ].join("\n\n"),
      activeCitationUrls: [ridgidUrl],
      responseSources: [
        source(ridgidUrl, "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum"),
      ],
    });

    assert.equal(result.items[0].productUrl, null);
    assert.equal(result.items[0].productUrlStatus, "unavailable");
  });

  it("fails the section closed when its ranked heading names a different model", () => {
    const result = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1600 Wet/Dry Shop Vacuum",
        `[Injected exact HD1200 link](${ridgidUrl})`,
      ].join("\n\n"),
      activeCitationUrls: [ridgidUrl],
      responseSources: [
        source(ridgidUrl, "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum"),
      ],
    });

    assert.equal(result.items[0].productUrl, null);
  });

  it("requires both active-citation ownership and response-owned source metadata", () => {
    const withoutActiveOwnership = resolve({ activeCitationUrls: [dewaltUrl] });
    assert.equal(withoutActiveOwnership.items[0].productUrl, null);

    const withoutSourceMetadata = resolve({
      responseSources: [
        source(dewaltUrl, "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum"),
      ],
    });
    assert.equal(withoutSourceMetadata.items[0].productUrl, null);

    const withoutSourceTitle = resolve({
      responseSources: [{ url: ridgidUrl }, source(dewaltUrl, dewalt.productName)],
    });
    assert.equal(withoutSourceTitle.items[0].productUrl, null);
  });

  it("rejects editorial, document, listing, wrapper, accessory, and sibling-model citations", () => {
    const rejected = [
      source(
        "https://reviews.example/articles/ridgid-hd1200-review",
        "RIDGID HD1200 Wet/Dry Shop Vacuum Review",
      ),
      source(
        "https://manuals.example/ridgid-hd1200.pdf",
        "RIDGID HD1200 Wet/Dry Shop Vacuum Manual",
      ),
      source(
        "https://merchant.example/search?q=ridgid-hd1200",
        "RIDGID HD1200 Wet/Dry Shop Vacuum",
      ),
      source(
        "https://www.google.com/shopping/product/123",
        "RIDGID HD1200 Wet/Dry Shop Vacuum",
      ),
      source(
        "https://merchant.example/products/ridgid-hd1200-filter",
        "Replacement Filter Compatible with RIDGID HD1200 Vacuum",
      ),
      source(
        "https://merchant.example/products/ridgid-hd1600",
        "RIDGID HD1600 Wet/Dry Shop Vacuum",
      ),
    ];
    const links = rejected
      .map(({ url }, index) => `[Rejected ${index + 1}](${url})`)
      .join("\n");
    const result = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        links,
      ].join("\n\n"),
      activeCitationUrls: rejected.map(({ url }) => url),
      responseSources: rejected,
    });

    assert.equal(result.items[0].productUrl, null);
    assert.equal(result.items[0].productUrlStatus, "unavailable");
  });

  it("resolves reference links but ignores links inside code and outside the ranked section", () => {
    const result = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        "Use the [exact product page][ridgid-page].",
        "```md",
        "[Injected](https://merchant.example/products/ridgid-hd1600)",
        "```",
        "## Comparison table",
        `[Too late](${dewaltUrl})`,
        "",
        `[ridgid-page]: ${ridgidUrl}`,
      ].join("\n"),
      activeCitationUrls: [ridgidUrl, dewaltUrl],
      responseSources: [
        source(ridgidUrl, "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum"),
        source(dewaltUrl, dewalt.productName),
      ],
    });

    assert.equal(
      result.items[0].productUrl,
      "https://merchant.example/products/ridgid-hd1200?variant=standard",
    );
  });

  it("uses the first duplicate reference definition, matching rendered Markdown", () => {
    const shadowedUrl =
      "https://shadowed.example/products/ridgid-hd1200?variant=standard";
    const result = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        "Use the [rendered product page][product-page].",
        "",
        `[product-page]: ${ridgidUrl}`,
        `[product-page]: ${shadowedUrl}`,
      ].join("\n"),
      activeCitationUrls: [ridgidUrl, shadowedUrl],
      responseSources: [
        source(ridgidUrl, "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum"),
        source(shadowedUrl, "RIDGID HD1200 Wet/Dry Shop Vacuum"),
      ],
    });

    assert.equal(
      result.items[0].productUrl,
      "https://merchant.example/products/ridgid-hd1200?variant=standard",
    );
  });

  it("keeps response citation ownership on the first rendered reference definition", () => {
    const shadowedUrl =
      "https://shadowed.example/products/ridgid-hd1200?variant=standard";
    const reportMarkdown = [
      "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
      "Use the [rendered product page][product-page].",
      "",
      `[product-page]: ${ridgidUrl}`,
      `[product-page]: ${shadowedUrl}`,
    ].join("\n");
    const response = {
      status: "completed",
      output: [
        {
          type: "web_search_call",
          action: {
            sources: [source(ridgidUrl, ridgid.productName), source(shadowedUrl, ridgid.productName)],
          },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ report_markdown: reportMarkdown, price_observations: [] }),
            },
          ],
        },
      ],
    };

    const parsed = parseDirectTerraCompletedResponse(response);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.citationUrls, [ridgidUrl]);
  });

  it("upgrades a titleless source duplicate without replacing an existing title", () => {
    const response = {
      output: [
        {
          type: "web_search_call",
          action: {
            sources: [
              { url: ridgidUrl },
              source(dewaltUrl, "First DEWALT title"),
            ],
          },
        },
        {
          type: "message",
          content: [
            {
              annotations: [
                {
                  type: "url_citation",
                  url: ridgidUrl,
                  title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
                },
                {
                  type: "url_citation",
                  url: dewaltUrl,
                  title: "Conflicting later DEWALT title",
                },
              ],
            },
          ],
        },
      ],
    };

    assert.deepEqual(extractDirectTerraResponseSources(response), [
      source(ridgidUrl, "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum"),
      source(dewaltUrl, "First DEWALT title"),
    ]);
  });

  it("fails duplicate ranked sections and incoherent target batches closed", () => {
    const duplicateSection = resolve({
      targets: [ridgid],
      reportMarkdown: [
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        `[First](${ridgidUrl})`,
        "## #1 Best Match — RIDGID HD1200 Wet/Dry Shop Vacuum",
        `[Duplicate](${ridgidUrl})`,
      ].join("\n\n"),
      activeCitationUrls: [ridgidUrl],
      responseSources: [source(ridgidUrl, ridgid.productName)],
    });
    assert.equal(duplicateSection.items[0].productUrl, null);

    assert.throws(
      () => resolve({ targets: [ridgid, { ...dewalt, rank: 1 }] }),
      /duplicate target rank/i,
    );
    assert.throws(
      () => resolve({ targets: [{ ...ridgid, productName: dewalt.productName }] }),
      /incoherent target/i,
    );
  });

  it("returns only bounded card-safe fields and never source titles or diagnostics", () => {
    const result = resolve();
    const serialized = JSON.stringify(result);

    assert.deepEqual(Object.keys(result.items[0]).sort(), [
      "productName",
      "productUrl",
      "productUrlStatus",
      "rank",
      "targetKey",
    ]);
    assert.equal(serialized.includes("12 Gallon"), false);
    assert.equal(serialized.includes("utm_"), false);
    assert.equal(serialized.includes("responseSources"), false);
    assert.equal(serialized.includes("activeCitationUrls"), false);
  });
});
