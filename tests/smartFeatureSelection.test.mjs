import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import {
  createSelectedSmartFeature,
  smartFeatureCategoryKey,
  selectedSmartFeatureLabel,
  selectedSmartFeatureSearchText,
} from "../lib/smartFeatureSelection.ts";

const widthFeature = {
  id: "width",
  name: "Width",
  description: "Overall width.",
  type: "number",
  possibleValues: ["Under 36 in", "Under 84 in"],
  operators: ["lte", "gte", "between", "equals"],
  unit: "in",
  examples: ["Under 36 in", "Under 84 in"],
  commonlyImportant: true,
};

const colorFeature = {
  id: "color",
  name: "Color",
  description: "Available color.",
  type: "enum",
  possibleValues: ["White", "Black", "Beige"],
  operators: ["equals"],
  unit: "",
  examples: ["White", "Black"],
  commonlyImportant: true,
};

const lengthFeature = {
  id: "length",
  name: "Length",
  description: "Overall product length.",
  type: "number",
  possibleValues: ["50 ft"],
  operators: ["equals", "lte", "gte"],
  unit: "ft",
  examples: ["50 ft"],
  commonlyImportant: true,
};

describe("structured smart feature selections", () => {
  it("stores numeric Smart Features as structured required filters", () => {
    const selected = createSelectedSmartFeature(widthFeature, "Under 36 in");

    assert.equal(selected.name, "Width");
    assert.equal(selected.operator, "lte");
    assert.equal(selected.value, 36);
    assert.equal(selected.unit, "in");
    assert.equal(selected.required, true);
    assert.equal(selected.source, "smart_features");
    assert.equal(selectedSmartFeatureLabel(selected), "Width: under 36 in");
    assert.equal(selectedSmartFeatureSearchText(selected), "Width under 36 in");
  });

  it("does not duplicate units when a Smart Feature value already includes the unit", () => {
    const selected = {
      id: "length-equals-50-ft",
      name: "Length",
      type: "number",
      operator: "equals",
      value: "50 ft",
      unit: "ft",
      required: true,
      source: "smart_features",
    };

    assert.equal(selectedSmartFeatureLabel(selected), "Length: 50 ft");
    assert.equal(selectedSmartFeatureSearchText(selected), "Length 50 ft");
  });

  it("turns structured Smart Features into deterministic requirements", () => {
    const width = createSelectedSmartFeature(widthFeature, "Under 36 in");
    const color = createSelectedSmartFeature(colorFeature, "White");
    const requirements = extractStructuredRequirements({
      query: "refrigerator",
      budget: "under $1500",
      selectedFeatures: [width, color],
    });

    assert.ok(
      requirements.sizeConstraints.some(
        (item) =>
          item.dimension === "width" &&
          item.operator === "max" &&
          item.value === 36,
      ),
    );
    assert.ok(
      requirements.requiredConstraints.some(
        (item) => item.type === "color" && item.value === "White",
      ),
    );
  });

  it("turns length Smart Features into foot-based size requirements", () => {
    const selected = createSelectedSmartFeature(lengthFeature, "50 ft");
    const requirements = extractStructuredRequirements({
      query: "garden hose",
      selectedFeatures: [selected],
    });

    assert.ok(
      requirements.sizeConstraints.some(
        (item) =>
          item.dimension === "length" &&
          item.operator === "min" &&
          item.unit === "ft" &&
          item.value === 50 &&
          item.label === "Length: 50 ft",
      ),
    );
    assert.equal(
      requirements.requiredConstraints.some((item) => /50 ft ft/i.test(item.label)),
      false,
    );
  });

  it("normalizes category aliases consistently on the frontend", () => {
    assert.equal(smartFeatureCategoryKey("sofa"), smartFeatureCategoryKey("couch"));
    assert.equal(smartFeatureCategoryKey("pull out couch"), "sleeper sofa");
    assert.equal(smartFeatureCategoryKey("white vanity chair"), "vanity chair");
    assert.equal(smartFeatureCategoryKey("wine refrigerator"), "wine fridge");
  });
});
