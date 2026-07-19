import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

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
    assert.match(source, /without reranking or rebuilding them/);
    assert.equal(source.includes("cards.map"), false);
  });
});
