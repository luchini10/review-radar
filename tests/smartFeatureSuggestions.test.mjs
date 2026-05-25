import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fallbackFeatures,
  smartFeatureResponseSchema,
} from "../lib/smartFeatureSuggestions.ts";

describe("smart feature suggestions schema", () => {
  it("accepts the fallback feature shape", () => {
    const result = smartFeatureResponseSchema.safeParse(fallbackFeatures);

    assert.equal(result.success, true);
  });

  it("rejects too few generated features", () => {
    const result = smartFeatureResponseSchema.safeParse({
      category: "couch",
      features: fallbackFeatures.features.slice(0, 4),
    });

    assert.equal(result.success, false);
  });

  it("rejects feature examples with too few options", () => {
    const result = smartFeatureResponseSchema.safeParse({
      category: "laptop",
      features: fallbackFeatures.features.map((feature, index) =>
        index === 0 ? { ...feature, examples: ["Only one"] } : feature,
      ),
    });

    assert.equal(result.success, false);
  });
});
