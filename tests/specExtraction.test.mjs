import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateSpecConstraint,
  extractSpecConstraints,
  extractSpecsFromText,
  specEvidenceSatisfies,
} from "../lib/specExtraction.ts";

function bySpec(constraints, spec) {
  return constraints.find((constraint) => constraint.spec === spec);
}

describe("selection spec requirements", () => {
  it("extracts hard minimum, maximum, exact, and boolean requirements", () => {
    const cfm = bySpec(extractSpecConstraints("must have at least 600 CFM"), "cfm");
    const weight = bySpec(extractSpecConstraints("under 8 lbs"), "weightLb");
    const screen = bySpec(
      extractSpecConstraints("must be exactly 27-inch", "priorities"),
      "screenSizeIn",
    );
    const battery = bySpec(
      extractSpecConstraints("must have battery included", "priorities"),
      "batteryIncluded",
    );

    assert.deepEqual(
      [cfm.operator, cfm.value, cfm.strictness],
      ["min", 600, "hard"],
    );
    assert.deepEqual(
      [weight.operator, weight.value, weight.strictness],
      ["max", 8, "hard"],
    );
    assert.deepEqual(
      [screen.operator, screen.value, screen.strictness],
      ["equals", 27, "hard"],
    );
    assert.deepEqual(
      [battery.kind, battery.value, battery.strictness],
      ["boolean", 1, "hard"],
    );
  });

  it("does not let a dollar budget control a following performance spec", () => {
    const burners = bySpec(
      extractSpecConstraints("gas grill under $600 4-burner"),
      "burners",
    );

    assert.equal(burners.operator, "min");
    assert.equal(burners.value, 4);
    assert.equal(burners.strictness, "soft");
  });

  it("extracts nominal cup capacity from coffee-maker requirements and evidence", () => {
    const cups = bySpec(
      extractSpecConstraints("14-cup programmable", "priorities"),
      "capacityCups",
    );

    assert.deepEqual(
      [cups.operator, cups.value, cups.strictness],
      ["min", 14, "soft"],
    );
    assert.equal(
      extractSpecsFromText("Hamilton Beach 12 Cup Programmable Coffee Maker")
        .capacityCups.value,
      12,
    );
  });

  it("extracts product facts from selector-controlled evidence text", () => {
    const specs = extractSpecsFromText(
      "Acer 27-inch 2560x1440 QHD gaming monitor with 180Hz refresh rate",
      "metadata",
    );

    assert.equal(specs.screenSizeIn.value, 27);
    assert.equal(specs.refreshRateHz.value, 180);
    assert.equal(specs.displayResolutionHeightPx.value, 1440);
  });

  it("rejects a known lower display resolution in a soft priority", () => {
    const [constraint] = extractSpecConstraints("1440p", "priorities");

    assert.deepEqual(
      [constraint.spec, constraint.operator, constraint.value, constraint.strictness],
      ["displayResolutionHeightPx", "min", 1440, "soft"],
    );
    assert.equal(
      evaluateSpecConstraint(constraint, extractSpecsFromText("1080p monitor")),
      "fail",
    );
  });

  it("recognizes bounded battery-kit title forms without overriding tool-only evidence", () => {
    for (const title of [
      "PowerSmart 450CFM Cordless Leaf Blower w/ Two 20V Battery and Charger",
      "HART 40V Cordless Axial Leaf Blower Kit 1 4.0Ah Lithium-Ion Battery",
      "Leaf Blower with 2 Battery and Charger",
    ]) {
      assert.equal(extractSpecsFromText(title).batteryIncluded.value, true);
    }

    assert.equal(
      extractSpecsFromText(
        "Cordless Leaf Blower Kit tool-only battery not included",
      ).batteryIncluded.value,
      false,
    );
  });

  it("evaluates known facts and fails closed on missing hard facts", () => {
    const [constraint] = extractSpecConstraints(
      "must have at least 144Hz",
      "priorities",
    );
    assert.equal(
      evaluateSpecConstraint(
        constraint,
        extractSpecsFromText("180Hz gaming monitor"),
      ),
      "pass",
    );
    assert.equal(
      evaluateSpecConstraint(
        constraint,
        extractSpecsFromText("75Hz office monitor"),
      ),
      "fail",
    );
    assert.equal(evaluateSpecConstraint(constraint, {}), "unknown");
  });

  it("checks evidence without model-generated explanations", () => {
    const [constraint] = extractSpecConstraints(
      "must have at least 600 CFM",
      "priorities",
    );

    assert.equal(specEvidenceSatisfies(constraint, "Rated at 650 CFM"), true);
    assert.equal(specEvidenceSatisfies(constraint, "No airflow rating"), false);
  });
});
