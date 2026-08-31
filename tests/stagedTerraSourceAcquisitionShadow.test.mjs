import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareStagedTerraSourceAcquisitionShadow } from "../scripts/staged-terra-source-acquisition-shadow.mjs";

const targets = [
  {
    key: "candidate-1",
    rank: 1,
    productName: "RIDGID HD1200 Wet Dry Vacuum",
    brand: "RIDGID",
    model: "HD1200",
    category: "Wet Dry Vacuum",
  },
  {
    key: "candidate-2",
    rank: 2,
    productName: "CRAFTSMAN CMXEVBE17595 Wet Dry Vacuum",
    brand: "CRAFTSMAN",
    model: "CMXEVBE17595",
    category: "Wet Dry Vacuum",
  },
];

describe("staged Terra source-acquisition shadow comparison", () => {
  it("measures candidate-local exact-page recovery without exposing identities", async () => {
    const queries = [];
    const result = await compareStagedTerraSourceAcquisitionShadow({
      targets,
      responseOwnedCandidates: new Map([
        ["candidate-1", [{ productUrl: "https://editorial.example/shop-vacs" }]],
        ["candidate-2", [{ title: "Best wet dry vacuums", productUrl: "https://editorial.example/best" }]],
      ]),
      organicTransport: async (request) => {
        queries.push(request.body.q);
        const ridgid = request.body.q.includes("HD1200");
        return {
          organic: [
            ridgid
              ? {
                  title: "RIDGID HD1200 12 Gallon Wet Dry Vacuum",
                  link: "https://www.homedepot.com/p/RIDGID-HD1200/123",
                }
              : {
                  title: "CRAFTSMAN CMXEVBE17595 Replacement Filter",
                  link: "https://merchant.example/cmxevbe17595-filter",
                },
          ],
        };
      },
    });

    assert.deepEqual(result, {
      submittedCandidates: 2,
      baselineAcceptedCandidates: 0,
      resolverAttemptedCandidates: 2,
      resolverAcceptedCandidates: 1,
      recoverableCandidates: 1,
    });
    assert.equal(queries.length, 2);
    assert.equal(JSON.stringify(result).includes("RIDGID"), false);
    assert.equal(JSON.stringify(result).includes("candidate-1"), false);
  });

  it("rejects cross-candidate borrowing and enforces the five-target ceiling before calls", async () => {
    let calls = 0;
    const result = await compareStagedTerraSourceAcquisitionShadow({
      targets,
      responseOwnedCandidates: new Map(),
      organicTransport: async (request) => {
        calls += 1;
        return {
          organic: [
            request.body.q.includes("HD1200")
              ? {
                  title: "CRAFTSMAN CMXEVBE17595 Wet Dry Vacuum",
                  link: "https://merchant.example/cmxevbe17595",
                }
              : {
                  title: "RIDGID HD1200 Wet Dry Vacuum",
                  link: "https://merchant.example/hd1200",
                },
          ],
        };
      },
    });
    assert.equal(result.resolverAcceptedCandidates, 0);
    assert.equal(calls, 2);

    await assert.rejects(
      compareStagedTerraSourceAcquisitionShadow({
        targets: Array.from({ length: 6 }, (_, index) => ({
          ...targets[0],
          key: `candidate-${index}`,
          rank: index + 1,
        })),
        responseOwnedCandidates: new Map(),
        organicTransport: async () => {
          calls += 1;
          return { organic: [] };
        },
      }),
      /ceiling is 5/,
    );
    assert.equal(calls, 2);
  });

  it("rejects duplicate identities and unbounded baseline buckets before lookup or transport", async () => {
    let calls = 0;
    const transport = async () => {
      calls += 1;
      return { organic: [] };
    };
    await assert.rejects(
      compareStagedTerraSourceAcquisitionShadow({
        targets: [targets[0], { ...targets[1], key: targets[0].key }],
        responseOwnedCandidates: new Map([
          [
            targets[0].key,
            [
              {
                title: "RIDGID HD1200 Wet Dry Vacuum",
                productUrl: "https://merchant.example/hd1200",
              },
            ],
          ],
        ]),
        organicTransport: transport,
      }),
      /must be unique/,
    );
    await assert.rejects(
      compareStagedTerraSourceAcquisitionShadow({
        targets: [targets[0]],
        responseOwnedCandidates: new Map([
          [
            targets[0].key,
            Array.from({ length: 3 }, (_, index) => ({
              title: "RIDGID HD1200 Wet Dry Vacuum",
              productUrl: `https://merchant.example/hd1200-${index}`,
            })),
          ],
        ]),
        organicTransport: transport,
      }),
      /source ceiling exceeded/,
    );
    await assert.rejects(
      compareStagedTerraSourceAcquisitionShadow({
        targets: [targets[0]],
        responseOwnedCandidates: new Map([[targets[0].key, {}]]),
        organicTransport: transport,
      }),
      /source ceiling exceeded/,
    );
    assert.equal(calls, 0);
  });
});
