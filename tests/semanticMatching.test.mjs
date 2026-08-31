import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  matchSemanticFeatureEvidence,
  violatesSemanticDealbreaker,
} from "../lib/semanticMatching.ts";

describe("semantic matching", () => {
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
