import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  areSameCanonicalProduct,
  areSameExactModelProduct,
  compoundModelSequences,
  haveConflictingCompoundModelSequences,
  haveConflictingDescriptiveModelSequences,
  modelIdentityRelation,
} from "../lib/productIdentity.ts";

function product(name, product_page_url = "") {
  return {
    citations: [],
    common_complaints: [],
    confidence_score: 80,
    cons: [],
    estimated_price_range: "$149",
    name,
    not_for: [],
    price_value_verdict: "Test verdict.",
    product_image_url: "",
    product_page_url,
    pros: [],
    recommendation_type: "Best Match",
    source_consensus: "Mixed",
    why_recommended: "Test recommendation.",
  };
}

describe("product identity", () => {
  it("rejects every undocumented compound or numeric sibling in observed identity text", () => {
    assert.equal(
      haveConflictingCompoundModelSequences(
        "X100 A1",
        "Example X100 A1 and X100 B2 cordless vacuum",
      ),
      true,
    );
    assert.equal(
      haveConflictingCompoundModelSequences("X100 20", "Example X100 30 vacuum"),
      true,
    );
    assert.equal(
      haveConflictingCompoundModelSequences(
        "X100 A1 / Y200 B2",
        "Example X100 A1 cordless vacuum",
      ),
      false,
    );
    for (const observed of [
      "Example X100 A1 and B2 cordless vacuum",
      "Example X100 A1 / B2 cordless vacuum",
      "Example X100 A1 with B2 cordless vacuum",
      "Example X100 A1 plus B2 cordless vacuum",
      "Example X100 A1 alongside B2 cordless vacuum",
      "Example X100 A1 featuring B2 cordless vacuum",
      "Example X100 A1 model B2 cordless vacuum",
      "Example X100 A1 variant B2 cordless vacuum",
      "Example X100 A1 trim B2 cordless vacuum",
      "Example X100 A1 version B2 cordless vacuum",
      "Example X100 A1 aka B2 cordless vacuum",
      "Example X100 A1 includes B2 cordless vacuum",
      "Example B2 alongside X100 A1 cordless vacuum",
    ]) {
      assert.equal(
        haveConflictingCompoundModelSequences("X100 A1", observed),
        true,
        observed,
      );
      assert.deepEqual(
        {
          hasConflict: modelIdentityRelation("X100 A1", observed).hasConflict,
          matchesCompleteAlias:
            modelIdentityRelation("X100 A1", observed).matchesCompleteAlias,
        },
        { hasConflict: true, matchesCompleteAlias: false },
        observed,
      );
    }
    for (const observed of [
      "Example X100 20 plus 30 cordless vacuum",
      "Example X100 20 alongside 30 cordless vacuum",
      "Example X100 20 variant 30 cordless vacuum",
      "Example X100 20 and 30 cordless vacuum",
      "Example X100 20, 30 cordless vacuum",
      "Example 30 alongside X100 20 cordless vacuum",
      "Example X100 20 plus X100 model 2024 cordless vacuum",
      "Example X100 20 plus X100 30.0 cordless vacuum",
      "Example X100 20 plus model number 2024 cordless vacuum",
      "Example X100 20 plus model no. 2024 cordless vacuum",
      "Example X100 20 plus model code 2024 cordless vacuum",
      "Example X100 20 plus version number 30.0 cordless vacuum",
      "Example X100 20 plus variant number 30.0 cordless vacuum",
      "Example X100 20 plus variant code 2024 cordless vacuum",
      "Example X100 20 plus trim level 30.0 cordless vacuum",
      "Example X100 20 plus trim code 2024 cordless vacuum",
      "Example X100 20 plus 2024 model X100 cordless vacuum",
      "Example X100 20 plus modelID 2024 cordless vacuum",
      "Example X100 20 plus variantNumber 30.0 cordless vacuum",
      "Example X100 20 plus 2024 modelID X100 cordless vacuum",
      "Example X100 20 plus B2 with Bluetooth Low Energy version 5.0 cordless vacuum",
      "Example X100 20 plus model Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus model number Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus variant USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus variant code USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus trim HDMI eARC version 2.1 cordless vacuum",
      "Example X100 20 plus Bluetooth LE version 5.0 model cordless vacuum",
      "Example X100 20 plus model Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E model cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E trim level cordless vacuum",
      "Example X100 20 plus model ID: Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model identifier Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus model-name USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus variant ID HDMI eARC version 2.1 cordless vacuum",
      "Example X100 20 plus trim name DisplayPort Alt Mode version 2.0 cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E model identifier cordless vacuum",
      "Example X100 20 plus Bluetooth LE version 5.0 model name cordless vacuum",
      "Example X100 20 plus ModelID Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus modelIdentifier Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus modelName USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus variantID HDMI eARC version 2.1 cordless vacuum",
      "Example X100 20 plus variantIdentifier DisplayPort Alt Mode version 2.0 cordless vacuum",
      "Example X100 20 plus variantName Wi-Fi 7 cordless vacuum",
      "Example X100 20 plus trimID Bluetooth Low Energy version 5.0 cordless vacuum",
      "Example X100 20 plus trimIdentifier Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus trimName USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E ModelID cordless vacuum",
      "Example X100 20 plus Bluetooth LE version 5.0 trimName cordless vacuum",
      "Example X100 20 plus Model ID is Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus ModelID equals Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model called Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus model named USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus variant is Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is the Model ID cordless vacuum",
      "Example X100 20 plus Bluetooth LE version 5.0 is the modelName cordless vacuum",
      "Example X100 20 plus model designation is DisplayPort Alt Mode version 2.0 cordless vacuum",
      "Example X100 20 plus model is called Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus model is named USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus model is designated Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model is designated as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus variant is called HDMI eARC version 2.1 cordless vacuum",
      "Example X100 20 plus trim is named DisplayPort Alt Mode version 2.0 cordless vacuum",
      "Example X100 20 plus model is known as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model also known as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model is also known as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model is the Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is known as the model cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is designated as the model cordless vacuum",
      "Example X100 20 plus Bluetooth LE version 5.0 is called the modelName cordless vacuum",
      "Example X100 20 plus USB Type-C version 3.2 is named the variantID cordless vacuum",
      "Example X100 20 plus model is also called Bluetooth LE version 5.0 cordless vacuum",
      "Example X100 20 plus model is identified as USB Type-C version 3.2 cordless vacuum",
      "Example X100 20 plus model is labeled as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model is referred to as HDMI eARC version 2.1 cordless vacuum",
      "Example X100 20 plus model is equal to Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is also called the model cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is identified as the model ID cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is referred to as the trimName cordless vacuum",
      "Example X100 20; the model, also known as Wi-Fi 6E, cordless vacuum",
      "Example X100 20 plus model, is designated as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus model is, also known as Wi-Fi 6E cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E, also known as the model cordless vacuum",
      "Example X100 20 plus Wi-Fi 6E is, also known as the model cordless vacuum",
      "Example X100 20 plus model, also known as 2024 cordless vacuum",
      "Example X100 20 plus 30.0, is designated as the model ID cordless vacuum",
      "Example X100 20 plus model ID is 2024 cordless vacuum",
      "Example X100 20 plus model equals 30.0 cordless vacuum",
      "Example X100 20 plus 2024 is the model ID cordless vacuum",
      "Example X100 20 plus model is called 2024 cordless vacuum",
      "Example X100 20 plus model is named 30.0 cordless vacuum",
      "Example X100 20 plus 2024 is known as the model ID cordless vacuum",
      "Example X100 20 plus 30.0 is designated as the trimName cordless vacuum",
      "Example X100 20 with Bluetooth LE, version 5.0 cordless vacuum",
      "Example X100 20 with Bluetooth Very Low Energy version 5.0 cordless vacuum",
    ]) {
      const relation = modelIdentityRelation("X100 20", observed);
      assert.equal(
        haveConflictingCompoundModelSequences("X100 20", observed),
        true,
        observed,
      );
      assert.deepEqual(
        {
          hasConflict: relation.hasConflict,
          matchesCompleteAlias: relation.matchesCompleteAlias,
        },
        { hasConflict: true, matchesCompleteAlias: false },
        observed,
      );
    }
    assert.equal(
      haveConflictingCompoundModelSequences(
        "X100 A1 / Y200 B2",
        "Example X100 A1 and Y200 B2 cordless vacuum",
      ),
      false,
    );
    assert.equal(
      modelIdentityRelation(
        "Q7 M5",
        "Roborock Q7 M5+ robot vacuum (Upgraded from Q5 Max+)",
      ).matchesCompleteAlias,
      true,
    );
    assert.deepEqual(
      {
        hasTargetEvidenceInObservedText: modelIdentityRelation(
          "X100 20",
          "Example appliance (Upgraded from X100 20)",
        ).hasTargetEvidenceInObservedText,
        matchesCompleteAlias: modelIdentityRelation(
          "X100 20",
          "Example appliance (Upgraded from X100 20)",
        ).matchesCompleteAlias,
      },
      {
        hasTargetEvidenceInObservedText: false,
        matchesCompleteAlias: false,
      },
      "historical comparison text cannot establish current product identity",
    );
    for (const [target, exact, sibling] of [
      ["X100 2024", "Example X100 2024 cordless vacuum", "Example X100 2030 cordless vacuum"],
      ["X100 30.0", "Example X100 30.0 cordless vacuum", "Example X100 31.0 cordless vacuum"],
    ]) {
      assert.equal(
        modelIdentityRelation(target, exact).matchesCompleteAlias,
        true,
        exact,
      );
      assert.deepEqual(
        {
          hasConflict: modelIdentityRelation(target, sibling).hasConflict,
          matchesCompleteAlias:
            modelIdentityRelation(target, sibling).matchesCompleteAlias,
        },
        { hasConflict: true, matchesCompleteAlias: false },
        sibling,
      );
    }
    for (const [target, observed] of [
      ["X100 2024", "Example X100 model number 2024 cordless vacuum"],
      ["X100 30.0", "Example X100 version number 30.0 cordless vacuum"],
      ["X100 2024", "Example X100 modelID 2024 cordless vacuum"],
      ["X100 30.0", "Example X100 versionNumber 30.0 cordless vacuum"],
    ]) {
      assert.equal(
        modelIdentityRelation(target, observed).matchesCompleteAlias,
        true,
        observed,
      );
    }
  });

  it("rejects a descriptive sibling even when the exact trim is absent", () => {
    assert.equal(
      haveConflictingDescriptiveModelSequences(
        "Q50 Max",
        "Example Q50 Pro robot vacuum",
      ),
      true,
    );
    assert.equal(
      haveConflictingDescriptiveModelSequences(
        "Q50 Max",
        "Example Q50 Max robot vacuum",
      ),
      false,
    );
  });

  it("parses equivalent compound formatting without absorbing split measurements", () => {
    for (const value of ["X100 A1", "X100 (A1)", "X100-A1", "X100/A1"]) {
      assert.deepEqual([...compoundModelSequences(value)], ["x100:a1"], value);
    }

    for (const value of [
      "X100 A1 4-Burner",
      "X100 A1 4 Burner",
      "X100 A1 5Ah",
      "X100 A1 5 Ah",
      "X100 A1 12-Cup",
      "X100 A1 12 Cup",
      "X100 A1 3000RPM",
      "X100 A1 3000 RPM",
    ]) {
      assert.deepEqual([...compoundModelSequences(value)], ["x100:a1"], value);
    }

    for (const value of [
      "Example X100 20 4-Burner appliance",
      "Example X100 20 4 Burner appliance",
      "Example X100 20 5Ah appliance",
      "Example X100 20 5 Ah appliance",
      "Example X100 20 5.5 HP appliance",
      "Example X100 20 $199.99 appliance",
      "Example X100 20 2024 edition appliance",
      "Example X100 20 with Bluetooth version number 5.0 appliance",
      "Example X100 20 with WiFi version 6.0 appliance",
      "Example X100 20 with Bluetooth LE version 5.0 appliance",
      "Example X100 20 with Bluetooth Low Energy version 5.0 appliance",
      "Example X100 20 with USB Type-C version 3.2 appliance",
      "Example X100 20 with HDMI eARC version 2.1 appliance",
      "Example X100 20 with Wi-Fi 6E version 2.0 appliance",
      "Example X100 20 with DisplayPort Alt Mode version 2.0 appliance",
      "Example X100 20 with Wi-Fi 6E appliance",
      "Example X100 20 with Wi-Fi 7 appliance",
      "Example Model ID is X100 20 appliance",
      "Example X100 20 is the Model ID appliance",
      "Example X100 model designation equals 20 appliance",
      "Example model is also known as X100 20 appliance",
      "Example X100 20 is identified as the model appliance",
      "Example the model, also known as X100 20, appliance",
      "Example X100 20 supports Bluetooth LE version 5.0 appliance",
      "Example X100 20 includes USB Type-C version 3.2 appliance",
      "Example X100 20 features HDMI eARC version 2.1 appliance",
      "Example X100 20; model, supports Wi-Fi 6E appliance",
      "Example X100 20; model, includes USB Type-C version 3.2 appliance",
      "Example X100 20; model, features HDMI eARC version 2.1 appliance",
      "Example X100 20 appliance (Upgraded from X100 10)",
    ]) {
      assert.equal(
        modelIdentityRelation("X100 20", value).matchesCompleteAlias,
        true,
        value,
      );
    }

    assert.deepEqual(
      [...compoundModelSequences("Brand 1 M100 Cordless Vacuum")],
      [],
      "a numeric brand qualifier must not fuse to the following model",
    );
  });

  it("keeps products that differ only by a single-digit size as DISTINCT", () => {
    // Regression: these used to collapse to the same canonical id (the single-digit
    // size was dropped), merging different vacs and shrinking the result list.
    assert.equal(
      areSameCanonicalProduct(
        product("Stanley 5 Gallon Wet/Dry Vacuum"),
        product("Stanley 6 Gallon Wet/Dry Vacuum"),
      ),
      false,
    );
    assert.equal(
      areSameCanonicalProduct(
        product("Craftsman 9 Gallon Wet/Dry Vac"),
        product("Craftsman 16 Gallon Wet/Dry Vac"),
      ),
      false,
    );
  });

  it("treats a named model and its product-family listing as the same product", () => {
    assert.equal(
      areSameCanonicalProduct(
        product(
          "De'Longhi Stilosa Espresso Machine (EC260BK)",
          "https://www.target.com/p/stilosa-espresso-machine-by-delonghi-ec260bk/-/A-80182504",
        ),
        product(
          "De'Longhi Stilosa Espresso Machine",
          "https://www.wholelattelove.com/products/delonghi-stilosa-espresso-machine",
        ),
      ),
      true,
    );
  });

  it("does not merge different explicit model numbers", () => {
    assert.equal(
      areSameExactModelProduct(
        product("Acme Comfort Plus Sleeper Sofa SS2000"),
        product("Acme Comfort Plus Sleeper Sofa SS3000"),
      ),
      false,
    );
  });

  it("treats retailer-specific M27Q titles as the same exact model", () => {
    assert.equal(
      areSameExactModelProduct(
        product(
          "Gigabyte M27Q Gaming Monitor (Rev. 1.0)",
          "https://www.gigabyte.com/Monitor/M27Q-rev-10",
        ),
        product(
          'Gigabyte M27Q 27" QHD FreeSync Premium IPS Gaming Monitor',
          "https://www.bestbuy.com/site/gigabyte-m27q/12345.p",
        ),
      ),
      true,
    );
  });

  it("keeps related but explicitly different model variants distinct", () => {
    assert.equal(
      areSameExactModelProduct(
        product("Gigabyte M27Q Gaming Monitor"),
        product("Gigabyte M27Q2 QD Gaming Monitor"),
      ),
      false,
    );
    assert.equal(
      areSameExactModelProduct(
        product("Gigabyte M27Q Gaming Monitor"),
        product("Gigabyte M27Q-P Gaming Monitor"),
      ),
      false,
    );
  });

  it("does not treat shared specification tokens as exact model identity", () => {
    assert.equal(
      areSameExactModelProduct(
        product("Acme AX3000 WiFi6 Router"),
        product("Acme RE7000 WiFi6 Range Extender"),
      ),
      false,
    );
  });

  it("treats the same shoe model from different retailers as one product", () => {
    assert.equal(
      areSameCanonicalProduct(
        product(
          "Nike Reactx Infinity Run 4 - Men's - Champs Sports",
          "https://www.champssports.com/product/model/nike-reactx-infinity-run-4-mens/413789.html",
        ),
        product(
          "Nike Reactx Infinity Run 4 - Men's | Foot Locker",
          "https://www.footlocker.com/product/model/nike-reactx-infinity-run-4-mens/413789.html",
        ),
      ),
      true,
    );
  });
});
