import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const directFiles = [
  "app/api/recommendations-v2/route.ts",
  "lib/directTerraPrompt.ts",
  "lib/directTerraResponse.ts",
  "lib/directTerraResearchAdapter.ts",
  "lib/directTerraRecommendationRoute.ts",
];

const forbidden = [
  "search/serper",
  "normalizeResearchResult",
  "recommendationFunnel",
  "recommendationScoring",
  "searchCandidateFallback",
  "twoLayerFormatter",
  "twoLayerRecommendation",
  "requirementEvidenceRescue",
  "productIdentity",
];

describe("direct Terra V2 architecture boundary", () => {
  it("has a standalone endpoint with no legacy discovery or reconstruction imports", () => {
    for (const relativePath of directFiles) {
      const source = fs.readFileSync(path.join(root, relativePath), "utf8");
      for (const name of forbidden) {
        assert.equal(
          source.includes(name),
          false,
          `${relativePath} must not import or call ${name}`,
        );
      }
    }
  });
});
