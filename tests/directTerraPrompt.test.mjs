import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDirectTerraPrompt,
  buildDirectTerraResearchRequest,
  DIRECT_TERRA_PROMPT_VERSION,
} from "../lib/directTerraPrompt.ts";

const shopper = {
  query: "cordless vacuum",
  budget: "under $500",
  priorities: "Good for dog hair and not too heavy",
  avoid: "corded models",
  selectedFeatures: [
    {
      id: "battery-powered",
      name: "Battery powered",
      type: "boolean",
      operator: "required",
      value: true,
      required: true,
      source: "smart_features",
    },
  ],
};

describe("direct Terra V2 prompt", () => {
  it("preserves every shopper field in a delimited data block", () => {
    const prompt = buildDirectTerraPrompt(shopper);

    assert.equal(prompt.version, DIRECT_TERRA_PROMPT_VERSION);
    assert.match(prompt.instructions, /decide which searches are necessary/i);
    assert.match(prompt.instructions, /unverified by ReviewRadar/i);
    assert.match(prompt.instructions, /report_markdown/);
    assert.match(prompt.input, /SHOPPER_REQUEST_JSON_START/);
    assert.match(prompt.input, /cordless vacuum/);
    assert.match(prompt.input, /under \$500/);
    assert.match(prompt.input, /Good for dog hair and not too heavy/);
    assert.match(prompt.input, /corded models/);
    assert.match(prompt.input, /Battery powered/);
  });

  it("builds one Terra/high hosted-search request with a one-field schema", () => {
    const request = buildDirectTerraResearchRequest(shopper);

    assert.equal(request.model, "gpt-5.6-terra");
    assert.deepEqual(request.reasoning, { effort: "high" });
    assert.deepEqual(request.tools, [{ type: "web_search" }]);
    assert.equal(request.tool_choice, "required");
    assert.equal(request.background, true);
    assert.equal(request.max_tool_calls, 20);
    assert.deepEqual(request.include, ["web_search_call.action.sources"]);
    assert.deepEqual(
      Object.keys(request.text.format.schema.properties),
      ["report_markdown"],
    );
    assert.deepEqual(request.text.format.schema.required, ["report_markdown"]);
  });
});
