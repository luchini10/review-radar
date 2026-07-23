import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDirectTerraProductAssets } from "../lib/directTerraProductAssets.ts";

const targets = [
  {
    key: "rank-1-ridgid-hd1200",
    rank: 1,
    productName: "RIDGID HD1200 Wet/Dry Shop Vacuum",
    brand: "RIDGID",
    model: "HD1200",
    category: "RIDGID HD1200 Wet/Dry Shop Vacuum",
  },
  {
    key: "rank-2-dewalt-dxv12p-qt",
    rank: 2,
    productName: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
    brand: "DEWALT",
    model: "DXV12P-QT",
    category: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
  },
];

const ridgidCitation = "https://ridgid.example/products/hd1200?utm_source=terra";
const reportMarkdown = [
  "# Shop vacuum report",
  "## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum",
  `Research [product page](${ridgidCitation}).`,
  "## #2 Best Match - DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
  "Research without a product-page citation.",
].join("\n\n");

describe("Direct-Terra product asset orchestration", () => {
  it("uses strict citations first, organic fallback websites, and Shopping only for images", async () => {
    const shoppingRequests = [];
    const organicRequests = [];
    const result = await resolveDirectTerraProductAssets({
      targets,
      reportMarkdown,
      activeCitationUrls: [ridgidCitation],
      responseSources: [
        {
          url: ridgidCitation,
          title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
        },
      ],
      serperTransport: async (request) => {
        shoppingRequests.push(request);
        const isRidgid = request.body.q.includes("HD1200");
        return {
          shopping: [
            isRidgid
              ? {
                  title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
                  productLink: "https://store.example/ridgid-hd1200",
                  imageUrl: "https://images.example/ridgid-hd1200.jpg",
                }
              : {
                  title:
                    "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
                  productLink: "https://shopping.example/dewalt-dxv12p-qt",
                  imageUrl: "https://images.example/dewalt-dxv12p-qt.jpg",
                },
          ],
        };
      },
      serperOrganicTransport: async (request) => {
        organicRequests.push(request);
        return {
          organic: [
            {
              title: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
              link: "https://www.lowes.com/pd/DEWALT-DXV12P-QT-Wet-Dry-Vac/5013026391",
            },
          ],
        };
      },
    });

    assert.equal(shoppingRequests.length, 2);
    assert.equal(organicRequests.length, 1, "citation-covered products spend no organic call");
    assert.match(organicRequests[0].body.q, /DXV12P-QT.*product page/);
    assert.deepEqual(
      result.map((asset) => [asset.rank, asset.productName]),
      targets.map((target) => [target.rank, target.productName]),
    );
    assert.equal(
      result[0].productUrl,
      "https://ridgid.example/products/hd1200",
      "response-owned citation must outrank a Shopping merchant fallback",
    );
    assert.equal(result[0].imageUrl, "https://images.example/ridgid-hd1200.jpg");
    assert.equal(
      result[1].productUrl,
      "https://www.lowes.com/pd/DEWALT-DXV12P-QT-Wet-Dry-Vac/5013026391",
      "Shopping destinations are not a website source; a popular-retailer organic page is",
    );
    assert.equal(
      result[1].imageUrl,
      "https://images.example/dewalt-dxv12p-qt.jpg",
    );
  });

  it("uses registered websites without spending a Shopping request", async () => {
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown,
      activeCitationUrls: [ridgidCitation],
      responseSources: [
        {
          url: ridgidCitation,
          title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
        },
      ],
    });

    assert.equal(result[0].productUrl, "https://ridgid.example/products/hd1200");
    assert.equal(result[0].imageUrl, null);
  });

  it("keeps every Terra product when Shopping fails", async () => {
    const result = await resolveDirectTerraProductAssets({
      targets,
      reportMarkdown: reportMarkdown.replace(ridgidCitation, "https://editorial.example/best-vacuums"),
      activeCitationUrls: [],
      responseSources: [],
      serperTransport: async () => {
        throw new Error("provider unavailable");
      },
      serperOrganicTransport: async () => {
        throw new Error("provider unavailable");
      },
    });

    assert.equal(result.length, 2);
    assert.ok(
      result.every(
        (asset) => asset.productUrl === null && asset.imageUrl === null,
      ),
    );
  });

  it("starts the independent website and image lanes concurrently", async () => {
    let releaseOrganic;
    const organicStarted = new Promise((resolve) => {
      releaseOrganic = resolve;
    });
    let shoppingStarted = false;

    const resultPromise = resolveDirectTerraProductAssets({
      targets: [targets[1]],
      reportMarkdown,
      activeCitationUrls: [],
      responseSources: [],
      serperTransport: async () => {
        shoppingStarted = true;
        releaseOrganic();
        return { shopping: [] };
      },
      serperOrganicTransport: async () => {
        await organicStarted;
        return { organic: [] };
      },
    });

    await resultPromise;
    assert.equal(shoppingStarted, true);
  });

  it("upgrades a weak-host citation to a popular-retailer organic page and cleans the query (T8B)", async () => {
    const weakCitation = "https://portal.randomshop.example/item/hd1200";
    const upgradeReport = [
      "# Shop vacuum report",
      "## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum",
      `Research [product page](${weakCitation}).`,
    ].join("\n\n");
    const organicRequests = [];
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: upgradeReport,
      activeCitationUrls: [weakCitation],
      responseSources: [
        { url: weakCitation, title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum" },
      ],
      serperOrganicTransport: async (request) => {
        organicRequests.push(request);
        return {
          organic: [
            {
              title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum - The Home Depot",
              link: "https://www.homedepot.com/p/RIDGID-HD1200-Wet-Dry-Vac/304123456?MERCH=REC-_-pip_alternatives-_-x",
            },
          ],
        };
      },
    });

    assert.equal(
      organicRequests.length,
      1,
      "a weak-host citation still gets an organic upgrade attempt",
    );
    assert.equal(
      result[0].productUrl,
      "https://www.homedepot.com/p/RIDGID-HD1200-Wet-Dry-Vac/304123456",
      "popular-retailer model-slug page outranks the weak citation, with the query stripped",
    );
  });

  it("prefers the verified page's own photo and canonical URL over the Shopping thumbnail (T8B)", async () => {
    // Lowe's is not bot-walled, so the page fetch proceeds (Home Depot/Amazon
    // are skipped). The slug carries the model so identity resolves.
    const organicUrl =
      "https://www.lowes.com/pd/RIDGID-HD1200-Wet-Dry-Vac/304123456";
    const canonicalUrl =
      "https://www.lowes.com/pd/RIDGID-HD1200-Wet-Dry-Shop-Vacuum/304123456";
    const fetchedPages = [];
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: "# Report\n\n## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum\n\nNo citation.",
      activeCitationUrls: [],
      responseSources: [],
      serperTransport: async () => ({
        shopping: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
            imageUrl: "https://images.example/ridgid-hd1200-thumb.jpg",
          },
        ],
      }),
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum - The Home Depot",
            link: organicUrl,
          },
        ],
      }),
      productPageTransport: async (url) => {
        fetchedPages.push(url);
        return {
          finalUrl: organicUrl,
          html: [
            "<html><head>",
            "<title>RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum - Lowe's</title>",
            `<link rel="canonical" href="${canonicalUrl}">`,
            '<meta property="og:image" content="https://mobileimages.lowes.com/productimages/ridgid-hd1200-main.jpg">',
            "</head><body></body></html>",
          ].join(""),
        };
      },
    });

    assert.deepEqual(fetchedPages, [organicUrl], "exactly one bounded fetch of the verified page");
    assert.equal(
      result[0].imageUrl,
      "https://mobileimages.lowes.com/productimages/ridgid-hd1200-main.jpg",
      "the retailer page's own photo outranks the Shopping thumbnail",
    );
    assert.equal(
      result[0].productUrl,
      canonicalUrl,
      "the page's identity-proven canonical becomes the displayed link",
    );
  });

  it("runs a retailer-scoped second-chance query only for link-less products (T8B iteration 2)", async () => {
    const organicQueries = [];
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: "# Report\n\n## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum\n\nNo citation.",
      activeCitationUrls: [],
      responseSources: [],
      serperOrganicTransport: async (request) => {
        organicQueries.push(request.body.q);
        // The open product-page query finds nothing acceptable; the
        // retailer-scoped retry finds the Home Depot page.
        if (request.body.q.includes("site:")) {
          return {
            organic: [
              {
                title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum - The Home Depot",
                link: "https://www.homedepot.com/p/RIDGID-HD1200-Wet-Dry-Vac/304123456",
              },
            ],
          };
        }
        return { organic: [] };
      },
    });

    assert.equal(organicQueries.length, 2);
    assert.match(organicQueries[0], /product page$/);
    assert.match(
      organicQueries[1],
      /site:homedepot\.com OR site:lowes\.com/,
      "the second pass is scoped to popular retailers",
    );
    assert.equal(
      result[0].productUrl,
      "https://www.homedepot.com/p/RIDGID-HD1200-Wet-Dry-Vac/304123456",
    );
  });

  it("skips page fetches for bot-walled hosts without consuming the budget (T8B iteration 2)", async () => {
    const fetchedPages = [];
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: "# Report\n\n## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum\n\nNo citation.",
      activeCitationUrls: [],
      responseSources: [],
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
            link: "https://www.amazon.com/RIDGID-HD1200-Wet-Dry-Vac/dp/B00TEST123",
          },
        ],
      }),
      productPageTransport: async (url) => {
        fetchedPages.push(url);
        return null;
      },
    });

    assert.deepEqual(fetchedPages, [], "amazon.com is never fetched");
    assert.equal(
      result[0].productUrl,
      "https://www.amazon.com/RIDGID-HD1200-Wet-Dry-Vac/dp/B00TEST123",
      "the verified Amazon link itself is still displayed",
    );
  });

  it("never displays an identity-verified link on an obscure (other) host (T8C)", async () => {
    // The only accepted website is on an obscure store. The goal is a link on
    // the brand site or a popular retailer, so the card shows no link (and
    // keeps its thumbnail) rather than an unrecognized store.
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: "# Report\n\n## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum\n\nNo citation.",
      activeCitationUrls: [],
      responseSources: [],
      serperTransport: async () => ({
        shopping: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
            imageUrl: "https://images.example/ridgid-hd1200-thumb.jpg",
          },
        ],
      }),
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
            link: "https://martdiscover.example/product/rigid-hd1200-vac",
          },
        ],
      }),
    });

    assert.equal(result[0].productUrl, null, "obscure-host link is not displayed");
    assert.equal(
      result[0].imageUrl,
      "https://images.example/ridgid-hd1200-thumb.jpg",
      "the thumbnail still shows",
    );
  });

  it("keeps the verified link and thumbnail when the page fetch fails (T8B)", async () => {
    const organicUrl =
      "https://www.homedepot.com/p/RIDGID-HD1200-Wet-Dry-Vac/304123456";
    const result = await resolveDirectTerraProductAssets({
      targets: [targets[0]],
      reportMarkdown: "# Report\n\n## #1 Best Match - RIDGID HD1200 Wet/Dry Shop Vacuum\n\nNo citation.",
      activeCitationUrls: [],
      responseSources: [],
      serperTransport: async () => ({
        shopping: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum",
            imageUrl: "https://images.example/ridgid-hd1200-thumb.jpg",
          },
        ],
      }),
      serperOrganicTransport: async () => ({
        organic: [
          {
            title: "RIDGID HD1200 12 Gallon Wet/Dry Shop Vacuum - The Home Depot",
            link: organicUrl,
          },
        ],
      }),
      productPageTransport: async () => null,
    });

    assert.equal(result[0].productUrl, organicUrl);
    assert.equal(result[0].imageUrl, "https://images.example/ridgid-hd1200-thumb.jpg");
  });
});
