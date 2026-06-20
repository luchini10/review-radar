import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { generateSearchQueries } from "../lib/searchQueryExpansion.ts";

describe("search query expansion", () => {
  it("generates broad and strict query variations for a constrained sleeper search", () => {
    const queries = generateSearchQueries({
      budget: "$1500",
      priorities: "Less than 64 inches",
      query: "pull out couch",
      selectedFeatures: ["Color: Black", "Size: Full"],
    });
    const joined = queries.join("\n").toLowerCase();

    assert.ok(queries.length >= 8);
    assert.ok(queries.length <= 18);
    assert.match(joined, /pull out couch/);
    assert.match(joined, /sleeper sofa/);
    assert.match(joined, /sofa bed/);
    assert.match(joined, /loveseat sleeper|pull out loveseat/);
    assert.match(joined, /under 64 inches/);
    assert.match(joined, /black/);
    assert.match(joined, /site:wayfair\.com|site:ashleyfurniture\.com/);
    assert.match(joined, /youtube review/i);
  });

  it("includes feature and budget language for monitor searches", () => {
    const queries = generateSearchQueries({
      budget: "under $250",
      query: "27 inch 4K monitor",
      selectedFeatures: ["USB-C"],
    });
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /27 inch 4k monitor/);
    assert.match(joined, /usb-c/);
    assert.match(joined, /under \$250/);
    assert.match(joined, /premium best quality/);
    assert.match(joined, /under \$450/);
    assert.match(joined, /site:rtings\.com|site:wirecutter\.com/);
  });

  it("expands broad shoe searches with brand and footwear aliases", () => {
    const request = {
      budget: "$300",
      priorities: "Must be Nike only",
      query: "basketball shoes",
    };
    const queries = generateSearchQueries({
      ...request,
      extractedRequirements: extractStructuredRequirements(request),
    });
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /nike basketball shoes/);
    assert.match(joined, /basketball sneakers|basketball footwear/);
    assert.match(joined, /site:nike\.com|nike\.com/);
    assert.match(joined, /under \$300/);
  });

  it("generates shopping-intent fallback variants for realistic appliance searches", () => {
    const queries = generateSearchQueries({
      extractedRequirements: undefined,
      query: "red refrigerator under $1000",
    });
    const joined = queries.join("\n").toLowerCase();

    assert.ok(queries.length >= 8);
    assert.match(joined, /red refrigerator/);
    assert.match(joined, /red fridge|fridge red/);
    assert.match(joined, /compact refrigerator|full size refrigerator|retro refrigerator/);
    assert.match(joined, /sale/);
    assert.match(joined, /under \$1000/);
    assert.match(joined, /site:ajmadison\.com|site:bestbuy\.com|site:homedepot\.com/);
    assert.doesNotMatch(joined, /red refrigerator under \$1000 red/);
    assert.doesNotMatch(joined, /under \$1000 under \$1000/);
  });

  it("generates materially different queries for desk, microwave, and cordless stick vacuum searches", () => {
    const deskQueries = generateSearchQueries({
      query: "white desk with drawers under $300",
    }).join("\n").toLowerCase();
    const microwaveQueries = generateSearchQueries({
      query: "black microwave under $200",
    }).join("\n").toLowerCase();
    const vacuumQueries = generateSearchQueries({
      query: "cordless stick vacuum under $250",
    }).join("\n").toLowerCase();

    assert.match(deskQueries, /desk with drawers|computer desk|writing desk/);
    assert.match(deskQueries, /white/);
    assert.match(deskQueries, /under \$300/);
    assert.match(microwaveQueries, /microwave oven|countertop microwave|compact microwave/);
    assert.match(microwaveQueries, /black/);
    assert.match(microwaveQueries, /under \$200/);
    assert.match(vacuumQueries, /cordless stick vacuum|stick vacuum|cordless vacuum/);
    assert.match(vacuumQueries, /under \$250/);
  });

  it("uses shopping-friendly gas range wording for oven searches", () => {
    const queries = generateSearchQueries({
      budget: "under $2000",
      query: "oven",
      selectedFeatures: [
        {
          id: "fuel-type-equals-gas",
          name: "Fuel type",
          type: "enum",
          operator: "equals",
          value: "Gas",
          required: true,
          source: "smart_features",
        },
        {
          id: "finish-equals-stainless-steel",
          name: "Finish",
          type: "enum",
          operator: "equals",
          value: "Stainless steel",
          required: true,
          source: "smart_features",
        },
      ],
    });
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /gas range/);
    assert.match(joined, /stainless steel gas range/);
    assert.match(joined, /freestanding gas range/);
    assert.match(joined, /under \$2000/);
    assert.doesNotMatch(joined, /fuel type gas/);
  });

  it("keeps toaster oven searches focused on countertop/toaster oven wording", () => {
    const queries = generateSearchQueries({
      budget: "under $300",
      query: "toaster oven",
    });
    const joined = queries.join("\n").toLowerCase();

    assert.match(joined, /toaster oven/);
    assert.match(joined, /countertop toaster oven|countertop convection oven|air fryer toaster oven/);
    assert.doesNotMatch(joined, /\bgas range\b|\bfreestanding gas range\b|\bgas stove\b/);
  });
});
