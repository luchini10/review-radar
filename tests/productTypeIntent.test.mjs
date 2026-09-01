import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeIntent } from "../lib/productTypeIntent.ts";

describe("product type intent classifier", () => {
  it("keeps leaf blowers separate from compact workshop blowers", () => {
    for (const candidateText of [
      "EGO Power+ 615 CFM Cordless Leaf Blower",
      "Atlas 80V Brushless Cordless 150 MPH/605 CFM Blower",
    ]) {
      const verdict = classifyProductTypeIntent({
        requestedText: "cordless leaf blower",
        candidateText,
        candidateIdentityText: candidateText,
      });
      assert.equal(verdict.status, "exact", candidateText);
      assert.equal(verdict.canBeExactMatch, true, candidateText);
    }

    for (const candidateText of [
      "Bauer 20V Cordless 200 MPH/120 CFM Compact Workshop Blower",
      "20V Jobsite Blower",
      "Leaf Blower Replacement Nozzle Attachment",
    ]) {
      const verdict = classifyProductTypeIntent({
        requestedText: "cordless leaf blower",
        candidateText,
        candidateIdentityText: candidateText,
      });
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }
  });

  it("rejects multi-tool combo kits as a standalone cordless drill", () => {
    for (const candidateText of [
      "Ryobi ONE+ HP 18V Brushless Cordless Compact 4-Tool Combo Kit",
      "Ryobi ONE+ HP 18V Brushless Cordless 2-Tool Combo Kit with Drill and Impact Driver",
    ]) {
      const verdict = classifyProductTypeIntent({
        requestedText: "cordless drill",
        candidateText,
        candidateIdentityText: candidateText,
      });
      assert.equal(verdict.status, "irrelevant", candidateText);
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }

    const drillKit = classifyProductTypeIntent({
      requestedText: "cordless drill",
      candidateText:
        "Craftsman V20 Brushless Cordless Drill Driver Kit with Battery and Charger",
    });
    assert.equal(drillKit.status, "exact");
  });

  it("keeps toaster ovens separate from full-size ovens and ranges", () => {
    const valid = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "Breville Smart Oven Air Fryer Pro countertop toaster oven",
    });
    const wallOven = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "GE 30 inch built-in electric wall oven with convection",
    });
    const range = classifyProductTypeIntent({
      requestedText: "toaster oven",
      candidateText: "Samsung freestanding gas range with conventional oven",
    });

    assert.equal(valid.status, "exact");
    assert.equal(valid.canBeExactMatch, true);
    assert.equal(wallOven.status, "irrelevant");
    assert.equal(wallOven.canBeExactMatch, false);
    assert.equal(range.status, "irrelevant");
    assert.equal(range.canBeExactMatch, false);
  });

  it("treats accessories as complements, not exact products", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "microwave",
      candidateText: "Universal microwave turntable replacement plate",
    });

    assert.equal(verdict.status, "complement");
    assert.equal(verdict.canBeExactMatch, false);
  });

  it("returns needs verification when a specific product type is not proven", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "office chair",
      candidateText: "Ergonomic seating with adjustable arms",
    });

    assert.equal(verdict.status, "needs_verification");
    assert.equal(verdict.canBeExactMatch, false);
  });

  it("robot_vacuum: blocks wrong-type vacuums from robot vacuum searches", () => {
    const cases = [
      { name: "stick", candidateText: "Shark Rocket Bagless Corded Washable Filter Stick Vacuum" },
      { name: "canister", candidateText: "Kenmore 200 Series Bagged Canister Vacuum Cleaner" },
      { name: "hand vacuum", candidateText: "ONE+ 18V Cordless Wet Dry Hand Vacuum" },
      { name: "wet/dry (truncated)", candidateText: "Milwaukee M18 18-Volt 2 Gal Lithium-Ion Cordless Wet Dry" },
      { name: "upright", candidateText: "Hoover WindTunnel Upright Vacuum T-Series" },
    ];

    for (const { name, candidateText } of cases) {
      const v = classifyProductTypeIntent({ requestedText: "robot vacuum", candidateText });
      assert.equal(v.status, "irrelevant", `${name} should be irrelevant for robot vacuum query`);
      assert.equal(v.canBeExactMatch, false);
    }
  });

  it("robot_vacuum: allows genuine robot vacuums by name", () => {
    const cases = [
      "Dreame X30 Ultra Robot Vacuum and Mop",
      "iRobot Roomba j9+ Robot Vacuum",
      "Roborock Q5 Pro Robot Vacuum",
    ];

    for (const candidateText of cases) {
      const v = classifyProductTypeIntent({ requestedText: "robot vacuum", candidateText });
      assert.equal(v.status, "exact", `"${candidateText}" should be exact for robot vacuum`);
    }
  });

  it("robot_vacuum: allows sparse names when bounded candidate evidence confirms the type", () => {
    // Product name alone does not contain 'robot vacuum'.
    const v = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText: "Roborock S8 MaxV Ultra",
      allowedCheckText: "Roborock S8 MaxV Ultra official pages describe this as a flagship robot vacuum and mop with LiDAR navigation",
    });

    assert.equal(v.status, "exact");
    assert.equal(v.canBeExactMatch, true);
  });

  it("robot_vacuum: needs verification when neither name nor evidence confirms the type", () => {
    const v = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText: "Roborock S7 MaxV Ultra",
      allowedCheckText: "Roborock S7 MaxV Ultra older flagship with automated wash-fill-empty dock and premium vacuum-mop design",
    });

    assert.equal(v.status, "needs_verification");
    assert.equal(v.canBeExactMatch, false);
  });

  it("robot_vacuum: rejects a standalone self-empty base even when snippets mention the vacuum", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText:
        "Shark Robot AI Self-Empty XL Base xdockav2501ae replacement base for the Shark robot vacuum",
      candidateIdentityText:
        "Shark Robot AI Self-Empty XL Base xdockav2501ae",
      allowedCheckText:
        "Shark Robot AI Self-Empty XL Base xdockav2501ae compatible with a Shark robot vacuum",
    });

    assert.equal(verdict.status, "complement");
    assert.equal(verdict.canBeExactMatch, false);
  });

  it("robot_vacuum: preserves a complete vacuum sold with a self-empty base", () => {
    const verdict = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText:
        "Shark Matrix Robot Vacuum with Self-Emptying XL Base RV2310AE",
      candidateIdentityText:
        "Shark Matrix Robot Vacuum with Self-Emptying XL Base RV2310AE",
    });

    assert.equal(verdict.status, "exact");
    assert.equal(verdict.canBeExactMatch, true);
  });

  it("shop_vac: rejects household wet floor cleaners even when their titles say wet dry vacuum", () => {
    const householdFloorCleaners = [
      "BISSELL CrossWave HF3 Cordless Multi-Surface Wet Dry Vacuum 3649A",
      "Tineco Floor ONE S5 Smart Cordless Wet Dry Vacuum Cleaner and Mop",
      "Shark HydroVac Cordless Pro XL 3-in-1 Vacuum Mop",
      "Hoover FloorMate Deluxe Hard Floor Cleaner",
      "Portable Carpet Cleaner and Upholstery Spot Cleaner",
    ];

    for (const candidateText of householdFloorCleaners) {
      const verdict = classifyProductTypeIntent({
        requestedText: "shop vac",
        candidateText,
      });

      assert.equal(verdict.status, "irrelevant", candidateText);
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }
  });

  it("shop_vac: rejects ordinary household vacuum form factors", () => {
    const householdVacuums = [
      "Shark Navigator Lift Away Deluxe Upright Vacuum NV360",
      "Dyson V15 Detect Cordless Stick Vacuum",
      "Kenmore 200 Series Bagged Canister Vacuum",
      "Black and Decker Dustbuster Handheld Vacuum",
    ];

    for (const candidateText of householdVacuums) {
      const verdict = classifyProductTypeIntent({
        requestedText: "shop vacuum",
        candidateText,
      });

      assert.equal(verdict.status, "irrelevant", candidateText);
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }
  });

  it("shop_vac: preserves conventional wet-dry utility vacuums", () => {
    const utilityVacuums = [
      "RIDGID 9 Gallon 4.25 Peak HP NXT Wet Dry Vac HD0900",
      "Shop-Vac 10 Gallon 5.5 Peak HP Wet/Dry Shop Vacuum",
      "Vacmaster Professional Beast Series 12 Gallon Wet/Dry Vacuum",
      "DEWALT DXV09P 9 Gallon Wet/Dry Utility Vacuum",
      "Milwaukee M18 2 Gallon Cordless Wet/Dry Jobsite Vacuum",
      "Armor All 2.5 Gallon Utility Wet/Dry Vacuum VOM205P",
    ];

    for (const candidateText of utilityVacuums) {
      const verdict = classifyProductTypeIntent({
        requestedText: "wet dry vac",
        candidateText,
      });

      assert.equal(verdict.status, "exact", candidateText);
      assert.equal(verdict.canBeExactMatch, true, candidateText);
    }
  });

  it("shop_vac: rejects concise hose, nozzle, and filter-bag accessory identities", () => {
    const accessories = [
      "DEWALT Wet/Dry Vac Hose",
      "DEWALT Utility Nozzle Attachment",
      "DEWALT Wet Dry Vac Filter Bag",
    ];

    for (const candidateText of accessories) {
      const verdict = classifyProductTypeIntent({
        requestedText: "shop vac",
        candidateText,
        candidateIdentityText: candidateText,
      });

      assert.equal(verdict.status, "complement", candidateText);
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }
  });

  it("RR-087: rejects standalone cartridge filters and blower-nozzle attachments", () => {
    const standaloneComplements = [
      "Global Industrial Cartridge Filter 641197",
      "Universal Cartridge Filter for Wet/Dry Vacuum",
      "WORKSHOP Wet/Dry Vacs Blower Nozzle Vacuum Attachment WS25006A",
    ];

    for (const candidateText of standaloneComplements) {
      const verdict = classifyProductTypeIntent({
        requestedText: "shop vac",
        candidateText,
        candidateIdentityText: candidateText,
      });

      assert.equal(verdict.status, "complement", candidateText);
      assert.equal(verdict.canBeExactMatch, false, candidateText);
    }
  });

  it("shop_vac: preserves a complete vacuum that lists included accessories", () => {
    const completeProducts = [
      "DEWALT DXV12P 12 Gallon Wet Dry Vacuum with Hose and Utility Nozzle",
      "RIDGID 12 Gallon Wet Dry Vacuum with Cartridge Filter",
      "CRAFTSMAN Wet Dry Shop Vacuum Includes Blower Nozzle",
    ];

    for (const candidateText of completeProducts) {
      const verdict = classifyProductTypeIntent({
        requestedText: "shop vac",
        candidateText,
        candidateIdentityText: candidateText,
      });

      assert.equal(verdict.status, "exact", candidateText);
      assert.equal(verdict.canBeExactMatch, true, candidateText);
    }
  });

  it("floor-cleaner intent keeps household wet floor cleaners valid", () => {
    const cases = [
      ["hard floor cleaner", "Hoover FloorMate Deluxe Hard Floor Cleaner"],
      ["vacuum mop", "Shark HydroVac Cordless Pro XL Vacuum Mop"],
      ["wet dry mop", "Tineco Floor ONE S5 Wet Dry Vacuum Cleaner and Mop"],
      ["floor washer", "BISSELL CrossWave Cordless Multi-Surface Floor Washer"],
      ["Bissell CrossWave", "BISSELL CrossWave HF3 Wet Dry Vacuum 3649A"],
    ];

    for (const [requestedText, candidateText] of cases) {
      const verdict = classifyProductTypeIntent({
        requestedText,
        candidateText,
      });

      assert.equal(verdict.status, "exact", `${requestedText}: ${candidateText}`);
      assert.equal(verdict.canBeExactMatch, true, requestedText);
    }
  });

  it("rejects reproduced cross-category substitutions while preserving real products", () => {
    const cases = [
      {
        requestedText: "pressure washer",
        wrong: "ZEP 64 oz. All-In-One Pressure Wash ZUPPWC64",
        valid: "Sun Joe SPX3000 Electric Pressure Washer 2030 PSI",
      },
      {
        requestedText: "portable generator",
        wrong: "BioLite BaseCharge 1500 Portable Power Station",
        valid: "Generac GP3300i Portable Inverter Generator",
      },
      {
        requestedText: "basketball hoop",
        wrong: "Basketball Hoop Orange Sports Design Canvas Wall Art",
        valid: "Spalding 54-inch Portable Basketball Hoop",
      },
      {
        requestedText: "dash cam",
        wrong: "YADA Digital Wireless Backup Camera with 3.5-inch Dash Monitor",
        valid: "Garmin Dash Cam X310",
      },
      {
        requestedText: "robot vacuum",
        wrong: "GE Profile UltraFast Washer Dryer Combo",
        valid: "Roborock Q5 Pro Robot Vacuum",
      },
    ];

    for (const item of cases) {
      const wrong = classifyProductTypeIntent({
        requestedText: item.requestedText,
        candidateText:
          item.requestedText === "pressure washer"
            ? `${item.wrong} Use this with your pressure washer to clean outdoor surfaces.`
            : item.wrong,
        candidateIdentityText: item.wrong,
      });
      const valid = classifyProductTypeIntent({
        requestedText: item.requestedText,
        candidateText: item.valid,
      });

      assert.equal(
        wrong.canBeExactMatch,
        false,
        `${item.wrong} should not match ${item.requestedText}`,
      );
      assert.equal(
        valid.canBeExactMatch,
        true,
        `${item.valid} should match ${item.requestedText}`,
      );
    }
  });
});
