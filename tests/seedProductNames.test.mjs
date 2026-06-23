import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBestOfSeedQueries,
  extractSeedProductNames,
} from "../lib/search/serper.ts";

describe("buildBestOfSeedQueries (best-of anchoring)", () => {
  it("builds best-of / top-rated / most-popular queries for any category", () => {
    assert.deepEqual(buildBestOfSeedQueries("shop vac", null), [
      "best shop vac",
      "top rated shop vac",
      "most popular shop vac",
    ]);
  });

  it("makes the best-of query budget-aware so it anchors on the best products that fit", () => {
    const queries = buildBestOfSeedQueries("shop vac", 200);
    assert.equal(queries[0], "best shop vac under $200");
    assert.ok(queries.includes("top rated shop vac"));
  });

  it("returns nothing for an empty category", () => {
    assert.deepEqual(buildBestOfSeedQueries("", null), []);
  });
});

describe("extractSeedProductNames", () => {
  it("mines brand + model names from editorial titles and snippets", () => {
    const seeds = extractSeedProductNames([
      {
        title: "The 5 Best Gas Grills of 2024",
        snippet:
          "Our top pick is the Weber Spirit II E-310. The Traeger Pro 575 is the best value.",
      },
    ]);

    assert.ok(seeds.includes("Weber Spirit II E-310"));
    assert.ok(seeds.includes("Traeger Pro 575"));
  });

  it("rejects brand+word and bare-year noise from messy best-of snippets", () => {
    const seeds = extractSeedProductNames([
      { title: "DeWalt Find the best shop vacs", snippet: "Our 2026 Lab tested the top picks." },
    ]);

    assert.ok(!seeds.includes("DeWalt Find"));
    assert.ok(!seeds.some((seed) => /^2026\b/.test(seed)));
  });

  it("rejects the searched category itself as a seed (not a product)", () => {
    const seeds = extractSeedProductNames(
      [{ title: "The Best Gas Grills", snippet: "We tested every Gas Grill on the market." }],
      6,
      "gas grill",
    );

    assert.ok(!seeds.some((seed) => /^gas grills?$/i.test(seed)));
  });

  it("accepts brand-led names with no model number (the coverage fix)", () => {
    const seeds = extractSeedProductNames(
      [
        {
          title: "The best air purifiers",
          snippet: "The Coway Airmega is our top pick; the Levoit Core is the best value.",
          url: "https://www.wirecutter.com/reviews/best-air-purifier/",
        },
      ],
      6,
      "air purifier",
    );

    assert.ok(seeds.includes("Coway Airmega"));
    assert.ok(seeds.includes("Levoit Core"));
  });

  it("excludes source/retailer names from seeds", () => {
    const seeds = extractSeedProductNames(
      [{ title: "Consumer Reports tested these", snippet: "Amazon Prime members save more." }],
      6,
      "air purifier",
    );

    assert.ok(!seeds.some((seed) => /^consumer reports$/i.test(seed)));
    assert.ok(!seeds.some((seed) => /^amazon prime$/i.test(seed)));
  });

  it("rejects source names mid-run and year-led brand mashes", () => {
    const seeds = extractSeedProductNames(
      [
        { title: "Recommendations RTINGS.com", snippet: "2026 Shark Eufy WIRED Dyson Spot Stain picks" },
      ],
      6,
      "robot vacuum",
    );

    assert.ok(!seeds.some((seed) => /rtings/i.test(seed)));
    assert.ok(!seeds.some((seed) => /^2026\b/.test(seed)));
    assert.ok(!seeds.some((seed) => /wired/i.test(seed)));
  });

  it("mines Tier-1 editorial sources before lower-tier ones", () => {
    const seeds = extractSeedProductNames(
      [
        { title: "Random blog", snippet: "Try the Acme Blastoid model.", url: "https://spammyseo.example.com/x" },
        { title: "Wirecutter picks", snippet: "The Coway Airmega leads our test.", url: "https://www.wirecutter.com/x" },
      ],
      1,
      "air purifier",
    );

    assert.deepEqual(seeds, ["Coway Airmega"]);
  });

  it("never emits a bare brand with no model token", () => {
    const seeds = extractSeedProductNames([
      { title: "Why we love Weber grills", snippet: "Weber makes great grills." },
    ]);

    assert.ok(!seeds.includes("Weber"));
  });

  it("ignores sources with no known brand", () => {
    const seeds = extractSeedProductNames([
      { title: "The best budget grills", snippet: "Plenty of great options exist." },
    ]);

    assert.equal(seeds.length, 0);
  });

  it("dedupes repeated picks and respects the seed cap", () => {
    const seeds = extractSeedProductNames(
      [
        { title: "Weber Spirit II E-310 review", snippet: "The Weber Spirit II E-310 is excellent." },
        { title: "Weber Spirit II E-310 vs rivals", snippet: "Again, the Weber Spirit II E-310 wins." },
      ],
      6,
    );

    assert.equal(seeds.filter((seed) => seed === "Weber Spirit II E-310").length, 1);
    assert.ok(seeds.length <= 6);
  });
});
