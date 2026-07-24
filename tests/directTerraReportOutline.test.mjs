import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractDirectTerraPicks,
  headingSlug,
  reactChildrenToText,
} from "../lib/directTerraReportOutline.ts";

const report = [
  "# Shop Vac Buying Guide",
  "Intro prose about criteria.",
  "## #1 Best Match — RIDGID HD1200, 12-Gallon NXT Wet/Dry Vac",
  "Why it wins.",
  "### Sources",
  "- [Home Depot](https://homedepot.com/p/1)",
  "## #2 Best Match — DEWALT DXV12P-QT Quiet Vac",
  "Quiet.",
  "## Close matches",
  "- Something",
  "## What to avoid",
].join("\n");

describe("direct Terra report outline", () => {
  it("extracts ranked picks in order with names and anchor ids", () => {
    const picks = extractDirectTerraPicks(report);
    assert.equal(picks.length, 2);
    assert.deepEqual(
      picks.map((p) => p.rank),
      [1, 2],
    );
    assert.match(picks[0].name, /RIDGID HD1200/);
    assert.match(picks[1].name, /DEWALT DXV12P-QT/);
    // Anchor id is the slug of the whole heading content, so it matches the id
    // the report renderer stamps on the same heading.
    assert.equal(
      picks[0].anchorId,
      headingSlug("#1 Best Match — RIDGID HD1200, 12-Gallon NXT Wet/Dry Vac"),
    );
    assert.ok(picks[0].anchorId.length > 0);
  });

  it("ignores non-ranked headings like Close matches and What to avoid", () => {
    const picks = extractDirectTerraPicks(report);
    assert.ok(!picks.some((p) => /avoid|close/i.test(p.name)));
  });

  it("dedupes repeated ranks and tolerates empty input", () => {
    const dup = "## #1 Best Match — A\n## #1 Best Match — A again";
    assert.equal(extractDirectTerraPicks(dup).length, 1);
    assert.deepEqual(extractDirectTerraPicks(""), []);
    assert.deepEqual(extractDirectTerraPicks("no headings here"), []);
  });

  it("accepts the required bare rank labels plus H1 through H4 headings", () => {
    const variants = [
      "#1 Best Match — Bare Contract Label",
      "# #2 Best Match — H1 Product",
      "## #3 Best Match — H2 Product",
      "### #4 Best Match — H3 Product",
      "#### #5 Best Match — H4 Product",
    ].join("\n");

    assert.deepEqual(
      extractDirectTerraPicks(variants).map(({ rank, name }) => ({ rank, name })),
      [
        { rank: 1, name: "Bare Contract Label" },
        { rank: 2, name: "H1 Product" },
        { rank: 3, name: "H2 Product" },
        { rank: 4, name: "H3 Product" },
        { rank: 5, name: "H4 Product" },
      ],
    );
  });

  it("produces url-safe, stable slugs", () => {
    assert.equal(headingSlug("#1 Best Match — RIDGID HD1200"), "1-best-match-ridgid-hd1200");
    assert.equal(headingSlug("  Weird   Spacing!! "), "weird-spacing");
    assert.equal(headingSlug(""), "");
    // Deterministic.
    assert.equal(headingSlug("Café Crème 2.0"), headingSlug("Café Crème 2.0"));
  });

  it("extracts text from react-style children so renderer and parser agree", () => {
    assert.equal(reactChildrenToText("plain"), "plain");
    assert.equal(reactChildrenToText(["#1 ", "Best ", "Match"]), "#1 Best Match");
    assert.equal(
      reactChildrenToText([{ props: { children: "nested" } }, " tail"]),
      "nested tail",
    );
    assert.equal(reactChildrenToText(null), "");
  });
});
