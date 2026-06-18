import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRecommendationApiPayload,
  cleanSearchFormInput,
} from "../lib/searchRequestPayload.ts";

const selectedFeature = {
  id: "color-white",
  name: "Color",
  operator: "equals",
  required: true,
  source: "smart_features",
  unit: "",
  value: "White",
};

describe("search request payload", () => {
  it("trims whitespace without changing the user's words", () => {
    assert.deepEqual(
      cleanSearchFormInput({
        budget: "  under $500  ",
        category: "  cordless vacuum  ",
        priorities: "  for pet hair and stairs  ",
        selectedFeatures: [],
      }),
      {
        avoid: undefined,
        budget: "under $500",
        category: "cordless vacuum",
        priorities: "for pet hair and stairs",
        selectedFeatures: [],
      },
    );
  });

  it("includes selected Smart Features in valid API requests", () => {
    const payload = buildRecommendationApiPayload({
      budget: "under $1,500",
      category: "refrigerator",
      priorities: "",
      selectedFeatures: [selectedFeature],
    });

    assert.deepEqual(payload.selectedFeatures, [selectedFeature]);
  });

  it("includes important details and deal-breakers when those fields are present", () => {
    const payload = buildRecommendationApiPayload({
      avoid: "no glass shelves",
      budget: "under $1,500",
      category: "refrigerator",
      priorities: "for a narrow apartment kitchen",
      selectedFeatures: [],
    });

    assert.equal(payload.priorities, "for a narrow apartment kitchen");
    assert.equal(payload.avoid, "no glass shelves");
  });

  it("can include parsed requirement context without changing the API shape", () => {
    const payload = buildRecommendationApiPayload(
      {
        budget: "under $1,500",
        category: "refrigerator",
        priorities: "must be under 33 inches wide",
        selectedFeatures: [selectedFeature],
      },
      { includeExtractedRequirements: true },
    );

    assert.ok(payload.extractedRequirements);
    assert.ok(
      payload.extractedRequirements.summary.some((item) =>
        item.toLowerCase().includes("under 33 inches"),
      ),
    );
    assert.ok(
      payload.extractedRequirements.requiredConstraints.some(
        (item) => item.label === "Color: White",
      ),
    );
  });
});
