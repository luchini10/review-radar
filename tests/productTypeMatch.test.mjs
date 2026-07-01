import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";

describe("classifyProductTypeMatch (shared wrong-product-type verdict)", () => {
  it("rejects a different product type (gaming chair for an office chair)", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "RESPAWN Racing Style Gaming Chair with footrest",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "wrong_type");
  });

  it("rejects an accessory/complement (chair mat for an office chair)", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Heavy Duty Chair Mat for Carpet",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "complement");
  });

  it("rejects a component substitution (cooktop for an oven, water filter for a refrigerator)", () => {
    const cooktop = classifyProductTypeMatch({
      evidenceText: "36 inch Gas Cooktop with 5 sealed burners",
      requestedCategory: "oven",
    });
    assert.equal(cooktop.canBeExactMatch, false);
    assert.equal(cooktop.status, "component_substitution");

    const filter = classifyProductTypeMatch({
      evidenceText: "Replacement Water Filter cartridge",
      requestedCategory: "refrigerator",
    });
    assert.equal(filter.canBeExactMatch, false);
    assert.equal(filter.status, "component_substitution");
  });

  it("accepts the requested product type for a listed category", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Ergonomic Mesh Office Chair with lumbar support",
      requestedCategory: "office chair",
    });

    assert.equal(verdict.canBeExactMatch, true);
    assert.equal(verdict.status, "ok");
  });

  it("rejects a cross-category conflict caught only by the conflict rules (ottoman for a sofa)", () => {
    // "sofa" has no product-type-intent rule, so this exercises the conflict-rule
    // path specifically (not intent or component substitution).
    const verdict = classifyProductTypeMatch({
      evidenceText: "Storage Ottoman Bench with tray top",
      requestedCategory: "sofa",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "type_conflict");
  });

  it("rejects an explicit wine-refrigerator mismatch for a dehumidifier without relying on a model token", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Whynter 34 Bottle Freestanding Wine Refrigerator",
      requestedCategory: "dehumidifier",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "type_conflict");
  });

  it("keeps a real product that shares words with a conflict rule", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Sun Joe SPX3000 Electric Pressure Washer 2030 PSI",
      requestedCategory: "pressure washer",
    });

    assert.equal(verdict.canBeExactMatch, true);
    assert.equal(verdict.status, "ok");
  });

  it("keeps a valid wet-dry shop vacuum after the shop-vac rule is enabled", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Stinger 12 Gallon Wet/Dry Shop Vacuum",
      requestedCategory: "shop vac",
    });

    assert.equal(verdict.canBeExactMatch, true);
    assert.equal(verdict.status, "ok");
  });

  it("rejects household floor washers for shop-vac intent without trusting assigned category text", () => {
    const wrong = [
      "BISSELL CrossWave Cordless Max Wet Dry Vac 2554A",
      "Tineco Floor ONE S7 Wet Dry Vacuum Mop",
      "Shark HydroVac Multi-Surface Floor Cleaner",
      "Hoover FloorMate Hard Floor Cleaner",
      "Portable Carpet and Upholstery Spot Cleaner",
    ];

    for (const evidenceText of wrong) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "shop vac",
      });

      assert.equal(verdict.canBeExactMatch, false, evidenceText);
      assert.equal(verdict.status, "wrong_type", evidenceText);
    }
  });

  it("keeps conventional shop vacuums valid across unrelated brands", () => {
    const valid = [
      "HART 12 Gallon 6 Peak HP Wet Dry Shop Vacuum VOC1212PW",
      "Stanley 5 Gallon Wet/Dry Utility Vacuum SL18115",
      "CRAFTSMAN 12 Gallon Corded Wet Dry Shop Vacuum",
      "Vacmaster 8 Gallon Wet/Dry Vacuum VOC809PF",
    ];

    for (const evidenceText of valid) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        requestedCategory: "shop vac",
      });

      assert.equal(verdict.canBeExactMatch, true, evidenceText);
      assert.equal(verdict.status, "ok", evidenceText);
    }
  });

  it("rejects Phase 5E substitution classes through the shared verdict", () => {
    const cases = [
      ["ZEP 64 oz All-In-One Pressure Wash", "pressure washer"],
      ["Goal Zero Yeti 3000X Portable Power Station", "portable generator"],
      ["Basketball Hoop Blueprint Canvas Wall Art", "basketball hoop"],
      ["YADA Digital Wireless Backup Camera with Dash Monitor", "dash cam"],
      ["GE Profile UltraFast Washer Dryer Combo", "robot vacuum"],
    ];

    for (const [evidenceText, requestedCategory] of cases) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        requestedCategory,
      });

      assert.equal(
        verdict.canBeExactMatch,
        false,
        `${evidenceText} should not match ${requestedCategory}`,
      );
    }
  });
});
