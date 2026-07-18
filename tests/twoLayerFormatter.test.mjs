import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTwoLayerMasterPromptAnswer } from "../lib/twoLayerFormatter.ts";
import { buildTwoLayerProductCards } from "../lib/twoLayerRecommendation.ts";

const sharkUrl = "https://www.example.com/products/shark-az4002";
const sharkTestUrl = "https://www.example.org/tests/shark-az4002";
const dysonUrl = "https://www.example.com/products/dyson-gen5detect";
const dysonOwnerUrl = "https://www.example.org/owners/dyson-purple-listing";

const rawResearchText = `
# #1 Best Match — Shark POWERDETECT Upright, model AZ4002

**Recommendation status:** **Best Match**

### Why it ranks #1
The Shark AZ4002 is the strongest overall value for mixed floors. ([example.com](${sharkUrl}))

### Current price
- **Verified price:** **$399.99**
- **Retailer:** Example Store. ([example.com](${sharkUrl}))

### Overall assessment
Best for homes with pets and mixed flooring. The main tradeoff is its weight. ([example.org](${sharkTestUrl}))

### Key specifications
- **Type:** Corded bagless upright
- **Weight:** 17 lb. ([example.com](${sharkUrl}))

### Performance and quality signals
- Strong pickup on carpet in professional testing. ([example.org](${sharkTestUrl}))

### Owner-review analysis
- Owners commonly praise its pet-hair pickup. ([example.com](${sharkUrl}))

### Pros
- Strong carpet pickup
- Useful powered lift-away design

### Cons
- Heavy for stairs

### Sources
- **Official product:** Example Store product listing. ([example.com](${sharkUrl}))
- **Professional test:** Example Lab. ([example.org](${sharkTestUrl}))

---

# #2 Best Match — Dyson Gen5detect Absolute, Prussian Blue/Copper

**Recommendation status:** **Close Match — best for cordless convenience**

### Why it ranks #2
The Dyson is a convenient premium cordless option. ([example.com](${dysonUrl}))

### Current price
- **Verified price:** **$1,049.99**. ([example.com](${dysonUrl}))

### Overall assessment
Best for frequent quick cleaning. Its biggest drawback is limited runtime under high power. ([example.com](${dysonUrl}))

### Performance and quality signals
- Professional tests report strong hard-floor pickup. ([example.com](${dysonUrl}))

### Owner-review analysis
- Purple-listing owners praise maneuverability. ([example.org](${dysonOwnerUrl}))

### Pros
- Convenient cordless cleaning

### Cons
- Expensive for a cordless vacuum

### Sources
- **Official product page:** Dyson product page. ([example.com](${dysonUrl}))
- **Owner signal:** Purple retailer listing. ([example.org](${dysonOwnerUrl}))

## Comparison table
`.trim();

function responseSources() {
  return [
    { url: sharkUrl, title: "Shark AZ4002 product" },
    { url: sharkTestUrl, title: "Shark AZ4002 test" },
    { url: dysonUrl, title: "Dyson Gen5detect product" },
    { url: dysonOwnerUrl, title: "Dyson owner reviews" },
  ];
}

function format(overrides = {}) {
  return formatTwoLayerMasterPromptAnswer({
    rawResearchText,
    responseSources: responseSources(),
    ...overrides,
  });
}

