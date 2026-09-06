import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  matchSemanticFeatureEvidence,
  semanticCanonicalValue,
  violatesSemanticDealbreaker,
} from "../lib/semanticMatching.ts";

describe("semantic matching", () => {
  it("matches complete semantic words rather than acronyms inside unrelated names", () => {
    assert.equal(semanticCanonicalValue("New Balance"), "new balance");
    assert.equal(semanticCanonicalValue("enhanced performance"), "enhanced performance");
    assert.equal(semanticCanonicalValue("supports ANC"), "active noise cancellation");
  });

  it("requires affirmative active noise cancellation rather than passive isolation or transparency", () => {
    for (const evidence of ["Hybrid ANC reduces unwanted ambient sound.", "Includes active noise cancelling.", "Adaptive active noise canceling technology."]) {
      assert.equal(matchSemanticFeatureEvidence(evidence, "active noise cancellation").status, "pass", evidence);
    }
    for (const evidence of ["Passive noise isolation with ear tips.", "Transparency and ambient sound mode.", "Environmental noise cancellation for phone calls."]) {
      assert.notEqual(matchSemanticFeatureEvidence(evidence, "ANC").status, "pass", evidence);
    }
    assert.equal(matchSemanticFeatureEvidence("No active noise cancellation.", "ANC").status, "fail");
    assert.equal(matchSemanticFeatureEvidence("ANC support has not been verified.", "active noise cancellation").status, "needs_verification");
  });

  it("matches equivalent wording and unit variants", () => {
    const cases = [
      ["Includes a foam sprayer for car washing.", "foam cannon"],
      ["25-foot high pressure hose with brass fittings.", "long hose"],
      ["Designed for dog hair and cat fur pickup.", "pet hair"],
      ["Self-cleaning brushroll for pet hair pickup.", "pet hair"],
      ["Runs at a 42 dB noise rating in sleep mode.", "quiet"],
      ["Chair includes adjustable back support and lumbar support.", "adjustable lumbar"],
      ["Portable 7.3-pound design for quick cleanups.", "lightweight"],
      ["Makes soft chewable pellet ice for drinks.", "nugget ice"],
      ["Automatic cleaning cycle keeps the machine fresh.", "self cleaning"],
      ["Small footprint works well on crowded countertops.", "compact"],
      ["Manual steam wand makes milk drinks.", "steam wand"],
      ["Dishwasher-safe parts and a removable water tank make cleanup easier.", "easy cleaning"],
      ["18V lithium-ion hammer drill kit with battery and charger.", "cordless"],
    ];

    for (const [evidence, requirement] of cases) {
      assert.equal(
        matchSemanticFeatureEvidence(evidence, requirement).status,
        "pass",
        requirement,
      );
    }
  });

  it("keeps negation and verification uncertainty separate", () => {
    assert.equal(
      matchSemanticFeatureEvidence("Does not include a foam cannon.", "foam cannon").status,
      "fail",
    );
    assert.equal(
      matchSemanticFeatureEvidence("Foam cannon support was not verified.", "foam cannon")
        .status,
      "needs_verification",
    );
  });

  it("treats conflicting product subtypes as failed evidence", () => {
    const match = matchSemanticFeatureEvidence(
      "27 lb/day bullet ice countertop ice maker with self-cleaning.",
      "nugget ice",
    );

    assert.equal(match.status, "fail");
  });

  it("does not accept an explicitly corded product as cordless", () => {
    assert.equal(
      matchSemanticFeatureEvidence(
        "Corded electric drill with a 10-foot power cable.",
        "cordless",
      ).status,
      "fail",
    );
  });

  it("does not accept separate accessories as built-in feature evidence", () => {
    const match = matchSemanticFeatureEvidence(
      "Portable espresso maker; use a separate milk frother for lattes.",
      "steam wand",
    );

    assert.equal(match.status, "fail");
  });

  it("treats dealbreakers as evidence-backed violations", () => {
    assert.equal(
      violatesSemanticDealbreaker("Electric motor with no gas required.", "gas"),
      false,
    );
    assert.equal(
      violatesSemanticDealbreaker("Gas powered engine with pull start.", "gas"),
      true,
    );
  });
});
