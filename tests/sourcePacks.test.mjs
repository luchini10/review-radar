import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectCategoryGroup,
  generateRetailerDomainQueries,
  getSearchDepthConfig,
  getSourcePack,
} from "../lib/search/sourcePacks.ts";

describe("category-aware source packs", () => {
  it("detects common product categories", () => {
    assert.equal(detectCategoryGroup("pull out couch"), "furniture");
    assert.equal(detectCategoryGroup("27 inch 4K monitor"), "electronics");
    assert.equal(detectCategoryGroup("cordless vacuum for pet hair"), "appliances");
    assert.equal(detectCategoryGroup("impact wrench"), "tools");
    assert.equal(detectCategoryGroup("baseball glove"), "outdoor");
    assert.equal(detectCategoryGroup("dog bed"), "pet");
    assert.equal(detectCategoryGroup("red refrigerator under $1000"), "appliances");
    assert.equal(detectCategoryGroup("white desk with drawers under $300"), "furniture");
    assert.equal(detectCategoryGroup("very unusual mystery product"), "general");
  });

  it("selects category-specific retailer domains", () => {
    const furniture = getSourcePack("furniture");
    const electronics = getSourcePack("electronics");

    assert.ok(furniture.retailerDomains.includes("wayfair.com"));
    assert.ok(furniture.retailerDomains.includes("ikea.com"));
    assert.ok(
      furniture.retailerDomains.indexOf("ashleyfurniture.com") <
        furniture.retailerDomains.indexOf("walmart.com"),
    );
    assert.equal(furniture.directRetailerEngines.includes("walmart"), false);
    assert.ok(electronics.retailerDomains.includes("bestbuy.com"));
    assert.ok(electronics.retailerDomains.includes("newegg.com"));
    assert.ok(
      electronics.retailerDomains.indexOf("bhphotovideo.com") <
        electronics.retailerDomains.indexOf("walmart.com"),
    );
    assert.equal(electronics.directRetailerEngines.includes("walmart"), false);
  });

  it("generates retailer-domain Google queries from the source pack", () => {
    const config = getSearchDepthConfig("standard");
    const queries = generateRetailerDomainQueries(
      {
        budget: "$1500",
        priorities: "Less than 64 inches",
        query: "pull out couch",
        selectedFeatures: ["Color: Black", "Size: Full"],
      },
      "furniture",
      config,
    );
    const joined = queries.join("\n").toLowerCase();

    assert.equal(queries.length, config.maxRetailerDomainQueries);
    assert.match(joined, /site:wayfair\.com/);
    assert.match(joined, /black/);
    assert.match(joined, /under 64 inches/);
  });

  it("uses a clean base category for retailer-domain queries with inline filters", () => {
    const config = getSearchDepthConfig("standard");
    const queries = generateRetailerDomainQueries(
      {
        query: "red refrigerator under $1000",
      },
      "appliances",
      config,
    );
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /site:ajmadison\.com fridge red under 1000/);
    assert.doesNotMatch(joined, /red refrigerator under \$1000 under/);
  });

  it("uses dev search depth by default and supports standard/deep", () => {
    assert.equal(getSearchDepthConfig("").depth, "dev");
    const devConfig = getSearchDepthConfig("dev");

    assert.equal(devConfig.maxGoogleShoppingQueries, 3);
    assert.equal(devConfig.maxGoogleOrganicQueries, 1);
    assert.equal(devConfig.maxRetailerDomainQueries, 3);
    assert.equal(devConfig.maxDirectRetailerQueries, 1);
    assert.equal(devConfig.maxEnrichedProducts, 6);
    assert.equal(devConfig.maxRawCandidates, 50);
    assert.equal(getSearchDepthConfig("standard").maxRawCandidates, 75);
    assert.equal(getSearchDepthConfig("deep").maxRawCandidates, 100);
  });
});
