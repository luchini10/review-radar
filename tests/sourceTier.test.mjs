import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sourceTier, isTier1Editorial, SOURCE_NAME_TOKENS } from "../lib/search/sourceTier.ts";

describe("sourceTier", () => {
  it("classifies trusted editorial/review sources as Tier 1", () => {
    assert.equal(sourceTier("https://www.wirecutter.com/reviews/best-robot-vacuum/"), 1);
    assert.equal(sourceTier("rtings.com"), 1);
    assert.equal(sourceTier("https://www.consumerreports.org/x"), 1);
    assert.equal(isTier1Editorial("https://www.pcmag.com/picks/best"), true);
  });

  it("classifies major retailers/marketplaces as Tier 2", () => {
    assert.equal(sourceTier("https://www.amazon.com/dp/B0"), 2);
    assert.equal(sourceTier("bestbuy.com"), 2);
    assert.equal(sourceTier("https://www.homedepot.com/p/123"), 2);
  });

  it("treats unknown first-party/brand domains as Tier 3 and community/junk as Tier 4", () => {
    assert.equal(sourceTier("https://www.roborock.com/pages/s8"), 3);
    assert.equal(sourceTier("https://www.reddit.com/r/vacuums"), 4);
    assert.equal(sourceTier(""), 4);
  });

  it("exposes source-name tokens so seed extraction can exclude them", () => {
    assert.equal(SOURCE_NAME_TOKENS.has("amazon"), true);
    assert.equal(SOURCE_NAME_TOKENS.has("consumer"), true);
    assert.equal(SOURCE_NAME_TOKENS.has("wirecutter"), true);
  });
});
