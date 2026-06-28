import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  brandEvidenceMatches,
  detectKnownBrands,
  inferKnownBrand,
} from "../lib/brandMatching.ts";

describe("ambiguous short brand aliases", () => {
  it("does not treat horsepower HP as Hewlett-Packard brand evidence", () => {
    const title = "RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900";

    assert.deepEqual(detectKnownBrands(title), []);
    assert.equal(inferKnownBrand(title), null);
    assert.equal(brandEvidenceMatches(title, "HP"), false);
  });

  it("preserves genuine HP computer-brand evidence", () => {
    assert.deepEqual(detectKnownBrands("HP Pavilion TP01-3020 Desktop PC"), ["HP"]);
    assert.equal(inferKnownBrand("HP 15.6 inch HD Windows Laptop"), "HP");
    assert.equal(brandEvidenceMatches("HP EliteBook 840 G10", "HP"), true);
  });
});
