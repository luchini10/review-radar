import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isNonProductSource,
  SOURCE_NAME_TOKENS,
} from "../lib/search/sourceSafety.ts";

describe("product-source safety", () => {
  it("rejects editorial and community hosts while allowing commerce pages", () => {
    assert.equal(isNonProductSource("https://www.nytimes.com/wirecutter/reviews/vacuums"), true);
    assert.equal(isNonProductSource("https://www.reddit.com/r/VacuumCleaners"), true);
    assert.equal(isNonProductSource("https://www.walmart.com/ip/123"), false);
    assert.equal(isNonProductSource("https://www.acer.com/us-en/monitors/nitro/xv2"), false);
  });

  it("keeps retailer and publication names out of inferred product identity", () => {
    assert.equal(SOURCE_NAME_TOKENS.has("amazon"), true);
    assert.equal(SOURCE_NAME_TOKENS.has("wirecutter"), true);
  });
});
