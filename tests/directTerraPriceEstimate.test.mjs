import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateDirectTerraPriceEstimates } from "../lib/directTerraPriceEstimate.ts";

describe("direct Terra ranked price identity", () => {
  it("binds safe observations to a prompt-conforming bare rank label", () => {
    const responseSourceUrls = [
      "https://one.example/products/m415bz",
      "https://two.example/m415bz",
    ];
    const result = calculateDirectTerraPriceEstimates({
      reportMarkdown:
        "#1 Best Match — Monument Grills Mesa M415BZ Propane Gas Grill",
      priceObservations: [
        {
          rank: 1,
          brand: "Monument Grills",
          model: "M415BZ",
          observations: [
            {
              seller: "Store One",
              price_amount: 399,
              currency: "USD",
              condition: "new",
              offer_type: "standalone_product",
              source_url: responseSourceUrls[0],
            },
            {
              seller: "Store Two",
              price_amount: 429,
              currency: "USD",
              condition: "new",
              offer_type: "standalone_product",
              source_url: responseSourceUrls[1],
            },
          ],
        },
      ],
      responseSourceUrls,
    });

    assert.deepEqual(result.estimates, [
      {
        rank: 1,
        brand: "Monument Grills",
        model: "M415BZ",
        currency: "USD",
        low: 399,
        high: 429,
        median: 414,
        sourceCount: 2,
      },
    ]);
    assert.equal(result.rejectedObservationCount, 0);
  });
});
