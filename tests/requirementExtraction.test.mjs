import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractStructuredRequirements,
  structuredRequirementsSchema,
} from "../lib/requirementExtraction.ts";

describe("structured requirement extraction", () => {
  it("does not invert ordinary words containing no or not into exclusions", () => {
    for (const priorities of ["ergonomic adjustments", "notebook compatibility", "noise isolation", "innovative controls"]) {
      const result = extractStructuredRequirements({ query: "product", priorities });
      assert.deepEqual(result.avoidConstraints, [], priorities);
      assert.ok([...result.ambiguousConstraints, ...result.preferredConstraints].some((item) => item.value === priorities), priorities);
    }
    for (const priorities of ["avoid leather", "no leather", "not leather", "without leather", "do not want leather"]) {
      const result = extractStructuredRequirements({ query: "chair", priorities });
      assert.ok(result.avoidConstraints.some((item) => item.value === "leather"), priorities);
    }
  });

  it("treats named active noise cancellation as a concrete required feature", () => {
    for (const priorities of ["active noise cancellation", "ANC", "active noise cancelling", "active noise canceling"]) {
      const result = extractStructuredRequirements({ query: "wireless earbuds", priorities });
      assert.deepEqual(result.avoidConstraints, [], priorities);
      assert.ok(result.requiredConstraints.some((item) => item.normalizedMeaning === "active noise cancellation"), priorities);
    }
    const excluded = extractStructuredRequirements({ query: "wireless earbuds", priorities: "without ANC" });
    assert.ok(excluded.avoidConstraints.some((item) => item.normalizedMeaning === "active noise cancellation"));
    assert.equal(excluded.requiredConstraints.some((item) => item.normalizedMeaning === "active noise cancellation"), false);
  });

  it("turns hard language into validated deterministic requirements", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $500",
      priorities:
        "must be white only, under 64 inches, fits small spaces, no leather, do not want noisy",
      query: "couch",
      selectedFeatures: ["Material: Performance fabric"],
    });

    assert.doesNotThrow(() => structuredRequirementsSchema.parse(requirements));
    assert.equal(requirements.budgetRules[0].amount, 500);
    assert.equal(requirements.budgetRules[0].premiumCap, 900);
    assert.ok(
      requirements.requiredConstraints.some(
        (constraint) => constraint.type === "color" && constraint.value === "white",
      ),
    );
    assert.ok(
      requirements.requiredConstraints.some(
        (constraint) => constraint.label === "Material: Performance fabric",
      ),
    );
    assert.ok(
      requirements.sizeConstraints.some(
        (constraint) =>
          constraint.operator === "max" && constraint.value === 64,
      ),
    );
    assert.ok(
      requirements.avoidConstraints.some((constraint) =>
        constraint.value.includes("leather"),
      ),
    );
    assert.ok(
      requirements.avoidConstraints.some((constraint) =>
        constraint.value.includes("noisy"),
      ),
    );
  });

  it("keeps unclear text as ambiguous instead of inventing a hard filter", () => {
    const requirements = extractStructuredRequirements({
      priorities: "something that feels premium",
      query: "coffee maker",
    });

    assert.equal(requirements.requiredConstraints.length, 0);
    assert.equal(requirements.ambiguousConstraints.length, 1);
    assert.equal(
      requirements.ambiguousConstraints[0].value,
      "something that feels premium",
    );
  });

  it("extracts brand-only wording as a brand constraint instead of a feature", () => {
    const requirements = extractStructuredRequirements({
      budget: "$300",
      priorities: "Must be Nike only",
      query: "basketball shoes",
    });

    assert.ok(
      requirements.brandConstraints.some(
        (constraint) => constraint.value === "Nike",
      ),
    );
    assert.equal(
      requirements.requiredConstraints.some(
        (constraint) =>
          constraint.type === "feature" && /nike/i.test(constraint.value),
      ),
      false,
    );
  });

  it("extracts known brands from broad category searches", () => {
    const requirements = extractStructuredRequirements({
      budget: "$150",
      query: "New Balance walking shoes",
    });

    assert.ok(
      requirements.brandConstraints.some(
        (constraint) => constraint.value === "New Balance",
      ),
    );
  });

  it("extracts common audio brands from important details", () => {
    const requirements = extractStructuredRequirements({
      budget: "$350",
      priorities: "Sony or Bose, wireless, strong reviews",
      query: "noise cancelling headphones",
    });

    assert.ok(
      requirements.brandConstraints.some(
        (constraint) => constraint.value === "Sony",
      ),
    );
    assert.ok(
      requirements.brandConstraints.some(
        (constraint) => constraint.value === "Bose",
      ),
    );
  });

  it("extracts foot-based length requirements without duplicating the unit", () => {
    const requirements = extractStructuredRequirements({
      budget: "$100",
      priorities: "50 ft length",
      query: "garden hose",
    });

    assert.ok(
      requirements.sizeConstraints.some(
        (constraint) =>
          constraint.dimension === "length" &&
          constraint.operator === "min" &&
          constraint.unit === "ft" &&
          constraint.value === 50 &&
          constraint.label === "Length: 50 ft",
      ),
    );
    assert.equal(
      requirements.summary.some((line) => /ft ft/i.test(line)),
      false,
    );
  });

  it("does not duplicate units from selected numeric length features", () => {
    const requirements = extractStructuredRequirements({
      budget: "$100",
      query: "garden hose",
      selectedFeatures: [
        {
          name: "Length 50 ft",
          operator: "equals",
          unit: "ft",
          value: "50 ft",
        },
      ],
    });

    assert.ok(
      requirements.sizeConstraints.some(
        (constraint) =>
          constraint.dimension === "length" &&
          constraint.operator === "min" &&
          constraint.unit === "ft" &&
          constraint.value === 50 &&
          constraint.label === "Length: 50 ft",
      ),
    );
    assert.equal(
      requirements.summary.some((line) => /ft ft/i.test(line)),
      false,
    );
  });

  it("extracts money budgets from important details without treating measurements as budgets", () => {
    const officeChair = extractStructuredRequirements({
      priorities: "black, lumbar support, under $300",
      query: "office chair",
    });
    const lightweightVacuum = extractStructuredRequirements({
      priorities: "good for pet hair, under 6 lbs",
      query: "cordless vacuum",
    });

    assert.equal(officeChair.budgetRules[0].amount, 300);
    assert.equal(officeChair.budgetRules[0].operator, "max");
    assert.equal(lightweightVacuum.budgetRules.length, 0);
  });

  it("extracts explicit depth and feature details without treating them as vague text", () => {
    const requirements = extractStructuredRequirements({
      priorities:
        "must have ice maker, depth under 30 inches, quiet, energy efficient",
      query: "refrigerator",
    });

    assert.ok(
      requirements.requiredConstraints.some(
        (constraint) =>
          constraint.type === "feature" && constraint.value.includes("ice maker"),
      ),
    );
    assert.ok(
      requirements.sizeConstraints.some(
        (constraint) =>
          constraint.dimension === "depth" &&
          constraint.operator === "max" &&
          constraint.value === 30,
      ),
    );
    assert.ok(
      requirements.requiredConstraints.some((constraint) =>
        constraint.value.includes("quiet"),
      ),
    );
    assert.ok(
      requirements.preferredConstraints.some((constraint) =>
        constraint.value.includes("energy efficient"),
      ),
    );
  });

  it("extracts hard color, feature, size, and budget constraints from shopping-style category text", () => {
    const redFridge = extractStructuredRequirements({
      query: "red refrigerator under $1000",
    });
    const whiteDesk = extractStructuredRequirements({
      query: "white desk with drawers under $300",
    });
    const beigeCouch = extractStructuredRequirements({
      query: "beige couch under 64 inches",
    });
    const cordlessVacuum = extractStructuredRequirements({
      query: "cordless stick vacuum under $250",
    });

    assert.equal(redFridge.budgetRules[0].amount, 1000);
    assert.ok(
      redFridge.requiredConstraints.some(
        (constraint) => constraint.type === "color" && constraint.value === "red",
      ),
    );
    assert.equal(whiteDesk.budgetRules[0].amount, 300);
    assert.ok(
      whiteDesk.requiredConstraints.some(
        (constraint) => constraint.type === "color" && constraint.value === "white",
      ),
    );
    assert.ok(
      whiteDesk.requiredConstraints.some(
        (constraint) =>
          constraint.type === "feature" && constraint.value.includes("drawers"),
      ),
    );
    assert.equal(beigeCouch.budgetRules.length, 0);
    assert.ok(
      beigeCouch.sizeConstraints.some(
        (constraint) => constraint.operator === "max" && constraint.value === 64,
      ),
    );
    assert.equal(cordlessVacuum.budgetRules[0].amount, 250);
    assert.ok(
      cordlessVacuum.requiredConstraints.some(
        (constraint) =>
          constraint.type === "feature" && constraint.value.includes("cordless"),
      ),
    );
  });

  it("extracts concrete must-have features from difficult shopping details", () => {
    const sectional = extractStructuredRequirements({
      budget: "under $1500",
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    });
    const bedFrame = extractStructuredRequirements({
      budget: "under $400",
      priorities: "with storage drawers, no box spring required, modern style",
      query: "queen bed frame",
    });
    const gamingTv = extractStructuredRequirements({
      budget: "under $700",
      priorities: "120Hz refresh rate, HDMI 2.1, good gaming performance",
      query: "65 inch TV",
    });
    const dishwasher = extractStructuredRequirements({
      budget: "under $700",
      priorities: "stainless steel, quiet, third rack",
      query: "dishwasher",
    });

    assert.ok(
      sectional.requiredConstraints.some((constraint) =>
        /pet-friendly|pet friendly/i.test(constraint.value),
      ),
    );
    assert.ok(
      sectional.avoidConstraints.some((constraint) => constraint.value === "gray"),
    );
    assert.ok(
      bedFrame.requiredConstraints.some((constraint) =>
        /storage drawers/i.test(constraint.value),
      ),
    );
    assert.ok(
      bedFrame.requiredConstraints.some((constraint) =>
        /no box spring required/i.test(constraint.value),
      ),
    );
    assert.ok(
      gamingTv.requiredConstraints.some((constraint) =>
        /120hz/i.test(constraint.value),
      ),
    );
    assert.ok(
      gamingTv.requiredConstraints.some((constraint) =>
        /hdmi 2\.1/i.test(constraint.value),
      ),
    );
    assert.ok(
      dishwasher.requiredConstraints.some((constraint) =>
        /third rack/i.test(constraint.value),
      ),
    );
  });

  it("treats concrete health and performance details as required filters", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $160",
      priorities: "HEPA filter, quiet for bedroom, good for allergies",
      query: "air purifier",
    });
    const requiredValues = requirements.requiredConstraints.map(
      (constraint) => constraint.value,
    );

    assert.ok(requiredValues.includes("hepa filter"));
    assert.ok(requiredValues.includes("quiet"));
    assert.ok(
      requiredValues.includes("allergies") ||
        requiredValues.includes("allergy") ||
        requiredValues.includes("allergy-friendly"),
    );
    assert.equal(
      requiredValues.filter((value) => /hepa/i.test(value)).length,
      1,
    );
    assert.equal(
      requirements.ambiguousConstraints.some((constraint) =>
        /allerg/i.test(constraint.value),
      ),
      false,
    );
  });

  it("treats concrete pressure-washer accessories as required filters", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $250",
      priorities:
        "foam cannon long hose for cars patios reliable avoid gas",
      query: "electric pressure washer",
    });
    const requiredValues = requirements.requiredConstraints.map(
      (constraint) => constraint.value,
    );

    assert.ok(requiredValues.includes("foam cannon"));
    assert.ok(requiredValues.includes("long hose"));
    assert.ok(
      requirements.avoidConstraints.some(
        (constraint) => constraint.value === "gas",
      ),
    );
    assert.ok(
      requirements.summary.includes("Required: Feature: Foam Cannon"),
    );
    assert.ok(requirements.summary.includes("Required: Feature: Long Hose"));
  });

  it("normalizes equivalent feature wording across categories", () => {
    const vacuum = extractStructuredRequirements({
      priorities: "dog hair",
      query: "cordless vacuum",
    });
    const chair = extractStructuredRequirements({
      priorities: "lumbar support",
      query: "office chair",
    });
    const purifier = extractStructuredRequirements({
      priorities: "low noise",
      query: "air purifier",
    });

    assert.ok(
      vacuum.requiredConstraints.some(
        (constraint) => constraint.normalizedMeaning === "pet hair",
      ),
    );
    assert.ok(
      chair.requiredConstraints.some(
        (constraint) => constraint.normalizedMeaning === "adjustable lumbar",
      ),
    );
    assert.ok(
      purifier.requiredConstraints.some(
        (constraint) => constraint.normalizedMeaning === "quiet",
      ),
    );
  });

  it("keeps portable/lightweight wording as a concrete requirement", () => {
    const vacuum = extractStructuredRequirements({
      priorities: "pet hair, HEPA filter, lightweight, avoid corded",
      query: "cordless stick vacuum",
    });
    const requiredValues = vacuum.requiredConstraints.map(
      (constraint) => constraint.normalizedMeaning || constraint.value,
    );

    assert.ok(requiredValues.includes("lightweight"));
    assert.ok(vacuum.summary.includes("Required: Feature: Lightweight"));
  });

  it("treats concrete important-details phrases as required filters", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $180",
      priorities: "nugget ice, self cleaning, quiet, compact, avoid water line",
      query: "countertop ice maker",
    });
    const requiredValues = requirements.requiredConstraints.map(
      (constraint) => constraint.normalizedMeaning || constraint.value,
    );
    const ambiguousValues = requirements.ambiguousConstraints.map(
      (constraint) => constraint.normalizedMeaning || constraint.value,
    );

    assert.ok(requiredValues.includes("nugget ice"));
    assert.ok(requiredValues.includes("self cleaning"));
    assert.ok(requiredValues.includes("compact"));
    assert.equal(ambiguousValues.includes("nugget ice"), false);
    assert.equal(ambiguousValues.includes("self cleaning"), false);
    assert.equal(ambiguousValues.includes("compact"), false);
    assert.ok(requirements.summary.includes("Required: Feature: Nugget Ice"));
    assert.ok(requirements.summary.includes("Required: Feature: Self Cleaning"));
    assert.ok(requirements.summary.includes("Required: Feature: Compact"));
  });

  it("treats concrete accessory and cleaning details as required filters", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $250",
      priorities:
        "steam wand, compact, easy cleaning, beginner friendly, avoid capsule only",
      query: "espresso machine",
    });
    const requiredValues = requirements.requiredConstraints.map(
      (constraint) => constraint.normalizedMeaning || constraint.value,
    );
    const ambiguousValues = requirements.ambiguousConstraints.map(
      (constraint) => constraint.normalizedMeaning || constraint.value,
    );

    assert.ok(requiredValues.includes("steam wand"));
    assert.ok(requiredValues.includes("easy cleaning"));
    assert.equal(ambiguousValues.includes("steam wand"), false);
    assert.equal(ambiguousValues.includes("easy cleaning"), false);
    assert.ok(requirements.summary.includes("Required: Feature: Steam Wand"));
    assert.ok(requirements.summary.includes("Required: Feature: Easy Cleaning"));
  });

  it("treats concrete material choices in important details as required alternatives", () => {
    const requirements = extractStructuredRequirements({
      budget: "under $400",
      priorities:
        "storage drawers, no box spring required, solid wood or metal, avoid upholstered headboard",
      query: "queen bed frame",
    });
    const requiredMaterials = requirements.requiredConstraints
      .filter((constraint) => constraint.type === "material")
      .map((constraint) => constraint.value);

    assert.deepEqual(requiredMaterials.sort(), ["metal", "solid wood"].sort());
    assert.ok(
      requirements.summary.includes("Required: Material: Solid Wood or Metal"),
    );
    assert.equal(
      requirements.summary.some((item) => item === "Required: Material: Solid Wood"),
      false,
    );
    assert.equal(
      requirements.preferredConstraints.some(
        (constraint) => constraint.type === "material",
      ),
      false,
    );
    assert.ok(
      requirements.avoidConstraints.some((constraint) =>
        /upholstered headboard/i.test(constraint.value),
      ),
    );
  });

  it("keeps explicit commerce features deterministic across product categories", () => {
    const espresso = extractStructuredRequirements({
      priorities: "built-in burr grinder and milk steaming wand",
      query: "espresso machine",
    });
    const dehumidifier = extractStructuredRequirements({
      priorities: "50-pint capacity, built-in pump, continuous drain",
      query: "basement dehumidifier",
    });
    const mouse = extractStructuredRequirements({
      priorities: "left-handed and wireless",
      query: "ergonomic vertical mouse",
    });
    const generator = extractStructuredRequirements({
      priorities: "at least 2,000 running watts and CO shutoff",
      query: "portable inverter generator",
    });

    assert.deepEqual(
      espresso.requiredConstraints
        .map((item) => item.normalizedMeaning)
        .filter(Boolean)
        .sort(),
      ["built in burr grinder", "steam wand"],
    );
    assert.ok(
      dehumidifier.requiredConstraints.some(
        (item) => item.normalizedMeaning === "built in pump",
      ),
    );
    assert.ok(
      dehumidifier.requiredConstraints.some(
        (item) => item.normalizedMeaning === "continuous drain",
      ),
    );
    assert.deepEqual(
      mouse.requiredConstraints
        .map((item) => item.normalizedMeaning)
        .filter(Boolean)
        .sort(),
      ["left handed", "wireless"],
    );
    assert.ok(
      generator.requiredConstraints.some(
        (item) => item.normalizedMeaning === "co shutoff",
      ),
    );
    assert.ok(
      generator.specConstraints.some(
        (item) => item.spec === "runningWattage" && item.value === 2000,
      ),
    );
  });
});
