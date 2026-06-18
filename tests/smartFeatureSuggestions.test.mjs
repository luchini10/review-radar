import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fallbackFeatures,
  getFallbackSmartFeatures,
  smartFeatureCategoryKey,
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

  it("returns stable catalog features for sofa and couch searches", () => {
    const sofa = getFallbackSmartFeatures("sofa");
    const couch = getFallbackSmartFeatures("couch");

    assert.ok(sofa);
    assert.ok(couch);
    assert.equal(smartFeatureCategoryKey("sofa"), smartFeatureCategoryKey("couch"));
    assert.deepEqual(
      sofa.features.map((feature) => feature.name),
      couch.features.map((feature) => feature.name),
    );
  });

  it("routes sleeper sofa wording to a sleeper-specific catalog", () => {
    const sleeper = getFallbackSmartFeatures("pull out couch");

    assert.ok(sleeper);
    assert.equal(sleeper.category, "sleeper sofa");
    assert.ok(sleeper.features.some((feature) => feature.name === "Bed size"));
  });

  it("uses specific catalogs before broad aliases", () => {
    const vanityChair = getFallbackSmartFeatures("white vanity chair");

    assert.ok(vanityChair);
    assert.equal(vanityChair.category, "vanity chair");
    assert.ok(vanityChair.features.some((feature) => feature.name === "Back support"));
  });

  it("has stable catalogs for more common shopping categories", () => {
    for (const category of [
      "microwave",
      "office chair",
      "wine fridge",
      "bed frame",
      "dresser",
      "air purifier",
      "carpet cleaner",
      "cordless drill",
    ]) {
      const result = getFallbackSmartFeatures(category);

      assert.ok(result, `${category} should have catalog features`);
      assert.ok(result.features.length >= 5, `${category} should have at least 5 features`);
    }
  });

  it("returns null for uncommon categories so the API can use AI fallback", () => {
    assert.equal(getFallbackSmartFeatures("portable pottery wheel"), null);
  });
});
