import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateSpecConstraint,
  validateSpecConstraints,
} from "../lib/specExtraction.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { validateProductAgainstRequirements } from "../lib/requirementValidation.ts";

function specValue(spec, value, overrides = {}) {
  return {
    spec,
    kind: typeof value === "boolean" ? "boolean" : "numeric",
    value,
    unit: null,
    raw: String(value),
    source: "name",
    ...overrides,
  };
}

function constraint(overrides = {}) {
  return {
    id: "spec-cfm-min-600",
    spec: "cfm",
    label: "CFM: at least 600 CFM",
    kind: "numeric",
    operator: "min",
    unit: "CFM",
    value: 600,
    strictness: "hard",
    source: "priorities",
    ...overrides,
  };
}

function buildProduct(name, overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name,
    category: "leaf blower",
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
    metadata: { offers: [] },
    ...overrides,
  };
}

function requirementsFor(priorities) {
  return {
    priorities,
    extractedRequirements: extractStructuredRequirements({
      query: "leaf blower",
      priorities,
    }),
  };
}

function withSpecValidation(run) {
  const previous = process.env.REVIEW_RADAR_SPEC_VALIDATION;

  process.env.REVIEW_RADAR_SPEC_VALIDATION = "on";

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.REVIEW_RADAR_SPEC_VALIDATION;
    } else {
      process.env.REVIEW_RADAR_SPEC_VALIDATION = previous;
    }
  }
}

describe("evaluateSpecConstraint", () => {
  it("passes/fails numeric minimums", () => {
    assert.equal(evaluateSpecConstraint(constraint(), { cfm: specValue("cfm", 650) }), "pass");
    assert.equal(evaluateSpecConstraint(constraint(), { cfm: specValue("cfm", 400) }), "fail");
  });

  it("passes/fails numeric maximums", () => {
    const max = constraint({ operator: "max", value: 8, spec: "weightLb" });

    assert.equal(evaluateSpecConstraint(max, { weightLb: specValue("weightLb", 7) }), "pass");
    assert.equal(evaluateSpecConstraint(max, { weightLb: specValue("weightLb", 9) }), "fail");
  });

  it("evaluates booleans", () => {
    const battery = constraint({
      spec: "batteryIncluded",
      kind: "boolean",
      operator: "equals",
      value: 1,
    });

    assert.equal(
      evaluateSpecConstraint(battery, { batteryIncluded: specValue("batteryIncluded", true) }),
      "pass",
    );
    assert.equal(
      evaluateSpecConstraint(battery, { batteryIncluded: specValue("batteryIncluded", false) }),
      "fail",
    );
  });

  it("returns unknown when the product lacks the spec", () => {
    assert.equal(evaluateSpecConstraint(constraint(), {}), "unknown");
  });

  it("validateSpecConstraints buckets pass/fail/unknown", () => {
    const result = validateSpecConstraints(
      { cfm: specValue("cfm", 650) },
      [constraint(), constraint({ id: "spec-runtimeMin-min-40", spec: "runtimeMin", value: 40, label: "Runtime: at least 40 min" })],
    );

    assert.equal(result.passed.length, 1);
    assert.equal(result.unknown.length, 1);
    assert.equal(result.failed.length, 0);
  });
});

describe("spec promote inside validateProductAgainstRequirements (flag on)", () => {
  it("rejects a product that verifiably fails a HARD spec", () => {
    withSpecValidation(() => {
      const result = validateProductAgainstRequirements(
        buildProduct("Budget Blower 400 CFM"),
        requirementsFor("at least 600 cfm"),
      );

      assert.equal(result.isMatch, false);
      assert.ok(result.missingRequirements.some((label) => /CFM/.test(label)));
      assert.equal(result.unknownRequirements.length, 0);
    });
  });

  it("demotes (unknown, not fail) a product missing a HARD spec value", () => {
    withSpecValidation(() => {
      const result = validateProductAgainstRequirements(
        buildProduct("Mystery Blower"),
        requirementsFor("at least 600 cfm"),
      );

      assert.equal(result.isMatch, false);
      assert.ok(result.unknownRequirements.some((label) => /CFM/.test(label)));
      assert.equal(result.missingRequirements.length, 0);
    });
  });

  it("passes a product that satisfies a HARD spec", () => {
    withSpecValidation(() => {
      const result = validateProductAgainstRequirements(
        buildProduct("EGO 650 CFM Cordless Blower"),
        requirementsFor("at least 600 cfm"),
      );

      assert.equal(result.isMatch, true);
      assert.ok(result.matchedRequirements.some((label) => /CFM/.test(label)));
    });
  });

  it("does NOT eliminate a product that fails a SOFT spec", () => {
    withSpecValidation(() => {
      const requirements = requirementsFor("600 cfm");
      const softSpec = requirements.extractedRequirements.specConstraints.find(
        (item) => item.spec === "cfm",
      );

      assert.equal(softSpec.strictness, "soft");

      const result = validateProductAgainstRequirements(
        buildProduct("Budget Blower 400 CFM"),
        requirements,
      );

      // Soft miss is informational only: it must not block exact-match status.
      assert.equal(result.isMatch, true);
      assert.equal(result.missingRequirements.length, 0);
      assert.equal(result.unknownRequirements.length, 0);
      assert.ok(
        result.requirementComparisons.some(
          (comparison) => /CFM/.test(comparison.required) && comparison.status === "failed",
        ),
      );
    });
  });
});

describe("spec validation is a no-op when the flag is off", () => {
  it("ignores a failing hard spec by default", () => {
    const result = validateProductAgainstRequirements(
      buildProduct("Budget Blower 400 CFM"),
      requirementsFor("at least 600 cfm"),
    );

    assert.equal(result.isMatch, true);
    assert.equal(result.missingRequirements.length, 0);
    assert.equal(result.unknownRequirements.length, 0);
  });
});
