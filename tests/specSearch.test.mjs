import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";
import { generateSearchQueries } from "../lib/searchQueryExpansion.ts";

const request = {
  query: "cordless leaf blower",
  priorities: "at least 600 cfm, battery included",
};

function joinedQueries() {
  return generateSearchQueries({
    ...request,
    extractedRequirements: extractStructuredRequirements(request),
  })
    .join("\n")
    .toLowerCase();
}

function withSpecSearch(run) {
  const previous = process.env.REVIEW_RADAR_SPEC_SEARCH;

  process.env.REVIEW_RADAR_SPEC_SEARCH = "on";

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.REVIEW_RADAR_SPEC_SEARCH;
    } else {
      process.env.REVIEW_RADAR_SPEC_SEARCH = previous;
    }
  }
}

describe("spec-aware search queries", () => {
  it("does not inject spec phrases by default", () => {
    const joined = joinedQueries();

    assert.doesNotMatch(joined, /600\s*cfm/);
    assert.doesNotMatch(joined, /battery included/);
    // The category itself is still present.
    assert.match(joined, /leaf blower/);
  });

  it("injects numeric and boolean spec phrases when enabled", () => {
    const joined = withSpecSearch(joinedQueries);

    assert.match(joined, /600\s*cfm/);
    assert.match(joined, /battery included/);
    assert.match(joined, /leaf blower/);
  });
});
