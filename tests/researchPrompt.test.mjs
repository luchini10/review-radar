import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildResearchPrompt } from "../lib/researchPrompt.ts";

describe("research prompt", () => {
  it("includes selected features as ranking preferences", () => {
    const prompt = buildResearchPrompt({
      query: "laptop",
      selectedFeatures: ["RAM", "Battery life", "Weight"],
    });

    assert.match(prompt, /Selected product features: RAM, Battery life, Weight/);
    assert.match(
      prompt,
      /Use the selected features as strong ranking preferences/,
    );
  });

  it("uses a clear empty selected-features fallback", () => {
    const prompt = buildResearchPrompt({
      query: "couch",
    });

    assert.match(prompt, /Selected product features: None selected/);
  });
});
