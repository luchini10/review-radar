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
    const horsepowerEvidence = [
      "RIDGID 9 Gallon 4.25 Peak HP NXT Wet/Dry Vac HD0900",
      "Wet/dry vacuum motor HP rating",
      "Pressure washer pump HP specification",
      "Air compressor HP motor",
      "Generator engine rated HP",
      "Shop vacuum suction HP",
    ];

    for (const title of horsepowerEvidence) {
      assert.deepEqual(detectKnownBrands(title), [], title);
      assert.equal(inferKnownBrand(title), null, title);
      assert.equal(brandEvidenceMatches(title, "HP"), false, title);
    }
  });

  it("preserves genuine HP computer-brand evidence", () => {
    const genuineHpProducts = [
      "HP Pavilion TP01-3020 Desktop PC",
      "HP 15.6 inch HD Windows Laptop",
      "HP Series 5 27 inch Monitor",
      "HP LaserJet Pro M404dn Printer",
      "HP OfficeJet Pro 9125e",
      "HP Envy Desktop TE02",
      "HP Omen Gaming PC",
      "HP Spectre x360 Laptop",
      "HP DeskJet 2855e Printer",
      "Hewlett-Packard LaserJet Enterprise M507dn",
    ];

    for (const title of genuineHpProducts) {
      assert.deepEqual(detectKnownBrands(title), ["HP"], title);
      assert.equal(brandEvidenceMatches(title, "HP"), true, title);
    }
    assert.equal(inferKnownBrand("HP EliteBook 840 G10"), "HP");
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
