import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import {
  DIRECT_TERRA_SERPER_ASSET_ADAPTER_VERSION,
  DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
  MAX_DIRECT_TERRA_ASSET_TARGETS,
  MAX_DIRECT_TERRA_SHOPPING_RESULTS,
  buildDirectTerraAssetQuery,
  resolveDirectTerraAssetsWithSerperShopping,
} from "../lib/directTerraSerperAssetAdapter.ts";

const q7 = {
  key: "rank-1-q7-m5-plus",
  rank: 1,
  productName: "Roborock Q7 M5+ Robot Vacuum",
  brand: "Roborock",
  model: "Q7 M5+",
  category: "robot vacuum",
};

const ridgid = {
  key: "rank-2-hd1600",
  rank: 2,
  productName: "RIDGID HD1600 Wet/Dry Shop Vacuum",
  brand: "RIDGID",
  model: "HD1600",
  category: "shop vacuum",
};

const aeron = {
  key: "rank-3-aeron",
  rank: 3,
  productName: "Herman Miller Aeron Chair",
  brand: "Herman Miller",
  model: "Aeron",
  category: "office chair",
};

const shoppingRow = (overrides = {}) => ({
  title: "Roborock Q7 M5+ Robot Vacuum and Mop with Auto-Empty Dock",
  productLink:
    "https://merchant.example/products/roborock-q7-m5-plus?utm_source=shopping&variant=q7m5",
  imageUrl: "https://images.example.com/products/roborock-q7-m5-plus.jpg",
  snippet: "Robot vacuum and mop with an auto-empty dock.",
  source: "Merchant Name",
  price: "$399.99",
  position: 1,
  productId: "provider-secret-id",
  ...overrides,
});

