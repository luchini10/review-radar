import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFallbackSmartFeatures,
  smartFeatureCategoryKey,
} from "../lib/smartFeatureSuggestions.ts";

describe("deterministic smart feature suggestions", () => {
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
      assert.ok(
        result.features.every(
          (feature) =>
            feature.id &&
            feature.name &&
            feature.examples.length >= 2 &&
            feature.operators.length >= 1,
        ),
        `${category} should have complete selectable features`,
      );
    }
  });

  it("returns null for uncommon categories so Important Details remains the fallback", () => {
    assert.equal(getFallbackSmartFeatures("portable pottery wheel"), null);
  });
});
