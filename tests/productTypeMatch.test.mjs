import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeMatch } from "../lib/productTypeMatch.ts";

describe("classifyProductTypeMatch (shared wrong-product-type verdict)", () => {
  it("rejects humidifiers as air purifiers even when a page path mentions purifier", () => {
    const verdict = classifyProductTypeMatch({
      allowedCheckText:
        "Levoit 200S humidifier levoit vital 200s true air purifier",
      evidenceText:
        "Levoit 200S humidifier levoit vital 200s true air purifier",
      identityText:
        "Levoit 200S humidifier levoit vital 200s true air purifier",
      requestedCategory: "air purifier",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "wrong_type");
  });

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

  it("rejects an explicit non-drip brewer for a drip coffee maker request", () => {
    const verdict = classifyProductTypeMatch({
      evidenceText: "Bodum Brazil French Press Coffee Maker - 51 oz (12 Cups)",
      identityText: "Bodum Brazil French Press Coffee Maker - 51 oz (12 Cups)",
      requestedCategory: "drip coffee maker",
    });

    assert.equal(verdict.canBeExactMatch, false);
    assert.equal(verdict.status, "wrong_type");
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

  it("rejects household upright, stick, canister, and handheld vacuums for shop-vac intent", () => {
    const wrong = [
      "Shark Navigator Lift Away Deluxe Upright Vacuum NV360",
      "Dyson V15 Detect Cordless Stick Vacuum",
      "Kenmore 200 Series Bagged Canister Vacuum",
      "Black and Decker Dustbuster Handheld Vacuum",
    ];

    for (const evidenceText of wrong) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "shop vacuum",
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

  it("RR-087 rejects captured standalone shop-vac complements at the shared type seam", () => {
    const standaloneComplements = [
      "Global Industrial Cartridge Filter 641197",
      "Universal Cartridge Filter for Wet/Dry Vacuum",
      "WORKSHOP Wet/Dry Vacs Blower Nozzle Vacuum Attachment WS25006A",
    ];

    for (const evidenceText of standaloneComplements) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "shop vac",
      });

      assert.equal(verdict.canBeExactMatch, false, evidenceText);
      assert.equal(verdict.status, "complement", evidenceText);
    }
  });

  it("rejects RR-079 standalone robot-vacuum docks while preserving bundles", () => {
    const standaloneAccessories = [
      "Self-Empty Clean Base Station Compatible With Roborock Q5 Robot Vacuum",
      "Replacement Auto Empty Dock for Roomba Robot Vacuum",
      "Docking Station Works With Eufy Robot Vacuum",
      "Roborock Auto Empty Dock for Q5 Robot Vacuum",
      "Replacement Charging Station Compatible With Roomba Robot Vacuum",
      "Dust Disposal Base for Eufy Robot Vacuum",
      "Roborock Auto Empty Station for Q5 Robot Vacuum",
    ];

    for (const evidenceText of standaloneAccessories) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "robot vacuum",
      });

      assert.equal(verdict.canBeExactMatch, false, evidenceText);
      assert.equal(verdict.status, "complement", evidenceText);
    }

    const bundles = [
      "Roborock Q7 Max+ Robot Vacuum with Auto-Empty Dock",
      "Shark Matrix Robot Vacuum and Self-Empty Base Bundle",
      "iRobot Roomba j9+ Robot Vacuum Includes Clean Base Station",
      "Base Model Roborock Q5 Robot Vacuum",
    ];

    for (const evidenceText of bundles) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "robot vacuum",
      });

      assert.equal(verdict.canBeExactMatch, true, evidenceText);
      assert.equal(verdict.status, "ok", evidenceText);
    }
  });

  it("uses richer allowed evidence without weakening the standalone-dock identity veto", () => {
    const legitimateVacuum = classifyProductTypeMatch({
      allowedCheckText:
        "Roborock S8 MaxV Ultra flagship robot vacuum and mop with LiDAR navigation",
      evidenceText: "Roborock S8 MaxV Ultra Self-empty dock",
      identityText: "Roborock S8 MaxV Ultra",
      requestedCategory: "robot vacuum",
    });

    assert.equal(legitimateVacuum.canBeExactMatch, true);
    assert.equal(legitimateVacuum.status, "ok");

    const standaloneDock = classifyProductTypeMatch({
      allowedCheckText:
        "Self-Empty Clean Base Station compatible with a Roborock robot vacuum",
      evidenceText:
        "Self-Empty Clean Base Station Compatible With Roborock Q5 Robot Vacuum",
      identityText:
        "Self-Empty Clean Base Station Compatible With Roborock Q5 Robot Vacuum",
      requestedCategory: "robot vacuum",
    });

    assert.equal(standaloneDock.canBeExactMatch, false);
    assert.equal(standaloneDock.status, "complement");

    const mislabeledWallOven = classifyProductTypeMatch({
      allowedCheckText:
        "A regular wall oven incorrectly labeled as a toaster oven",
      evidenceText: "GE Built-In Electric Wall Oven with Convection",
      identityText: "GE Built-In Electric Wall Oven with Convection",
      requestedCategory: "toaster oven",
    });

    assert.equal(mislabeledWallOven.canBeExactMatch, false);
    assert.equal(mislabeledWallOven.status, "wrong_type");
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

  it("rejects any positively recognized different product class while preserving sparse identities", () => {
    const explicitConflicts = [
      "KitchenAid KUIX515SPA Built-In Undercounter Clear Ice Maker",
      "Breville Smart Oven Air Fryer Toaster Oven",
      "HON Ignition 2.0 Ergonomic Mesh Office Chair",
    ];

    for (const evidenceText of explicitConflicts) {
      const verdict = classifyProductTypeMatch({
        evidenceText,
        identityText: evidenceText,
        requestedCategory: "robot vacuum",
      });

      assert.equal(verdict.canBeExactMatch, false, evidenceText);
      assert.equal(verdict.status, "wrong_type", evidenceText);
    }

    const sparse = classifyProductTypeMatch({
      evidenceText: "Roborock S7 MaxV Ultra Long Range",
      identityText: "Roborock S7 MaxV Ultra Long Range",
      requestedCategory: "robot vacuum",
    });

    assert.equal(sparse.canBeExactMatch, true);
    assert.equal(sparse.status, "ok");
  });
});
