import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  exactModelIdentifiers,
  haveConflictingCompoundModelSequences,
  haveConflictingNamedModelVariants,
  haveConflictingNumericProductSpecs,
  modelIdentityRelation,
  stableModelIdentifiers,
  strongModelTokens,
} from "../lib/productIdentity.ts";

describe("selection product identity", () => {
  it("extracts stable model identifiers without treating measurements as models", () => {
    assert.deepEqual([...strongModelTokens("Acer Nitro XV272U 180Hz")], [
      "xv272u",
    ]);
    assert.deepEqual(
      stableModelIdentifiers("27 inch 1440p 180Hz monitor"),
      [],
    );
    assert.deepEqual(
      stableModelIdentifiers(
        "Greenworks 125 MPH/450 CFM 60V cordless leaf blower",
      ),
      [],
    );
    assert.deepEqual(
      stableModelIdentifiers(
        "RIDGID HD1200 12 Gal. 5.0-Peak HP NXT wet/dry shop vacuum",
      ),
      ["hd1200"],
    );
    assert.deepEqual(
      exactModelIdentifiers("Milwaukee M18 2904 Hammer Drill"),
      ["m18", "2904"],
    );
    assert.deepEqual(
      exactModelIdentifiers("Sun Joe 2000 PSI pressure washer"),
      [],
    );
    assert.deepEqual(
      exactModelIdentifiers("Moccamaster KBGV Select"),
      ["kbgv"],
    );
    assert.deepEqual(
      exactModelIdentifiers("ECOVACS DEEBOT X9 PRO OMNI"),
      ["x9", "deebot"],
    );
    assert.deepEqual(exactModelIdentifiers("4K 5G monitor"), []);
  });

  it("detects conflicting sibling compound models", () => {
    assert.equal(
      haveConflictingCompoundModelSequences(
        "Roborock Q10 S5 Plus",
        "roborock-q10-x5-plus",
      ),
      true,
    );
    assert.equal(
      haveConflictingCompoundModelSequences(
        "Roborock Q10 S5 Plus",
        "roborock-q10-s5-plus",
      ),
      false,
    );
    assert.equal(
      haveConflictingCompoundModelSequences(
        "RIDGID HD1200",
        "RIDGID-HD1200-HD1200",
      ),
      false,
    );
  });

  it("does not treat a voltage platform's MAX label as a named sibling", () => {
    assert.equal(
      haveConflictingNamedModelVariants(
        "DeWalt DCD1007B",
        "DeWalt DCD1007B 20V MAX XR Brushless Hammer Drill",
      ),
      false,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Eureka E20 Plus Robot Vacuum",
        "Eureka E20 Evo Plus Robot Vacuum",
      ),
      true,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Dreame X60 Max Ultra Complete",
        "Dreame X60 Max Ultra Kit",
      ),
      true,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "DeWalt DCD701F2",
        "DeWalt DCD701F2 Compact Drill Kit",
      ),
      false,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Craftsman CMEPW2100",
        "Craftsman CMEPW2100 Craftsman 2100 max PSI electric pressure washer",
      ),
      false,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Milwaukee M18 FUEL Dual Battery Blower",
        "Milwaukee M18 Precision Blower",
      ),
      true,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Milwaukee M18 FUEL Dual Battery Blower",
        "Milwaukee M18 FUEL Dual Battery Backpack Blower",
      ),
      true,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Dreame D30 Ultra CE Robot Vacuum",
        "Dreame D30 Ultra Robot Vacuum",
      ),
      true,
    );
    assert.equal(
      haveConflictingNamedModelVariants(
        "Dreame D30 Ultra CE Robot Vacuum",
        "Dreame D30 Ultra CE Robot Vacuum",
      ),
      false,
    );
  });

  it("detects numeric variant conflicts", () => {
    assert.equal(
      haveConflictingNumericProductSpecs(
        "CRAFTSMAN 12 gallon 5 HP shop vacuum",
        "CRAFTSMAN 16 gallon 6 HP shop vacuum",
      ),
      true,
    );
    assert.equal(
      haveConflictingNumericProductSpecs(
        "17.3 inch laptop with 16GB RAM and 512GB SSD",
        "hp-14-inch-laptop-4gb-ram-128gb-ufs",
      ),
      true,
    );
    assert.equal(
      haveConflictingNumericProductSpecs(
        "13 inch laptop with 1TB SSD",
        "13-inch-laptop-with-512gb-storage",
      ),
      true,
    );
  });

  it("recognizes an exact model relation and rejects a sibling model", () => {
    const same = modelIdentityRelation(
      "Roborock Q10 S5 Plus",
      "Roborock Q10 S5 Plus",
    );
    const sibling = modelIdentityRelation(
      "Roborock Q10 S5 Plus",
      "Roborock Q10 X5 Plus",
    );
    assert.equal(same.matchesCompleteAlias, true);
    assert.equal(same.hasConflict, false);
    assert.equal(sibling.hasConflict, true);
  });
});
