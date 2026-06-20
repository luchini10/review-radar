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
      /selected product features are mandatory requirements/,
    );
  });

  it("uses a clear empty selected-features fallback", () => {
    const prompt = buildResearchPrompt({
      query: "couch",
    });

    assert.match(prompt, /Selected product features: None selected/);
  });

  it("asks for broad candidates and keeps hard requirements strict", () => {
    const prompt = buildResearchPrompt({
      budget: "under $500",
      query: "office chair",
    });

    assert.match(prompt, /Close-match discovery budget range: \$900/);
    assert.match(
      prompt,
      /Return candidate_products as a broad pool, not as final ranked recommendations/,
    );
    assert.match(prompt, /Budget is a firm filter for Best Match candidates/);
    assert.match(prompt, /Do not assign final rank numbers/);
    assert.match(prompt, /return an empty common_complaints array/);
  });

  it("asks for official product URLs before retailer fallbacks", () => {
    const prompt = buildResearchPrompt({
      query: "tablet",
    });

    assert.match(prompt, /exact official manufacturer product webpage/);
    assert.match(prompt, /Do not invent official product URLs/);
  });

  it("includes AI discovery strategy and gap-check context", () => {
    const prompt = buildResearchPrompt({
      discoveryGapCheck: {
        followUpQueries: ["Nike LeBron basketball shoes under $300"],
        missingExpectedProducts: ["Nike LeBron"],
        notes: [],
        suspiciousCandidateNames: ["Unknown Outlet Shoe"],
      },
      discoveryStrategy: {
        avoidCandidatePatterns: ["used shoes"],
        buyingRubric: {
          category: "basketball shoes",
          commonTradeoffs: ["cushioning versus court feel"],
          mustVerifyFacts: ["Nike brand", "basketball shoe model"],
          qualitySignals: ["traction", "cushioning"],
          redFlags: ["poor grip"],
          reviewSignals: ["owner reviews mention court traction"],
          searchQueries: ["Nike basketball shoes traction cushioning reviews"],
        },
        discoveryQueries: ["best Nike basketball shoes under $300"],
        expectedProducts: [
          {
            aliases: ["GT Cut Academy"],
            brand: "Nike",
            priority: "high",
            productLine: "G.T. Cut Academy",
            whyExpected: "Mainstream Nike basketball shoe line.",
          },
        ],
        searchIntent: "Find mainstream Nike basketball shoes under budget.",
        verificationFacts: ["current price", "exact product page"],
      },
      query: "basketball shoes",
    });

    assert.match(prompt, /AI discovery strategy before Serper verification/);
    assert.match(prompt, /Expected mainstream products or lines: Nike G\.T\. Cut Academy/);
    assert.match(prompt, /Gap check missing expected products: Nike LeBron/);
    assert.match(prompt, /Serper follow-up searches requested/);
  });
});