describe("OAI-T2 deterministic master-prompt formatter", () => {
  it("extracts Terra's products and relative order without another model call", () => {
    const result = format();
    assert.deepEqual(
      result.formattedOutput.recommendations.map((item) => ({
        rank: item.rank,
        name: item.identity.product_name,
        status: item.recommendation_status,
      })),
      [
        {
          rank: 1,
          name: "Shark POWERDETECT Upright",
          status: "Best Match",
        },
        {
          rank: 2,
          name: "Dyson Gen5detect Absolute",
          status: "Close Match",
        },
      ],
    );
  });

  it("drops the natural answer's transactional section from structured research", () => {
    const result = format();
    const serialized = JSON.stringify(result.formattedOutput);
    assert.equal(serialized.includes("399.99"), false);
    assert.equal(serialized.includes("1,049.99"), false);
    assert.equal(result.diagnostics.ignoredTransactionalSectionCount, 2);

    const cards = buildTwoLayerProductCards({
      rawResearchText,
      responseSourceUrls: responseSources().map((source) => source.url),
      formattedOutput: result.formattedOutput,
      receiptInputs: [],
    });
    assert.ok(cards.cards.every((card) => card.commerce.state === "not_verified"));
    assert.ok(cards.cards.every((card) => card.commerce.label === "Check current price"));
  });

  it("copies identity, assessment, pros, cons, and claims verbatim", () => {
    const result = format();
    for (const recommendation of result.formattedOutput.recommendations) {
      const values = [
        recommendation.identity.brand,
        recommendation.identity.product_name,
        recommendation.identity.model,
        recommendation.identity.variant,
        recommendation.assessment.why,
        recommendation.assessment.best_for,
        recommendation.assessment.main_tradeoff,
        ...recommendation.pros.map((item) => item.text),
        ...recommendation.cons.map((item) => item.text),
        ...recommendation.claims.map((claim) => claim.text),
      ].filter((value) => value !== null);
      assert.ok(values.every((value) => rawResearchText.includes(value)));
    }
  });

  it("retains citations only when the URL came from the response registry", () => {
    const result = format();
    assert.equal(result.formattedOutput.sources.length, 4);
    assert.ok(
      result.formattedOutput.sources.every((source) =>
        responseSources().some((registered) => registered.url === source.url),
      ),
    );

    assert.throws(
      () =>
        formatTwoLayerMasterPromptAnswer({
          rawResearchText,
          responseSources: responseSources().slice(1),
        }),
      /source absent from response registry/,
    );
  });

  it("fails closed instead of inventing missing source metadata", () => {
    const sources = responseSources();
    sources[0] = { ...sources[0], title: null };
    assert.throws(
      () =>
        formatTwoLayerMasterPromptAnswer({
          rawResearchText,
          responseSources: sources,
        }),
      /source title absent from response registry/,
    );
  });

  it("does not promote specifications, professional tests, or owner prose to verified", () => {
    const result = format();
    const claims = result.formattedOutput.recommendations.flatMap(
      (recommendation) => recommendation.claims,
    );
    assert.ok(claims.length > 0);
    assert.ok(claims.every((claim) => claim.evidence_scope === "unresolved"));
  });

  it("requires a citation on the individual claim before calling it source-reported", () => {
    const result = format();
    const shark = result.formattedOutput.recommendations[0];
    const uncited = shark.claims.find((claim) => claim.text.includes("**Type:**"));
    const cited = shark.claims.find((claim) => claim.text.includes("**Weight:**"));

    assert.deepEqual(uncited.source_ids, []);
    assert.deepEqual(cited.source_ids, ["s1"]);

    const cards = buildTwoLayerProductCards({
      rawResearchText,
      responseSourceUrls: responseSources().map((source) => source.url),
      formattedOutput: result.formattedOutput,
      receiptInputs: [],
    });
    const uncitedCardClaim = cards.cards[0].claims.find((claim) =>
      claim.value.includes("**Type:**"),
    );
    const citedCardClaim = cards.cards[0].claims.find((claim) =>
      claim.value.includes("**Weight:**"),
    );
    assert.equal(uncitedCardClaim.trust, "research_synthesis");
    assert.equal(uncitedCardClaim.label, "AI research synthesis");
    assert.equal(citedCardClaim.trust, "source_reported");
    assert.equal(citedCardClaim.label, "Source-reported");
  });

  it("uses neutral source roles when semantic source type is not established", () => {
    const result = format();
    assert.ok(result.formattedOutput.sources.every((source) => source.role === "other"));
  });

  it("preserves a named variant while leaving its exact identity unverified", () => {
    const result = format();
    const dyson = result.formattedOutput.recommendations[1];
    assert.equal(dyson.identity.variant, "Prussian Blue/Copper");

    const cards = buildTwoLayerProductCards({
      rawResearchText,
      responseSourceUrls: responseSources().map((source) => source.url),
      formattedOutput: result.formattedOutput,
      receiptInputs: [],
    });
    assert.equal(cards.cards[1].identityVerification.state, "not_verified");
  });

  it("fails closed when required master-prompt sections are missing", () => {
    assert.throws(
      () =>
        format({
          rawResearchText: rawResearchText.replace("### Pros", "### Advantages"),
        }),
      /missing section: Pros/,
    );
  });

  it("fails closed on rank gaps instead of silently reordering", () => {
    assert.throws(
      () =>
        format({
          rawResearchText: rawResearchText.replace(
            "# #2 Best Match",
            "# #3 Best Match",
          ),
        }),
      /contiguous product ranks/,
    );
  });
});
