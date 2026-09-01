import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSelectionPlan,
  selectionPlannerTestExports,
} from "../lib/selectionPlanner.ts";

const input = {
  query: "robot vacuum",
  budget: "$300",
  priorities: "must be self-emptying",
};

describe("selection planner", () => {
  it("uses deterministic shopping queries without an OpenAI client", async () => {
    const result = await buildSelectionPlan({
      client: null,
      input,
      model: "unused",
    });

    assert.equal(result.telemetry.openAiCalls, 0);
    assert.equal(result.telemetry.usedFallback, true);
    assert.equal(result.plan.targets.length, 0);
    assert.ok(result.plan.queries.length >= 1);
    assert.ok(result.plan.queries.every((query) => !/review|citation/i.test(query)));
  });

  it("makes exactly one compact structured-output call", async () => {
    const calls = [];
    const client = {
      responses: {
        async create(options, requestOptions) {
          calls.push({ options, requestOptions });
          return {
            output_text: JSON.stringify({
              mainstreamProducts: [
                {
                  aliases: ["Nova S1 Pro"],
                  brand: "iHome",
                  model: "Nova S1 Pro",
                },
              ],
              searchQueries: [
                "self emptying robot vacuum under $300",
                "iHome Nova S1 Pro robot vacuum",
              ],
            }),
          };
        },
      },
    };
    const result = await buildSelectionPlan({
      client,
      input,
      model: "gpt-test",
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.model, "gpt-test");
    assert.equal(calls[0].options.max_output_tokens, 1_000);
    assert.equal(calls[0].options.text.format.strict, true);
    assert.equal(result.telemetry.openAiCalls, 1);
    assert.equal(result.telemetry.usedFallback, false);
    assert.deepEqual(result.plan.targets[0], {
      aliases: ["Nova S1 Pro"],
      brand: "iHome",
      model: "Nova S1 Pro",
    });
    assert.match(result.plan.queries[1], /self-emptying|self emptying/i);
    assert.ok(
      result.plan.queries
        .slice(0, 3)
        .every((query) => !/iHome|Nova S1 Pro/i.test(query)),
    );
  });

  it("allows a brand-specific search only when the shopper requested that brand", () => {
    const value = {
      mainstreamProducts: [
        { aliases: [], brand: "iRobot", model: "Roomba i3+ EVO" },
      ],
      searchQueries: ["iRobot Roomba i3+ EVO self emptying robot vacuum"],
    };
    const result = selectionPlannerTestExports.normalizePlan(
      { query: "iRobot robot vacuum", priorities: "self-emptying" },
      value,
    );

    assert.ok(result.queries.some((query) => /iRobot Roomba i3\+ EVO/i.test(query)));
  });

  it("falls back safely on malformed model output", async () => {
    const result = await buildSelectionPlan({
      client: {
        responses: {
          async create() {
            return { output_text: '{"searchQueries":"not-an-array"}' };
          },
        },
      },
      input,
      model: "gpt-test",
    });

    assert.equal(result.telemetry.openAiCalls, 1);
    assert.equal(result.telemetry.usedFallback, true);
    assert.ok(result.plan.queries.some((query) => /robot vacuum/i.test(query)));
  });

  it("keeps the planner prompt free of report-generation instructions", () => {
    const prompt = selectionPlannerTestExports.systemPrompt;

    assert.match(prompt, /do not generate evaluation prose/i);
    assert.doesNotMatch(prompt, /write (?:a )?report|pros and cons|ranked report/i);
    assert.ok(prompt.length < 1_000);
  });
});
