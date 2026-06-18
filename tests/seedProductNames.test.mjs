import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractSeedProductNames } from "../lib/search/serper.ts";

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

  it("rejects generic category phrases that carry no model number", () => {
    const seeds = extractSeedProductNames([
      { title: "The Best Gas Grills", snippet: "We tested every Gas Grill on the market." },
    ]);

    assert.ok(!seeds.some((seed) => /gas grill/i.test(seed)));
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
