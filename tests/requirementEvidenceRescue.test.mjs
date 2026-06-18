import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySpecEvidenceFromText,
  buildVerificationQueries,
  missingFactFromLabel,
  sourceTrustedForRequirementVerification,
} from "../lib/requirementEvidenceRescue.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { validateProductAgainstRequirements } from "../lib/requirementValidation.ts";

const product = {
  recommendation_type: "Close Match",
  name: "Whirlpool WMH31017HS 1.7 cu. ft. Over-the-Range Microwave Oven",
  category: "Microwave",
  product_page_url: "https://example.com/product",
  product_image_url: "",
  why_recommended: "Specific product candidate.",
  pros: [],
  cons: [],
  common_complaints: [],
  estimated_price_range: "Price not verified",
  confidence_score: 60,
  source_consensus: "Weak",
  price_value_verdict: "Price was not verified.",
  best_for: "Microwave shoppers.",
  not_for: [],
  citations: [],
};

describe("requirement evidence rescue", () => {
  it("classifies missing fixed facts into targeted verification searches", () => {
    assert.equal(missingFactFromLabel("Budget: $250 or less").kind, "price");
    assert.equal(
      missingFactFromLabel("Finish Color: Stainless Steel").kind,
      "color",
    );
    assert.equal(missingFactFromLabel("Width: under 30 inches").kind, "dimension");
  });

  it("builds product-specific rescue queries for unknown requirements", () => {
    const queries = buildVerificationQueries(
      product,
      [
        "Budget: $250 or less",
        "Finish Color: Stainless Steel",
        "Width: under 30 inches",
      ],
      "microwave",
    );

    assert.deepEqual(
      queries.map((item) => item.fact.kind),
      ["price", "color", "dimension"],
    );
    assert.match(queries[0].query, /Whirlpool WMH31017HS/i);
    assert.match(queries[0].query, /current price microwave/i);
    assert.match(queries[1].query, /stainless steel microwave/i);
    assert.match(queries[2].query, /width dimensions specifications microwave/i);
  });

  it("does not use social or video pages as hard requirement proof", () => {
    assert.equal(
      sourceTrustedForRequirementVerification("https://www.instagram.com/p/example"),
      false,
    );
    assert.equal(
      sourceTrustedForRequirementVerification("https://www.youtube.com/watch?v=abc"),
      false,
    );
    assert.equal(
      sourceTrustedForRequirementVerification(
        "https://www.target.com/p/example-product/-/A-123",
      ),
      true,
    );
  });
});

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

describe("numeric spec evidence rescue", () => {
  it("classifies a numeric spec label as a spec fact, leaving others unchanged", () => {
    const fact = missingFactFromLabel("CFM: at least 600 CFM");

    assert.equal(fact.kind, "spec");
    assert.equal(fact.spec, "cfm");
    assert.equal(missingFactFromLabel("Color: Beige").kind, "color");
    assert.equal(missingFactFromLabel("Width: under 30 inches").kind, "dimension");
  });

  it("builds a product-specific spec verification query", () => {
    const queries = buildVerificationQueries(
      product,
      ["CFM: at least 600 CFM"],
      "leaf blower",
    );

    assert.equal(queries[0].fact.kind, "spec");
    assert.match(queries[0].query, /600 cfm/i);
    assert.match(queries[0].query, /leaf blower/i);
  });

  it("records a found spec value as a verified pro + citation", () => {
    const updated = applySpecEvidenceFromText(
      product,
      missingFactFromLabel("CFM: at least 600 CFM"),
      "Manufacturer lists 650 CFM airflow",
      "https://example.com/specs",
      "Spec page",
    );

    assert.ok(updated.pros.some((pro) => /650 cfm/i.test(pro)));
    assert.ok(updated.citations.some((citation) => citation.url === "https://example.com/specs"));
  });

  it("does not add evidence when the spec is absent from the text", () => {
    const updated = applySpecEvidenceFromText(
      product,
      missingFactFromLabel("CFM: at least 600 CFM"),
      "No airflow rating listed",
      "https://example.com/specs",
      "Spec page",
    );

    assert.equal(updated, product);
  });

  it("flips a hard-spec unknown to passed after rescue (flag on)", () => {
    withSpecValidation(() => {
      const requirements = {
        priorities: "at least 600 cfm",
        extractedRequirements: extractStructuredRequirements({
          query: "leaf blower",
          priorities: "at least 600 cfm",
        }),
      };
      const before = validateProductAgainstRequirements(product, requirements);

      assert.ok(before.unknownRequirements.some((label) => /cfm/i.test(label)));
      assert.equal(before.isMatch, false);

      const rescued = applySpecEvidenceFromText(
        product,
        missingFactFromLabel("CFM: at least 600 CFM"),
        "Manufacturer lists 650 CFM airflow",
        "https://example.com/specs",
        "Spec page",
      );
      const after = validateProductAgainstRequirements(rescued, requirements);

      assert.ok(after.matchedRequirements.some((label) => /cfm/i.test(label)));
      assert.equal(after.isMatch, true);
    });
  });
});
