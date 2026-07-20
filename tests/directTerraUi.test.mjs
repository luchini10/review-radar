import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { isDirectTerraCitationAllowed } from "../lib/directTerraApiContract.ts";

describe("direct Terra V2 display boundary", () => {
  it("renders the one report field, blocks raw HTML, and labels commerce unverified", () => {
    const source = fs.readFileSync(
      "components/DirectTerraReport.tsx",
      "utf8",
    );

    assert.match(source, /result\.reportMarkdown/);
    assert.match(source, /skipHtml/);
    assert.match(source, /disallowedElements=\{\["img"\]\}/);
    assert.match(source, /Purchase details are unverified/);
    assert.match(source, /isDirectTerraCitationAllowed\(result\.citationUrls, href\)/);
    assert.match(source, /result\.disabledCitationCount \?\? 0/);
    assert.match(source, /Source link unavailable/);
    assert.match(source, /source link[^]*disabled/i);
    assert.match(source, /without reranking or rebuilding them/);
    assert.match(source, /Estimated market prices/);
    assert.match(source, /result\.priceEstimates\.map/);
    assert.match(source, /at least two distinct source/);
    assert.match(source, /estimates rather than[^]*checkout quotes/i);
    assert.equal(source.includes("cards.map"), false);
  });

  it("allows only an exact response-owned citation destination", () => {
    const allowed = ["https://example.com/model-a?variant=blue"];

    assert.equal(isDirectTerraCitationAllowed(allowed, allowed[0]), true);
    assert.equal(
      isDirectTerraCitationAllowed(
        allowed,
        "https://example.com/model-a?variant=red",
      ),
      false,
    );
    assert.equal(isDirectTerraCitationAllowed(allowed, undefined), false);
  });
});