describe("Direct-Terra mocked Serper Shopping asset adapter", () => {
  it("builds one narrow identity query and sends the exact bounded Shopping request", async () => {
    const requests = [];
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [q7],
      transport: async (request) => {
        requests.push(request);
        return { shopping: [shoppingRow()] };
      },
    });

    assert.equal(buildDirectTerraAssetQuery(q7), "Roborock Q7 M5+ robot vacuum");
    assert.deepEqual(requests, [
      {
        endpoint: DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
        body: {
          q: "Roborock Q7 M5+ robot vacuum",
          gl: "us",
          hl: "en",
          num: MAX_DIRECT_TERRA_SHOPPING_RESULTS,
        },
      },
    ]);
    assert.equal(result.adapterVersion, DIRECT_TERRA_SERPER_ASSET_ADAPTER_VERSION);
    assert.equal(result.transportCallCount, 1);
    assert.equal(result.items[0].providerStatus, "completed");
    assert.equal(result.items[0].verification.targetKey, q7.key);
    assert.equal(result.items[0].verification.rank, q7.rank);
    assert.equal(result.items[0].verification.productName, q7.productName);
    assert.equal(
      result.items[0].verification.productUrl,
      "https://merchant.example/products/roborock-q7-m5-plus?variant=q7m5",
    );
    assert.equal(
      result.items[0].verification.imageUrl,
      "https://images.example.com/products/roborock-q7-m5-plus.jpg",
    );
  });

  it("issues exactly one request per locked Terra product in rank order", async () => {
    const queries = [];
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [aeron, q7, ridgid],
      transport: async ({ body }) => {
        queries.push(body.q);
        return { shopping: [] };
      },
    });

    assert.deepEqual(queries, [
      "Roborock Q7 M5+ robot vacuum",
      "RIDGID HD1600 shop vacuum",
      "Herman Miller Aeron office chair",
    ]);
    assert.equal(result.transportCallCount, 3);
    assert.deepEqual(
      result.items.map((item) => item.verification.targetKey),
      [q7.key, ridgid.key, aeron.key],
    );
    assert.ok(
      result.items.every(
        (item) =>
          item.verification.productUrlStatus === "unavailable" &&
          item.verification.imageUrlStatus === "unavailable",
      ),
    );
  });

  it("validates the complete batch before dispatch and rejects duplicate or incoherent targets", async () => {
    let calls = 0;
    const transport = async () => {
      calls += 1;
      return { shopping: [] };
    };

    await assert.rejects(
      resolveDirectTerraAssetsWithSerperShopping({
        targets: [q7, { ...ridgid, key: q7.key }],
        transport,
      }),
      /duplicate target key/i,
    );
    await assert.rejects(
      resolveDirectTerraAssetsWithSerperShopping({
        targets: [{ ...q7, productName: "Roborock Q10 X5+ Robot Vacuum" }],
        transport,
      }),
      /incoherent target/i,
    );
    await assert.rejects(
      resolveDirectTerraAssetsWithSerperShopping({
        targets: Array.from({ length: MAX_DIRECT_TERRA_ASSET_TARGETS + 1 }, (_, index) => ({
          ...q7,
          key: `rank-${index + 1}-q7`,
          rank: index + 1,
        })),
        transport,
      }),
      /target ceiling/i,
    );
    assert.equal(calls, 0);
  });

  it("fails closed on malformed or oversized Shopping responses without reading organic fallback rows", async () => {
    const responses = [
      { organic: [shoppingRow()] },
      { error: "provider error", shopping: [shoppingRow()] },
      { shopping: Array.from({ length: MAX_DIRECT_TERRA_SHOPPING_RESULTS + 1 }, () => shoppingRow()) },
    ];
    let callIndex = 0;

    for (const response of responses) {
      const result = await resolveDirectTerraAssetsWithSerperShopping({
        targets: [q7],
        transport: async () => {
          callIndex += 1;
          return response;
        },
      });

      assert.equal(result.items[0].providerStatus, "invalid_response");
      assert.equal(result.items[0].verification.productUrl, null);
      assert.equal(result.items[0].verification.imageUrl, null);
      assert.equal(result.items[0].mappedCandidateCount, 0);
    }
    assert.equal(callIndex, 3);
  });

  it("does not retry a failed transport and can fail only that product closed", async () => {
    const queries = [];
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [q7, ridgid],
      transport: async ({ body }) => {
        queries.push(body.q);
        if (queries.length === 1) throw new Error("mock timeout");
        return { shopping: [] };
      },
    });

    assert.deepEqual(queries, [
      "Roborock Q7 M5+ robot vacuum",
      "RIDGID HD1600 shop vacuum",
    ]);
    assert.equal(result.transportCallCount, 2);
    assert.equal(result.items[0].providerStatus, "transport_error");
    assert.equal(result.items[1].providerStatus, "completed");
  });

  it("selects a direct merchant field without unwrapping a Google Shopping URL", async () => {
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [q7],
      transport: async () => ({
        shopping: [
          shoppingRow({
            productLink:
              "https://www.google.com/shopping/product/123?url=https%3A%2F%2Fevil.example%2Ffake",
            link: "https://merchant.example/products/roborock-q7-m5-plus?variant=q7m5",
          }),
        ],
      }),
    });

    assert.equal(
      result.items[0].verification.productUrl,
      "https://merchant.example/products/roborock-q7-m5-plus?variant=q7m5",
    );
    assert.equal(JSON.stringify(result).includes("evil.example"), false);
  });

  it("feeds normalized rows through the Phase 1 identity, page, type, and image boundary", async () => {
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [q7],
      transport: async () => ({
        shopping: [
          shoppingRow({
            title: "Roborock Q10 X5+ Robot Vacuum",
            productLink: "https://merchant.example/products/roborock-q10-x5-plus",
          }),
          shoppingRow({
            title: "Replacement Filter for Roborock Q7 M5+ Robot Vacuum",
            productLink: "https://merchant.example/products/q7-m5-plus-filter",
          }),
          shoppingRow({
            productLink: "https://reviews.example/articles/roborock-q7-m5-plus-review",
          }),
          shoppingRow({
            imageUrl: "https://images.example.com/products/roborock-q10-s5.jpg",
            productLink: "https://www.google.com/shopping/product/123",
          }),
        ],
      }),
    });

    assert.equal(result.items[0].verification.productUrl, null);
    assert.equal(result.items[0].verification.imageUrl, null);
    assert.equal(result.items[0].verification.decisions.length, 4);
  });

  it("maps only bounded title, product-page, image, and snippet fields", async () => {
    let diagnostic;
    const result = await resolveDirectTerraAssetsWithSerperShopping({
      targets: [q7],
      transport: async () => ({ shopping: [shoppingRow()] }),
      recordDiagnostic: (value) => {
        diagnostic = value;
      },
    });

    assert.deepEqual(diagnostic, {
      targetKey: q7.key,
      rank: q7.rank,
      query: "Roborock Q7 M5+ robot vacuum",
      providerStatus: "completed",
      rawShoppingResultCount: 1,
      mappedCandidateCount: 1,
    });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("provider-secret-id"), false);
    assert.equal(serialized.includes("Merchant Name"), false);
    assert.equal(serialized.includes("$399.99"), false);
    assert.equal(serialized.includes("Roborock Q7 M5+ robot vacuum"), false);
  });

  it("contains no live client, secret, cache, retry, route, or UI dependency", async () => {
    const source = await readFile(
      new URL("../lib/directTerraSerperAssetAdapter.ts", import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /process\.env/);
    assert.doesNotMatch(source, /search\/serper/);
    assert.doesNotMatch(source, /app\/api|components\//);
    assert.doesNotMatch(source, /retry|cache/i);
  });
});
