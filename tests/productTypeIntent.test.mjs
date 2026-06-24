import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyProductTypeIntent } from "../lib/productTypeIntent.ts";

describe("product type intent classifier", () => {
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

  it("robot_vacuum: allows sparse-name robot vacuums via allowedCheckText (why_recommended)", () => {
    // Product name alone does not contain 'robot vacuum'; why_recommended confirms it.
    const v = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText: "Roborock S8 MaxV Ultra",
      allowedCheckText: "Roborock S8 MaxV Ultra official pages describe this as a flagship robot vacuum and mop with LiDAR navigation",
    });

    assert.equal(v.status, "exact");
    assert.equal(v.canBeExactMatch, true);
  });

  it("robot_vacuum: returns needs_verification when neither name nor why_recommended confirms robot vacuum", () => {
    const v = classifyProductTypeIntent({
      requestedText: "robot vacuum",
      candidateText: "Roborock S7 MaxV Ultra",
      allowedCheckText: "Roborock S7 MaxV Ultra older flagship with automated wash-fill-empty dock and premium vacuum-mop design",
    });

    assert.equal(v.status, "needs_verification");
    assert.equal(v.canBeExactMatch, false);
  });
});
