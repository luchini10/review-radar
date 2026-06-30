import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectFormFactors,
  isComponentSubstitution,
  offFormFactorModifiers,
} from "../lib/formFactor.ts";

describe("detectFormFactors", () => {
  it("detects niche/smaller form-factor modifiers on word boundaries", () => {
    assert.deepEqual([...detectFormFactors("Cuisinart Tabletop Gas Grill")], ["tabletop"]);
    assert.deepEqual([...detectFormFactors("Handheld Travel Steamer")].sort(), ["handheld", "travel"]);
    assert.deepEqual(
      [...detectFormFactors("Under Desk Walking Pad Treadmill")],
      ["walking-pad"],
    );
  });

  it("does not fire inside unrelated words", () => {
    assert.equal(detectFormFactors("minimum 600 CFM blower").size, 0);
    assert.equal(detectFormFactors("comparable performance").size, 0);
  });

  it("returns an empty set for thin text", () => {
    assert.equal(detectFormFactors("").size, 0);
    assert.equal(detectFormFactors(undefined).size, 0);
  });
});

describe("offFormFactorModifiers", () => {
  it("flags a modifier the candidate carries but the request did not ask for", () => {
    assert.deepEqual(
      offFormFactorModifiers("Weber Tabletop Gas Grill", "gas grill"),
      ["tabletop"],
    );
  });

  it("does not flag a modifier the user explicitly requested", () => {
    assert.deepEqual(
      offFormFactorModifiers("Coleman Portable Gas Grill", "portable gas grill"),
      [],
    );
    assert.deepEqual(
      offFormFactorModifiers(
        "Sunny Compact Under Desk Walking Pad Treadmill",
        "under desk treadmill",
      ),
      [],
    );
  });

  it("returns nothing for a plain full-size candidate", () => {
    assert.deepEqual(offFormFactorModifiers("Weber Spirit II Gas Grill", "gas grill"), []);
  });
});

describe("isComponentSubstitution", () => {
  it("rejects a cooktop for an oven/range/stove search", () => {
    assert.equal(isComponentSubstitution("36 inch Gas Cooktop", "gas range"), true);
  });

  it("keeps a range that includes a cooktop surface", () => {
    assert.equal(isComponentSubstitution("Gas Range with sealed cooktop and oven", "gas range"), false);
  });

  it("rejects a standalone refrigerator accessory", () => {
    assert.equal(
      isComponentSubstitution("Replacement Water Filter for French Door", "french door refrigerator"),
      true,
    );
  });

  it("keeps an actual refrigerator that mentions an ice maker", () => {
    assert.equal(
      isComponentSubstitution("French Door Refrigerator with built-in ice maker", "refrigerator"),
      false,
    );
  });

  it("rejects bed frames and foundations for a mattress search", () => {
    assert.equal(
      isComponentSubstitution("Basi King Bed Frame - Oak", "king size mattress"),
      true,
    );
    assert.equal(
      isComponentSubstitution("Adjustable Mattress Foundation", "king size mattress"),
      true,
    );
    assert.equal(
      isComponentSubstitution("Hudson Bed | Pottery Barn", "king size mattress"),
      true,
    );
  });

  it("keeps an actual mattress for a mattress search", () => {
    assert.equal(
      isComponentSubstitution("Nectar Classic 12 King Mattress", "king size mattress"),
      false,
    );
  });

  it("does not fire when the base category is unrelated", () => {
    assert.equal(isComponentSubstitution("36 inch Gas Cooktop", "leaf blower"), false);
  });
});
