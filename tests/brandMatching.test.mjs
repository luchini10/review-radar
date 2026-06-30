import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  brandEvidenceMatches,
  detectKnownBrands,
  inferKnownBrand,
  isSourceOrRetailerLabel,
  stripLeadingSourceOrRetailerLabel,
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

describe("retailer/source identity labels", () => {
  it("strips explicit retailer prefixes without treating them as product brands", () => {
    const labels = [
      "Amazon.com",
      "Walmart",
      "Home Depot",
      "The Home Depot",
      "Best Buy",
      "Target",
      "Chewy",
      "Lowe's",
      "eBay",
      "Costco",
      "Sam's Club",
    ];

    for (const label of labels) {
      assert.equal(isSourceOrRetailerLabel(label), true, label);
      assert.equal(
        stripLeadingSourceOrRetailerLabel(`${label}: RIDGID VAC1200`),
        "RIDGID VAC1200",
        label,
      );
    }
  });

  it("preserves Amazon Basics as a real private-label product brand", () => {
    assert.equal(isSourceOrRetailerLabel("Amazon Basics"), false);
    assert.equal(
      stripLeadingSourceOrRetailerLabel(
        "Amazon Basics 6-Gallon Wet/Dry Vacuum",
      ),
      "Amazon Basics 6-Gallon Wet/Dry Vacuum",
    );
    assert.equal(
      inferKnownBrand("Amazon Basics 6-Gallon Wet/Dry Vacuum"),
      "Amazon Basics",
    );
  });
});
