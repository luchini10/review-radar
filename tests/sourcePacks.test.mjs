import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectCategoryGroup } from "../lib/search/sourcePacks.ts";

describe("category classification", () => {
  it("classifies common product categories after removing inline constraints", () => {
    const cases = [
      ["pull out couch", "furniture"],
      ["27 inch 4K monitor", "electronics"],
      ["cordless vacuum for pet hair", "appliances"],
      ["impact wrench", "tools"],
      ["baseball glove", "outdoor"],
      ["dog bed", "pet"],
      ["red refrigerator under $1000", "appliances"],
      ["white desk with drawers under $300", "furniture"],
      ["very unusual mystery product", "general"],
    ];

    for (const [query, expected] of cases) {
      assert.equal(detectCategoryGroup(query), expected, query);
    }
  });
});
