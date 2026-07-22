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
  it("prefers a registered Terra product website and adds exact Serper images", async () => {
    const requests = [];
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
        requests.push(request);
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
                  productLink: "https://store.example/dewalt-dxv12p-qt",
                  imageUrl: "https://images.example/dewalt-dxv12p-qt.jpg",
                },
          ],
        };
      },
    });

    assert.equal(requests.length, 2);
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
      "https://store.example/dewalt-dxv12p-qt",
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
    });

    assert.equal(result.length, 2);
    assert.ok(
      result.every(
        (asset) => asset.productUrl === null && asset.imageUrl === null,
      ),
    );
  });
});
