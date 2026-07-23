import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT,
  MAX_DIRECT_TERRA_ORGANIC_RESULTS,
  buildDirectTerraOrganicProductPageQuery,
  resolveDirectTerraWebsitesWithSerperOrganic,
} from "../lib/directTerraSerperOrganicAdapter.ts";
import { buildDirectTerraAssetQuery } from "../lib/directTerraSerperAssetAdapter.ts";

const ridgid = {
  key: "rank-1-ridgid-hd1200",
  rank: 1,
  productName: "RIDGID HD1200 Wet/Dry Shop Vacuum",
  brand: "RIDGID",
  model: "HD1200",
  category: "RIDGID HD1200 Wet/Dry Shop Vacuum",
};

const dewalt = {
  key: "rank-2-dewalt-dxv12p-qt",
  rank: 2,
  productName: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
  brand: "DEWALT",
  model: "DXV12P-QT",
  category: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
};

describe("Direct-Terra bounded Serper organic website resolver", () => {
  it("runs one exact product-page query per missing target and accepts only exact pages", async () => {
    const requests = [];
    const batch = await resolveDirectTerraWebsitesWithSerperOrganic({
      targets: [dewalt, ridgid],
      transport: async (request) => {
        requests.push(request);
        const isRidgid = request.body.q.includes("HD1200");
        return {
          organic: [
            {
              title: isRidgid
                ? "RIDGID HD1600 Wet/Dry Shop Vacuum"
                : "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum",
              link: isRidgid
                ? "https://merchant.example/ridgid-hd1600"
                : "https://merchant.example/dewalt-dxv12p-qt",
              snippet: "Exact product page.",
            },
          ],
        };
      },
    });

    assert.equal(requests.length, 2);
    assert.deepEqual(
      requests.map((request) => request.endpoint),
      [DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT, DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT],
    );
    assert.deepEqual(
      requests.map((request) => request.body),
      [
        {
          q: "RIDGID HD1200 Wet/Dry Shop Vacuum product page",
          gl: "us",
          hl: "en",
          num: MAX_DIRECT_TERRA_ORGANIC_RESULTS,
        },
        {
          q: "DEWALT DXV12P-QT Stealthsonic Wet/Dry Shop Vacuum product page",
          gl: "us",
          hl: "en",
          num: MAX_DIRECT_TERRA_ORGANIC_RESULTS,
        },
      ],
    );
    assert.equal(batch.transportCallCount, 2);
    assert.equal(batch.items[0].productUrl, null);
    assert.equal(
      batch.items[1].productUrl,
      "https://merchant.example/dewalt-dxv12p-qt",
    );
    assert.equal(JSON.stringify(batch).includes("provider"), false);
    assert.equal(JSON.stringify(batch).includes("product page"), false);
  });

  it("rejects accessories, editorial pages, wrappers, and sibling models", async () => {
    const batch = await resolveDirectTerraWebsitesWithSerperOrganic({
      targets: [ridgid],
      transport: async () => ({
        organic: [
          {
            title: "Replacement Filter for RIDGID HD1200",
            link: "https://merchant.example/products/ridgid-hd1200-filter",
          },
          {
            title: "RIDGID HD1200 Wet/Dry Shop Vacuum Review",
            link: "https://editorial.example/reviews/ridgid-hd1200",
          },
          {
            title: "RIDGID HD1200 Wet/Dry Shop Vacuum",
            link: "https://linksynergy.com/deeplink/ridgid-hd1200",
          },
          {
            title: "RIDGID HD1600 Wet/Dry Shop Vacuum",
            link: "https://merchant.example/products/ridgid-hd1600",
          },
        ],
      }),
    });

    assert.equal(batch.items[0].productUrl, null);
  });

  it("fails each target closed on provider errors, schema drift, or transport failure", async () => {
    for (const transport of [
      async () => ({ error: "denied", organic: [] }),
      async () => ({ error: { message: "denied" }, organic: [] }),
      async () => ({ shopping: [] }),
      async () => {
        throw new Error("network failure");
      },
    ]) {
      const batch = await resolveDirectTerraWebsitesWithSerperOrganic({
        targets: [ridgid],
        transport,
      });
      assert.equal(batch.transportCallCount, 1);
      assert.equal(batch.items[0].productUrl, null);
    }
  });

  it("preflights coherent unique targets and the five-target cap before dispatch", async () => {
    let calls = 0;
    const transport = async () => {
      calls += 1;
      return { organic: [] };
    };

    await assert.rejects(
      resolveDirectTerraWebsitesWithSerperOrganic({
        targets: [ridgid, { ...ridgid }],
        transport,
      }),
      /Duplicate target/,
    );
    await assert.rejects(
      resolveDirectTerraWebsitesWithSerperOrganic({
        targets: Array.from({ length: 6 }, (_, index) => ({
          ...ridgid,
          key: `target-${index}`,
          rank: index + 1,
        })),
        transport,
      }),
      /ceiling is 5/,
    );
    assert.equal(calls, 0);
  });

  it("builds bounded deterministic queries only from coherent target identity", () => {
    assert.equal(
      buildDirectTerraOrganicProductPageQuery(ridgid),
      "RIDGID HD1200 Wet/Dry Shop Vacuum product page",
    );
    assert.throws(
      () =>
        buildDirectTerraOrganicProductPageQuery({
          ...ridgid,
          productName: "DEWALT HD1200 Wet/Dry Shop Vacuum",
        }),
      /Incoherent target/,
    );
    const categoryTokens = ["Vacuum"];
    let longTarget;
    for (let index = 0; index < 100; index += 1) {
      categoryTokens.push(
        `feature${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + (index % 26))}`,
      );
      const category = categoryTokens.join(" ");
      const candidate = {
        ...ridgid,
        productName: `RIDGID HD1200 ${category}`,
        category,
      };
      const baseLength = buildDirectTerraAssetQuery(candidate).length;
      if (baseLength > 167) {
        longTarget = candidate;
        break;
      }
    }
    assert.ok(longTarget, "fixture must fit the Shopping query ceiling");
    assert.throws(
      () => buildDirectTerraOrganicProductPageQuery(longTarget),
      /Invalid organic identity query/,
    );
  });
});
