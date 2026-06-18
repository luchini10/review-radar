import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractProductSpecs,
  extractSpecConstraints,
  extractSpecsFromText,
  specEvidenceSatisfies,
} from "../lib/specExtraction.ts";

function bySpec(constraints, spec) {
  return constraints.find((constraint) => constraint.spec === spec);
}

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Generic Product",
    category: "tool",
    product_page_url: "https://example.com/p",
    product_image_url: "",
    why_recommended: "",
    pros: [],
    cons: [],
    common_complaints: [],
    estimated_price_range: "",
    confidence_score: 70,
    source_consensus: "Mixed",
    price_value_verdict: "",
    best_for: "",
    not_for: [],
    citations: [],
    ...overrides,
  };
}

describe("extractSpecConstraints", () => {
  it("parses '600+ CFM' as a hard minimum", () => {
    const cfm = bySpec(extractSpecConstraints("cordless leaf blower 600+ CFM"), "cfm");

    assert.ok(cfm);
    assert.equal(cfm.operator, "min");
    assert.equal(cfm.value, 600);
    assert.equal(cfm.strictness, "hard");
    assert.equal(cfm.label, "CFM: at least 600 CFM");
  });

  it("parses 'at least 40 min runtime' as a minimum", () => {
    const runtime = bySpec(
      extractSpecConstraints("at least 40 min runtime", "priorities"),
      "runtimeMin",
    );

    assert.ok(runtime);
    assert.equal(runtime.operator, "min");
    assert.equal(runtime.value, 40);
    assert.equal(runtime.source, "priorities");
  });

  it("parses 'under 2000 psi' as a maximum and bare '200 psi' as a soft minimum", () => {
    const max = bySpec(extractSpecConstraints("pressure washer under 2000 psi"), "psi");
    const bare = bySpec(extractSpecConstraints("delivers 200 psi"), "psi");

    assert.equal(max.operator, "max");
    assert.equal(max.value, 2000);
    assert.equal(max.strictness, "hard");

    assert.equal(bare.operator, "min");
    assert.equal(bare.value, 200);
    assert.equal(bare.strictness, "soft");
  });

  it("treats lower-is-better specs (weight, noise) sensibly", () => {
    const weight = bySpec(extractSpecConstraints("lightweight under 8 lbs"), "weightLb");
    const noise = bySpec(extractSpecConstraints("quieter than 60 db"), "noiseDb");

    assert.equal(weight.operator, "max");
    assert.equal(weight.value, 8);
    assert.equal(noise.operator, "max");
    assert.equal(noise.value, 60);
  });

  it("detects 'battery included' as a boolean requirement", () => {
    const battery = bySpec(
      extractSpecConstraints("must have battery included", "priorities"),
      "batteryIncluded",
    );

    assert.ok(battery);
    assert.equal(battery.kind, "boolean");
    assert.equal(battery.value, 1);
    assert.equal(battery.strictness, "hard");
  });

  it("flips polarity for avoided 'bare tool' into a battery-included requirement", () => {
    const battery = bySpec(
      extractSpecConstraints("bare tool", "avoid"),
      "batteryIncluded",
    );

    assert.ok(battery);
    assert.equal(battery.value, 1);
  });

  it("extracts multiple specs from one string", () => {
    const constraints = extractSpecConstraints(
      "600 cfm, at least 40 min runtime, battery included",
    );
    const specs = constraints.map((constraint) => constraint.spec).sort();

    assert.deepEqual(specs, ["batteryIncluded", "cfm", "runtimeMin"]);
  });

  it("returns nothing for text with no recognizable specs", () => {
    assert.deepEqual(extractSpecConstraints("comfortable running shoes for flat feet"), []);
  });
});

describe("extractProductSpecs", () => {
  it("reads numeric specs and battery-included from a product title", () => {
    const specs = extractProductSpecs(
      buildProduct({
        name: "Leaf Blower",
        metadata: {
          offers: [],
          title: {
            confidence: "High",
            sourceType: "serper",
            sourceUrl: "https://example.com/p",
            value: "EGO Power+ 650 CFM Cordless Leaf Blower, 90 min runtime, Battery Included",
            verifiedAt: "2026-06-14T00:00:00.000Z",
          },
        },
      }),
    );

    assert.equal(specs.cfm?.value, 650);
    assert.equal(specs.cfm?.source, "title");
    assert.equal(specs.runtimeMin?.value, 90);
    assert.equal(specs.batteryIncluded?.value, true);
  });

  it("treats a 'bare tool' product as battery NOT included", () => {
    const specs = extractProductSpecs(
      buildProduct({ name: "DeWalt 60V Blower (Bare Tool, tool only)" }),
    );

    assert.equal(specs.batteryIncluded?.value, false);
  });

  it("returns an empty map when no specs are present", () => {
    assert.deepEqual(extractProductSpecs(buildProduct({ name: "Plain Office Chair" })), {});
  });
});

describe("extractSpecsFromText", () => {
  it("reads every spec match in a block of text", () => {
    const specs = extractSpecsFromText(
      "EGO 650 CFM cordless blower, 90 min runtime, battery included",
    );

    assert.equal(specs.cfm?.value, 650);
    assert.equal(specs.runtimeMin?.value, 90);
    assert.equal(specs.batteryIncluded?.value, true);
  });

  it("parses grill specs incl. comma-formatted BTU, cooking area and burners", () => {
    const specs = extractSpecsFromText(
      "Weber Genesis 4-Burner Gas Grill, 48,000 BTU, 646 sq in cooking area",
    );

    assert.equal(specs.burners?.value, 4);
    assert.equal(specs.btu?.value, 48000);
    assert.equal(specs.cookingAreaSqIn?.value, 646);
  });
});

describe("specEvidenceSatisfies", () => {
  const cfmMin600 = {
    id: "spec-cfm-min-600",
    spec: "cfm",
    label: "CFM: at least 600 CFM",
    kind: "numeric",
    operator: "min",
    unit: "CFM",
    value: 600,
    strictness: "hard",
    source: "priorities",
  };

  it("passes only when evidence meets the requirement", () => {
    assert.equal(specEvidenceSatisfies(cfmMin600, "Tested at 650 CFM"), true);
    assert.equal(specEvidenceSatisfies(cfmMin600, "Rated 400 CFM"), false);
    assert.equal(specEvidenceSatisfies(cfmMin600, "No specs here"), false);
  });
});
