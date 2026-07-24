import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDirectTerraPrompt,
  buildDirectTerraResearchRequest,
  DIRECT_TERRA_COMPARISON_MODEL,
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

describe("direct Terra V3 prompt", () => {
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
    assert.match(prompt.input, /smart_feature:battery-powered/);
    assert.match(prompt.input, /market_us/);
  });

  it("builds one Terra/high hosted-search request with a dynamic candidate slate", () => {
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
      ["report_markdown", "candidate_slate", "price_observations"],
    );
    assert.deepEqual(request.text.format.schema.required, [
      "report_markdown",
      "candidate_slate",
      "price_observations",
    ]);
    assert.match(request.instructions, /estimated market price/i);
    assert.match(request.instructions, /two distinct source hosts/i);
    assert.match(request.instructions, /new-condition standalone product/i);
    assert.match(request.instructions, /broad slate of 8 to 15/i);
    assert.match(request.instructions, /rank only products present/i);
    assert.deepEqual(
      request.text.format.schema.properties.candidate_slate.items.properties
        .requirement_verdicts.items.properties.requirement_id.enum,
      [
        "market_us",
        "budget",
        "important_details",
        "smart_feature:battery-powered",
        "dealbreakers",
      ],
    );
  });

  it("allows an explicit Sol comparison without changing the Terra default", () => {
    const comparison = buildDirectTerraResearchRequest(shopper, {
      model: DIRECT_TERRA_COMPARISON_MODEL,
    });
    const defaultRequest = buildDirectTerraResearchRequest(shopper);

    assert.equal(comparison.model, "gpt-5.6-sol");
    assert.equal(defaultRequest.model, "gpt-5.6-terra");
    assert.deepEqual(comparison.reasoning, defaultRequest.reasoning);
    assert.deepEqual(comparison.tools, defaultRequest.tools);
    assert.deepEqual(comparison.text, defaultRequest.text);
    assert.equal(comparison.instructions, defaultRequest.instructions);
    assert.equal(comparison.input, defaultRequest.input);
  });
});
