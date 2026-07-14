import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cheapPreFilterRawCandidates,
  diagnoseSerperShoppingResponse,
  mergeProductRecommendations,
  normalizeSerperImageSources,
  normalizeSerperDirectResults,
  normalizeSerperOrganicResults,
  normalizeSerperShoppingResults,
  normalizeSerperVideoSources,
  searchSerperForProducts,
  serperCandidateToRecommendation,
  serperTestExports,
} from "../lib/search/serper.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

function buildProduct(overrides = {}) {
  return {
    recommendation_type: "Best Match",
    name: "Example Black Sleeper Sofa",
    category: "Pull out couch",
    product_page_url: "https://example.com/product",
    product_image_url: "",
    why_recommended: "Test product.",
    pros: ["Test pro."],
    cons: ["Test con."],
    common_complaints: ["Test complaint."],
    estimated_price_range: "$999",
    confidence_score: 80,
    source_consensus: "Mixed",
    price_value_verdict: "Test verdict.",
    best_for: "Test buyer.",
    not_for: ["Test non-buyer."],
    citations: [
      {
        title: "Example",
        url: "https://example.com/product",
        what_it_supports: "Test citation.",
      },
    ],
    ...overrides,
  };
}

describe("Serper product discovery", () => {
  it("maps search types to dedicated Serper vertical endpoints", () => {
    assert.equal(
      serperTestExports.serperEndpointForSearchType("shopping"),
      "https://google.serper.dev/shopping",
    );
    assert.equal(
      serperTestExports.serperEndpointForSearchType("images"),
      "https://google.serper.dev/images",
    );
    assert.equal(
      serperTestExports.serperEndpointForSearchType("videos"),
      "https://google.serper.dev/videos",
    );
    assert.equal(
      serperTestExports.serperEndpointForSearchType("organic"),
      "https://google.serper.dev/search",
    );
    assert.equal(
      serperTestExports.serperEndpointForSearchType("direct-walmart"),
      "https://google.serper.dev/search",
    );
  });

  it("normalizes Serper shopping-style results into raw product candidates", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Example Black Full Sleeper Sofa 63 in. Wide",
            link: "https://shop.example.com/black-full-sleeper-sofa",
            source: "Example Store",
            price: "$899.99",
            imageUrl: "https://shop.example.com/image.jpg",
            rating: 4.4,
            ratingCount: 127,
            snippet: "Black full sleeper sofa with compact 63 inch width.",
          },
        ],
      },
      "black sleeper sofa under 64 inches",
      "pull out couch",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "Example Black Full Sleeper Sofa 63 in. Wide");
    assert.equal(candidates[0].price, 899.99);
    assert.equal(candidates[0].retailer, "Example Store");
    assert.deepEqual(candidates[0].availableColors, ["black"]);
    assert.equal(candidates[0].dimensions.width, 63);
    assert.equal(candidates[0].evidenceSources[0].url, "https://shop.example.com/black-full-sleeper-sofa");
    assert.equal(
      candidates[0].evidenceSources[0].snippetProvenance,
      "source-derived",
    );
  });

  it("distinguishes raw Serper shopping results from eligibility-filtered candidates", () => {
    const rawZero = diagnoseSerperShoppingResponse(
      { shopping: [] },
      "Example X100 vacuum",
      "vacuum",
    );
    const filteredZero = diagnoseSerperShoppingResponse(
      {
        shopping: [
          {
            title: "Vacuums - Example Store",
            link: "https://shop.example.com/vacuums",
            source: "Example Store",
            price: "$99",
          },
        ],
      },
      "Example X100 vacuum",
      "vacuum",
    );

    assert.equal(rawZero.diagnostics.rawShoppingResults, 0);
    assert.equal(rawZero.diagnostics.structurallyNormalizedShoppingResults, 0);
    assert.equal(rawZero.diagnostics.eligibleShoppingCandidates, 0);
    assert.equal(filteredZero.diagnostics.rawShoppingResults, 1);
    assert.equal(
      filteredZero.diagnostics.structurallyNormalizedShoppingResults,
      1,
    );
    assert.equal(filteredZero.diagnostics.eligibleShoppingCandidates, 0);
    assert.equal(filteredZero.diagnostics.returnedCandidates, 0);
    assert.equal(filteredZero.diagnostics.resultSource, "none");
    assert.equal(
      filteredZero.diagnostics.shoppingRejectionReasons
        .product_eligibility_rejected,
      1,
    );
    assert.equal(filteredZero.diagnostics.shoppingRejectionSample.length, 1);
  });

  it("diagnoses Google Shopping product links rejected by the listing-URL gate", () => {
    const result = diagnoseSerperShoppingResponse(
      {
        shopping: [
          {
            title:
              "DEWALT DXV10SB 10 Gal. Stainless Steel Wet/Dry Vacuum with Accessories",
            link: "https://www.google.com/search?q=DEWALT+DXV10SB&udm=28",
            source: "Example Retailer",
            price: "$199",
            imageUrl: "https://example.com/dxv10sb.jpg",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
    );

    assert.equal(result.diagnostics.rawShoppingResults, 1);
    assert.equal(result.diagnostics.structurallyNormalizedShoppingResults, 1);
    assert.equal(result.diagnostics.eligibleShoppingCandidates, 0);
    assert.equal(
      result.diagnostics.shoppingRejectionReasons.search_or_listing_url,
      1,
    );
    assert.equal(
      result.diagnostics.shoppingRejectionSample[0].host,
      "google.com",
    );
  });

  it("allows a specific Google Shopping offer only in evidence normalization mode", () => {
    const response = {
      shopping: [
        {
          title:
            "DEWALT DXV10SB 10 Gal. Stainless Steel Wet/Dry Vacuum with Accessories",
          link:
            "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
          source: "Acme Hardware",
          price: "$199",
          imageUrl: "https://example.com/dxv10sb.jpg",
        },
      ],
    };

    const discoveryCandidates = normalizeSerperShoppingResults(
      response,
      "DEWALT DXV10SB shop vac",
      "shop vac",
    );
    const evidenceCandidates = normalizeSerperShoppingResults(
      response,
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );

    assert.equal(discoveryCandidates.length, 0);
    assert.equal(evidenceCandidates.length, 1);
    assert.equal(
      evidenceCandidates[0].productUrl,
      "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
    );
    assert.equal(
      evidenceCandidates[0].evidenceSources[0].snippetProvenance,
      "query-derived",
    );
  });

  it("keeps ordinary and incomplete Google search pages out of evidence normalization", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "DEWALT DXV10SB Wet/Dry Vacuum",
            link: "https://www.google.com/search?q=DEWALT+DXV10SB",
            source: "Acme Hardware",
            price: "$199",
          },
          {
            title: "DEWALT DXV10SB Wet/Dry Vacuum",
            link:
              "https://www.google.com/search?ibp=oshop&udm=28&q=DEWALT+DXV10SB",
            source: "Acme Hardware",
            price: "$199",
          },
          {
            title: "Shop Wet/Dry Vacuums",
            link:
              "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
            source: "Acme Hardware",
            price: "$199",
          },
          {
            title: "DEWALT DXV10SB Wet/Dry Vacuum",
            link:
              "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
            source: "",
            price: "$199",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );

    assert.equal(candidates.length, 0);
  });

  it("prefers a merchant product URL over a Google Shopping offer URL", () => {
    const [candidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "DEWALT DXV10SB 10 Gal. Wet/Dry Vacuum",
            productLink:
              "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
            link: "https://hardware.example.com/products/dewalt-dxv10sb",
            source: "Acme Hardware",
            price: "$199",
          },
        ],
      },
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { allowGoogleShoppingOfferEvidence: true },
    );

    assert.equal(
      candidate.productUrl,
      "https://hardware.example.com/products/dewalt-dxv10sb",
    );
  });

  it("recovers a Serper-supplied merchant URL only when normalization recovery is enabled", () => {
    const response = {
      shopping: [
        {
          title: "DEWALT DXV10SB 10 Gal. Wet/Dry Vacuum",
          productLink:
            "https://www.google.com/search?ibp=oshop&udm=28&prds=pid%3A123456789",
          link: "https://hardware.example.com/products/dewalt-dxv10sb",
          source: "Acme Hardware",
          price: "$199",
          imageUrl: "https://hardware.example.com/images/dxv10sb.jpg",
        },
      ],
    };

    const flagOff = normalizeSerperShoppingResults(
      response,
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { enableNormalizationRecovery: false },
    );
    const flagOn = normalizeSerperShoppingResults(
      response,
      "DEWALT DXV10SB shop vac",
      "shop vac",
      { enableNormalizationRecovery: true },
    );

    assert.deepEqual(flagOff, []);
    assert.equal(flagOn.length, 1);
    assert.equal(
      flagOn[0].productUrl,
      "https://hardware.example.com/products/dewalt-dxv10sb",
    );
  });

  it("wires the default-off normalization branch to its environment flag", () => {
    const previous = process.env.REVIEW_RADAR_NORMALIZATION_RECOVERY;
    const response = {
      shopping: [
        {
          title: "DEWALT DXV10SB 10 Gal. Wet/Dry Vacuum",
          productLink: "https://www.google.com/search?q=DEWALT+DXV10SB&udm=28",
          link: "https://hardware.example.com/products/dewalt-dxv10sb",
          source: "Acme Hardware",
          price: "$199",
        },
      ],
    };

    try {
      delete process.env.REVIEW_RADAR_NORMALIZATION_RECOVERY;
      const defaultOff = normalizeSerperShoppingResults(
        response,
        "DEWALT DXV10SB shop vac",
        "shop vac",
      );
      const explicitOff = normalizeSerperShoppingResults(
        response,
        "DEWALT DXV10SB shop vac",
        "shop vac",
        { enableNormalizationRecovery: false },
      );
      process.env.REVIEW_RADAR_NORMALIZATION_RECOVERY = "on";
      const enabled = normalizeSerperShoppingResults(
        response,
        "DEWALT DXV10SB shop vac",
        "shop vac",
      );

      assert.equal(JSON.stringify(defaultOff), JSON.stringify(explicitOff));
      assert.deepEqual(defaultOff, []);
      assert.equal(enabled.length, 1);
    } finally {
      if (previous === undefined) {
        delete process.env.REVIEW_RADAR_NORMALIZATION_RECOVERY;
      } else {
        process.env.REVIEW_RADAR_NORMALIZATION_RECOVERY = previous;
      }
    }
  });

  it("records an honest same-response normalization counterfactual from the runtime path", () => {
    const response = {
      shopping: [
        {
          title: "Example RV200 Robot Vacuum",
          productLink: "https://www.google.com/search?q=RV200&udm=28",
          link: "https://shop.example.com/products/example-rv200-robot-vacuum",
          source: "Example Store",
          price: "$249",
        },
        {
          title: "Example RV300 Robot Vacuum",
          productLink: "https://click.example.net/products/example-rv300-robot-vacuum",
          source: "Example Store",
          price: "$279",
        },
        {
          title: "Example RV400 Robot Vacuum",
          productLink: "https://shop.example.com/products/example-rv400-robot-vacuum",
          source: "Example Store",
          price: "$299",
        },
      ],
    };
    const enabled = diagnoseSerperShoppingResponse(
      response,
      "Example robot vacuum",
      "robot vacuum",
      {
        captureNormalizationCounterfactual: true,
        enableNormalizationRecovery: true,
      },
    );
    const [added, removed, unchanged] = enabled.normalizationDecisions.map(
      (decision) => decision.normalizationCounterfactual,
    );

    assert.equal(enabled.candidates.length, 2);
    assert.equal(added.runtimeMode, "flag_on");
    assert.equal(added.runtimeMatchesSelected, true);
    assert.equal(added.delta, "added");
    assert.equal(added.flagOff.normalizedCandidateId, null);
    assert.ok(added.flagOn.normalizedCandidateId);
    assert.equal(removed.delta, "removed_for_safety");
    assert.ok(removed.flagOff.normalizedCandidateId);
    assert.equal(removed.flagOn.normalizedCandidateId, null);
    assert.equal(unchanged.delta, "unchanged");
    assert.equal(
      unchanged.flagOn.normalizedCandidateId,
      unchanged.flagOff.normalizedCandidateId,
    );
  });

  it("evaluates every alternate URL instead of trusting the first non-Google field", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://click.example.net/redirect?offer=rv200",
            product_link: "https://shop.example.com/collections/robot-vacuums",
            link: "https://shop.example.com/products/example-rv200-robot-vacuum",
            source: "Example Store",
            price: "$249",
          },
        ],
      },
      "Example RV200 robot vacuum",
      "robot vacuum",
      { enableNormalizationRecovery: true },
    );

    assert.equal(candidates.length, 1);
    assert.equal(
      candidates[0].productUrl,
      "https://shop.example.com/products/example-rv200-robot-vacuum",
    );
  });

  it("rejects affiliate deeplinks as recovered merchant URLs", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://www.google.com/search?ibp=oshop&udm=28",
            link:
              "https://linksynergy.com/deeplink?murl=https%3A%2F%2Fshop.example%2Fproducts%2Fexample-rv200",
            source: "Example Store",
            price: "$249",
          },
        ],
      },
      "Example RV200 robot vacuum",
      "robot vacuum",
      { enableNormalizationRecovery: true },
    );

    assert.deepEqual(candidates, []);
  });

  it("does not let recovery originate identity or override source-model conflicts", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Robot Vacuums - Example Store",
            productLink: "https://www.google.com/search?ibp=oshop&udm=28",
            link: "https://shop.example.com/products/example-rv200-robot-vacuum",
            source: "Example Store",
            price: "$249",
          },
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://www.google.com/search?ibp=oshop&udm=28",
            link: "https://shop.example.com/products/example-rv300-robot-vacuum",
            source: "Example Store",
            price: "$249",
          },
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://www.google.com/search?ibp=oshop&udm=28",
            product_link: "https://www.google.com/search?q=example+rv200",
            link: "https://shopping.google.com/search?q=example+rv200",
            source: "Example Store",
            price: "$249",
          },
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://www.google.com/search?ibp=oshop&udm=28",
            link: "https://reddit.com/products/example-rv200-robot-vacuum",
            source: "Example Store",
            price: "$249",
          },
          {
            title: "Example RV200 Robot Vacuum",
            productLink: "https://track.example.net/products/example-rv200-robot-vacuum",
            source: "Example Store",
            price: "$249",
          },
        ],
      },
      "Example RV200 robot vacuum",
      "robot vacuum",
      { enableNormalizationRecovery: true },
    );

    assert.deepEqual(candidates, []);
  });

  it("reports an exact normalization subreason for every considered shopping result", () => {
    const result = diagnoseSerperShoppingResponse(
      {
        shopping: Array.from({ length: 8 }, (_, index) => ({
          title: `Example RV${200 + index} Robot Vacuum`,
          link: `https://www.google.com/search?q=example+rv${200 + index}`,
          source: "Example Store",
          price: "$249",
        })),
      },
      "robot vacuum",
      "robot vacuum",
      { enableNormalizationRecovery: false },
    );

    assert.equal(result.normalizationDecisions.length, 8);
    assert.ok(
      result.normalizationDecisions.every(
        (decision) => decision.rejectionReason === "search_or_listing_url",
      ),
    );
  });

  it("distinguishes specific Shop-Vac products from generic shop pages", () => {
    const specific = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title:
              "Shop-Vac 10-Gallon 5.5 HP Wet/Dry Shop Vacuum with Accessories",
            link: "https://store.example.com/products/sv-10-gallon-55hp",
            source: "Example Store",
            price: "$129",
          },
        ],
      },
      "shop vac",
      "shop vac",
    );
    const genericTitles = [
      "Shop Vacuums",
      "Shop Wet/Dry Vacuums",
      "Shop Vacuum Cleaners",
      "Shop All Vacuums",
      "Shop Tools",
      "Shop By Category",
      "Best Shop Vacuums",
    ];
    const generic = normalizeSerperShoppingResults(
      {
        shopping: genericTitles.map((title, index) => ({
          title,
          link: `https://store.example.com/category/${index}`,
          source: "Example Store",
          price: "$129",
        })),
      },
      "shop vac",
      "shop vac",
    );

    assert.equal(specific.length, 1);
    assert.equal(generic.length, 0);
  });

  it("does not normalize trusted-store category pages into product candidates", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Basketball Shoes - Nike",
            link: "https://www.nike.com/w/mens-basketball-shoes-3glsmznik1zy7ok",
            source: "Nike",
            price: "$120",
            imageUrl: "https://static.nike.com/category.jpg",
            snippet: "Shop basketball shoes from Nike.",
          },
          {
            title: "Garden Hoses - The Home Depot",
            link: "https://www.homedepot.com/b/Outdoors-Garden-Center-Watering-Irrigation-Garden-Hoses/N-5yc1vZbx4e",
            source: "The Home Depot",
            price: "$39.97",
            imageUrl: "https://images.homedepot-static.com/category.jpg",
            snippet: "Browse garden hose products.",
          },
        ],
      },
      "basketball shoes product pages",
      "basketball shoes",
    );

    assert.equal(candidates.length, 0);
  });

  it("normalizes alternate Serper shopping fields without losing product candidates", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Galanz GLR10TRDEFR Retro Red Refrigerator",
            product_link: "https://www.appliancesconnection.com/galanz-glr10trdefr.html",
            source: "Appliances Connection",
            extracted_price: 799,
            thumbnailUrl: "https://images.example.com/red-fridge.jpg",
            rating: 4.2,
            rating_count: "86",
            snippet: "Retro red refrigerator with 10 cu. ft. capacity.",
          },
        ],
      },
      "red refrigerator under 1000",
      "red refrigerator",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "Galanz GLR10TRDEFR Retro Red Refrigerator");
    assert.equal(candidates[0].productUrl, "https://www.appliancesconnection.com/galanz-glr10trdefr.html");
    assert.equal(candidates[0].price, 799);
    assert.equal(candidates[0].reviewCount, 86);
    assert.deepEqual(candidates[0].availableColors, ["red"]);
  });

  it("keeps short model-number product detail pages from organic results", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Galanz GLR10TRDEFR Retro Refrigerator",
            link: "https://www.appliancesconnection.com/galanz-glr10trdefr.html",
            displayedLink: "Appliances Connection",
            snippet: "Galanz GLR10TRDEFR red retro refrigerator product page.",
          },
        ],
      },
      "red refrigerator under 1000 product page",
      "red refrigerator",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "Galanz GLR10TRDEFR Retro Refrigerator");
    assert.equal(candidates[0].productUrl, "https://www.appliancesconnection.com/galanz-glr10trdefr.html");
    assert.deepEqual(candidates[0].availableColors, ["red"]);
  });

  it("extracts depth and height from search result metadata when present", () => {
    const candidates = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Example Counter Depth Refrigerator",
            link: "https://shop.example.com/counter-depth-refrigerator",
            price: "$1299",
            imageUrl: "https://shop.example.com/fridge.jpg",
            snippet: "Measures 36 inches wide, depth 29 inches, height 70 inches.",
          },
        ],
      },
      "counter depth refrigerator under 30 inches deep",
      "refrigerator",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].dimensions.width, 36);
    assert.equal(candidates[0].dimensions.depth, 29);
    assert.equal(candidates[0].dimensions.height, 70);
  });

  it("trusts title color over broad snippet color when identifying variants", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Summit Appliance 5.5-cu ft Mini Fridge (White) FF61W",
            link: "https://www.lowes.com/pd/Summit-Appliance-5-5-cu-ft-Undercounter-Mini-Fridge-White/5014326",
            displayedLink: "Lowe's",
            snippet: "Found while browsing red refrigerators under $1000.",
          },
        ],
      },
      "red refrigerator under 1000 product page",
      "refrigerator",
    );

    assert.equal(candidates.length, 1);
    assert.deepEqual(candidates[0].availableColors, ["white"]);
  });

  it("rejects broad retailer search pages instead of treating them as products", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Baseball Gloves For Sale",
            link: "https://www.amazon.com/baseball-gloves-sale/s?k=baseball+gloves+for+sale",
            displayedLink: "Amazon",
            snippet: "1-48 of 698 results for baseball gloves for sale.",
          },
          {
            title: "$25 To $50 / Baseball Infielder's Mitts / ...",
            link: "https://www.amazon.com/Baseball-Infielders-Mitts-25-50/s?k=baseball+infielders+mitts",
            displayedLink: "Amazon",
            snippet: "Browse baseball infielder mitts by price range.",
          },
          {
            title: "Wilson 2021 A360 Adult Slowpitch Softball Glove",
            link: "https://www.amazon.com/Wilson-2021-A360-Slowpitch-Softball/dp/B08EXAMPLE",
            displayedLink: "Amazon",
            snippet: "Wilson A360 adult slowpitch softball glove.",
          },
        ],
      },
      "baseball glove under 500",
      "baseball glove",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "Wilson 2021 A360 Adult Slowpitch Softball Glove");
  });

  it("rejects retailer category pages while keeping real product detail pages", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "White Desks - Wayfair",
            link: "https://www.wayfair.com/furniture/sb1/white-desks-c1780384-a276~466.html",
            displayedLink: "Wayfair",
            snippet: "Shop white desks at Wayfair.",
          },
          {
            title: "Red Refrigerators | AJ Madison",
            link: "https://www.ajmadison.com/c/red-refrigerators/",
            displayedLink: "AJ Madison",
            snippet: "Browse red refrigerators.",
          },
          {
            title: "Countertop Microwave Ovens - Best Buy",
            link: "https://www.bestbuy.com/site/microwaves/countertop-microwaves/abcat0904001.c",
            displayedLink: "Best Buy",
            snippet: "Shop countertop microwave ovens at Best Buy.",
          },
          {
            title: "Pressure Washers - Best Buy",
            link:
              "https://www.bestbuy.com/site/outdoor-power-equipment/pressure-washers/pcmcat1597940389709.c?id=pcmcat1597940389709",
            displayedLink: "Best Buy",
            snippet: "Shop pressure washers at Best Buy.",
          },
          {
            title: "Customer Reviews for Frigidaire 7.5 cu. ft. Retro Mini Fridge in Red",
            link: "https://www.homedepot.com/p/reviews/Frigidaire-7-5-cu-ft-Retro-Mini-Fridge-in-Red/123456",
            displayedLink: "Home Depot",
            snippet: "Customer reviews for a red mini fridge.",
          },
          {
            title: "Galanz GLR10TRDEFR Retro Red Refrigerator",
            link: "https://www.ajmadison.com/cgi-bin/ajmadison/GLR10TRDEFR.html",
            displayedLink: "AJ Madison",
            snippet: "Galanz GLR10TRDEFR red retro refrigerator product page.",
          },
          {
            title: "64 Inch Beige Sleeper Sofa With Storage Chaise",
            link: "https://www.wayfair.com/furniture/pdp/example-64-inch-beige-sleeper-sofa-w12345.html",
            displayedLink: "Wayfair",
            snippet: "Beige sleeper sofa product page with 64 inch width.",
          },
          {
            title: "Frigidaire 7.5 cu. ft. Retro Mini Fridge in Red",
            link: "https://www.homedepot.com/p/Frigidaire-7-5-cu-ft-Retro-Mini-Fridge-in-Red/987654",
            displayedLink: "Home Depot",
            snippet: "Red retro mini fridge product page.",
          },
        ],
      },
      "red refrigerator under 1000 product page",
      "refrigerator",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      [
        "Galanz GLR10TRDEFR Retro Red Refrigerator",
        "64 Inch Beige Sleeper Sofa With Storage Chaise",
        "Frigidaire 7.5 cu. ft. Retro Mini Fridge in Red",
      ],
    );
  });

  it("rejects Phase 5D collection, support, and documentation shapes during discovery", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title:
              "Air Purifiers, Ventilators & Monitors for Clean Air - Daikin Comfort",
            link: "https://daikincomfort.com/products/indoor-air-quality",
            displayedLink: "Daikin Comfort",
            snippet: "Indoor air quality product family.",
          },
          {
            title: "Levoit Core 300S | Low Airflow - Support",
            link:
              "https://support.example.com/app/answers/detail/a_id/300/low-airflow",
            displayedLink: "Example Support",
            snippet: "Troubleshooting an air purifier with low airflow.",
          },
          {
            title: "H7123 - Smart Pet Air Purifier - device.report",
            link: "https://device.report/govee/h7123",
            displayedLink: "device.report",
            snippet: "Device information for the Govee H7123.",
          },
          {
            title: "Levoit Core 300S-P Smart Air Purifier",
            link: "https://levoit.com/products/core-300s-p-smart-air-purifier",
            displayedLink: "Levoit",
            snippet: "Levoit Core 300S-P product page.",
          },
        ],
      },
      "air purifier product page",
      "air purifier",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      ["Levoit Core 300S-P Smart Air Purifier"],
    );
  });

  it("does not treat review, video, forum, or homepage results as product cards", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "The BEST Refrigerators of 2026! What to BUY & AVOID! - YouTube",
            link: "https://www.youtube.com/watch?v=5n76TXuDcok",
            displayedLink: "YouTube",
            snippet: "Video review about refrigerators.",
          },
          {
            title: "Anyone purchased the Cozey Ciello couch? : r/BuyCanadian - Reddit",
            link: "https://www.reddit.com/r/BuyCanadian/comments/15blw0v/anyone_purchased_the_cozey_ciello_co/",
            displayedLink: "Reddit",
            snippet: "Owner discussion about a couch.",
          },
          {
            title: "Best Sleeper Sofas 2026 - Forbes Vetted",
            link: "https://www.forbes.com/sites/forbes-personal-shopper/article/best-sleeper-sofa/",
            displayedLink: "Forbes",
            snippet: "Editorial roundup of sleeper sofas.",
          },
          {
            title: "What mini fridge to use for dosing? - Bay Area Reefers | BAR",
            link: "https://bareefers.org/forum/threads/what-mini-fridge-to-use-for-dosing.33286/",
            displayedLink: "Bay Area Reefers",
            snippet: "Forum discussion about using a mini fridge.",
          },
          {
            title: "LG Refrigerator - Error Code List | LG USA Support",
            link: "https://www.lg.com/us/support/help-library/lg-refrigerator-error-code-list--1441392048805",
            displayedLink: "LG",
            snippet: "Support page for refrigerator error codes.",
          },
          {
            title: "Questions and Answers: Frigidaire Retro 3.2 Cu. Ft. Mini Fridge Red",
            link: "https://www.bestbuy.com/site/questions/frigidaire-retro-3-2-cu-ft-mini-fridge-red/6323915",
            displayedLink: "Best Buy",
            snippet: "Q&A page for a red mini fridge.",
          },
          {
            title: "[PDF] Professional office - device.report",
            link: "https://www.ikea.com/us/en/files/pdf/dd/eb/ddebb5f8/professional_office_may_25_2021.pdf",
            displayedLink: "IKEA",
            snippet: "PDF catalog with office furniture.",
          },
          {
            title: "10 Best White Computer Desks of 2022 - Devaise",
            link: "https://www.devaise.com/blogs/our-blog/10-best-white-computer-desks-of-2022",
            displayedLink: "Devaise",
            snippet: "Blog article about white computer desks.",
          },
          {
            title: "Apparently I love doing things backwards I put this together in the ...",
            link: "https://www.instagram.com/reel/DQCz29MCfII/",
            displayedLink: "Instagram",
            snippet: "Social post about a desk setup.",
          },
          {
            title: "ALEX desk, white, 52x22 7/8 - IKEA",
            link: "https://www.ikea.com/us/en/p/alex-desk-white-80483438/",
            displayedLink: "IKEA",
            snippet: "White desk product page.",
          },
          {
            title: "Scandinavian Designs | Dania Furniture",
            link: "https://scandinaviandesigns.com/",
            displayedLink: "Scandinavian Designs",
            snippet: "Furniture store homepage.",
          },
        ],
      },
      "white desk with drawers under 300 product page",
      "desk",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "ALEX desk, white, 52x22 7/8 - IKEA");
  });

  it("rejects complaint, deal roundup, and buying-advice organic pages", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Complaint about new Example Laptop quality | Example Support",
            link: "https://support.example.com/community/conversations/example-laptop-complaint",
            displayedLink: "Example Support",
            snippet: "Complaint thread that mentions a gaming laptop model.",
          },
          {
            title: "Example Espresso Machine Deals 2026 - Best Example Sales",
            link: "https://magazine.example.com/kitchen/best-example-espresso-machine-deals-2026",
            displayedLink: "Example Magazine",
            snippet: "Seasonal article collecting espresso machine deals.",
          },
          {
            title: "Long Term Espresso Machine - Buying Advice - Page 2",
            link: "https://community.example.com/advice/long-term-espresso-machine-buying-advice-page-2",
            displayedLink: "Example Community",
            snippet: "Forum-style advice about espresso machines.",
          },
          {
            title: "7 Things to Avoid When Purchasing an Air Purifier | Example Air",
            link: "https://www.exampleair.com/blog/things-to-avoid-when-purchasing-an-air-purifier",
            displayedLink: "Example Air",
            snippet: "Buying-advice article about air purifiers.",
          },
          {
            title: "The HP Victus 16 is one of the best-value gaming laptops I've ever tested",
            link: "https://www.laptopmag.com/reviews/hp-victus-16-best-value-gaming-laptop",
            displayedLink: "Laptop Mag",
            snippet: "Publisher article about a gaming laptop.",
          },
          {
            title: "Turn your kitchen into a cafe with the Example Magnifica Evo",
            link: "https://www.mashable.com/article/example-magnifica-evo-espresso-machine-sale",
            displayedLink: "Mashable",
            snippet: "Publisher article about an espresso machine sale.",
          },
          {
            title: "Up your game with the Example Legion gaming laptop, yours for $850",
            link: "https://www.windowscentral.com/gaming/up-your-game-with-example-legion-laptop",
            displayedLink: "Windows Central",
            snippet: "Publisher sale article about a gaming laptop.",
          },
          {
            title: "Review: Example Magnifica Evo Espresso Machine",
            link: "https://coffee.example.com/reviews/example-magnifica-evo",
            displayedLink: "Example Coffee Blog",
            snippet: "Review article about an espresso machine.",
          },
          {
            title: "Gaggia Brera RI9305/11 Review & Guide (2025)",
            link: "https://coffee.example.com/gaggia-brera-ri9305-review-guide-2025",
            displayedLink: "Example Coffee Blog",
            snippet: "Review guide about an espresso machine.",
          },
          {
            title: "Compare at 16+ Stores: Example La Specialista Coffee Machine",
            link: "https://www.price.com/compare/example-la-specialista-coffee-machine",
            displayedLink: "Price.com",
            snippet: "Price-comparison page across multiple stores.",
          },
          {
            title: "The 65-inch LG C4 OLED TV Is on Sale for Its Lowest Price Ever at Example",
            link: "https://deals.example.com/lg-c4-oled-tv-lowest-price-ever",
            displayedLink: "Deals Example",
            snippet: "Sale article about a TV, not a product page.",
          },
          {
            title: "TCL 65 Inch TVs | P.C. Richard & Son",
            link: "https://www.pcrichard.com/tcl-65-inch-tvs/",
            displayedLink: "P.C. Richard & Son",
            snippet: "Retailer listing page for multiple TVs.",
          },
          {
            title: "Business Laptops - Best Buy",
            link: "https://www.bestbuy.com/site/business-laptops/",
            displayedLink: "Best Buy",
            snippet: "Retailer category page for laptops.",
          },
        ],
      },
      "espresso machine built in grinder under 700 product page",
      "espresso machine",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      [],
    );
  });

  it("rejects question-style publishing articles without blocking genuine /p/ products", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Is Costco (Kirkland) Dog Food Actually Good? - The BK Pets",
            link: "https://thebkpets.substack.com/p/is-costco-kirkland-dog-food-actually",
            displayedLink: "The BK Pets",
            snippet: "An editorial assessment of Kirkland dog food.",
          },
          {
            title: "Example X100 Cordless Drill",
            link: "https://manufacturer.example.com/p/example-x100-cordless-drill",
            displayedLink: "Example Manufacturer",
            snippet: "Product page for the Example X100 cordless drill.",
          },
        ],
      },
      "cordless drill product page",
      "cordless drill",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      ["Example X100 Cordless Drill"],
    );
  });

  it("rejects reopened category, standards, comparison, and press-release shapes", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title:
              "Electric Toothbrushes - Twin Packs and Bundles - Page 1 - Oral-B",
            link:
              "https://oralb.com/en-us/products/electric-toothbrushes/twin-packs-and-bundles/",
            displayedLink: "Oral-B",
            snippet: "Browse twin packs and electric toothbrush bundles.",
          },
          {
            title: "ISO 20127:2020—Powered Toothbrushes - The ANSI Blog",
            link:
              "https://blog.ansi.org/iso-20127-2020-powered-toothbrushes/",
            displayedLink: "ANSI",
            snippet: "Standards article about powered toothbrushes.",
          },
          {
            title:
              "Oral-B iO Series comparison (chart included) - Electric Teeth",
            link:
              "https://www.electricteeth.com/oral-b-io-series-comparison/",
            displayedLink: "Electric Teeth",
            snippet: "Editorial comparison chart for multiple Oral-B models.",
          },
          {
            title:
              "Colgate-Palmolive Launches hum by Colgate: The New Smart Electric Toothbrush",
            link:
              "https://www.multivu.com/players/English/8761151-colgate-hum-smart-electric-toothbrush",
            displayedLink: "MultiVu",
            snippet: "Press release announcing a new smart toothbrush.",
          },
          {
            title: "Oral-B iO Series 7 Electric Toothbrush",
            link:
              "https://oralb.com/en-us/products/electric-toothbrushes/oral-b-io-series-7-electric-toothbrush-white-alabaster/",
            displayedLink: "Oral-B",
            snippet: "Specific iO Series 7 product page.",
          },
        ],
      },
      "electric toothbrush product page",
      "electric toothbrush",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      ["Oral-B iO Series 7 Electric Toothbrush"],
    );
  });

  it("rejects editorial ranking pages and retailer category pages as product candidates", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "Ranking the top 74 sneakers in NBA history - ESPN",
            link: "https://www.espn.com/nba/story/_/id/123456/ranking-top-74-sneakers-nba-history",
            displayedLink: "ESPN",
            snippet: "Editorial ranking of famous sneakers, not a product page.",
          },
          {
            title: "Basketball Shoes. Nike.com",
            link: "https://www.nike.com/w/basketball-shoes-3glsmzy7ok",
            displayedLink: "Nike",
            snippet: "Shop basketball shoes from Nike.",
          },
          {
            title: "Basketball Shoes For Speed | DICK'S Sporting Goods",
            link: "https://www.dickssportinggoods.com/f/basketball-shoes-for-speed",
            displayedLink: "DICK'S Sporting Goods",
            snippet: "Retailer listing page for many basketball shoes.",
          },
          {
            title: "Cut in half: Nike G.T. Jump 2 Review | RunRepeat",
            link: "https://runrepeat.com/nike-gt-jump-2",
            displayedLink: "RunRepeat",
            snippet: "Review article about a Nike basketball shoe.",
          },
          {
            title: "Nike Basketball Releases the Book 2, the Next Chapter in Devin ...",
            link: "https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info",
            displayedLink: "Nike Newsroom",
            snippet: "Brand newsroom release, not a product page.",
          },
          {
            title: "Nike Alphafly 3: Tried and tested - Runner's World",
            link: "https://www.runnersworld.com/uk/gear/shoes/a60703694/nike-alphafly-3-review/",
            displayedLink: "Runner's World",
            snippet: "Hands-on running shoe review, not a product page.",
          },
          {
            title: "Review: Nike Winflo 11",
            link: "https://running.example.com/reviews/nike-winflo-11",
            displayedLink: "Example Running",
            snippet: "Review article about a Nike running shoe.",
          },
          {
            title: "RULE NO. 1: Court Dimensions – Equipment - NBA Official",
            link: "https://official.nba.com/rule-no-1-court-dimensions-equipment/",
            displayedLink: "NBA Official",
            snippet: "Basketball court rules and equipment dimensions.",
          },
          {
            title: "Basketball Hoop & Backboard Dimensions & Drawings - Pinterest",
            link: "https://www.pinterest.com/pin/basketball-hoop-backboard-dimensions-drawings/",
            displayedLink: "Pinterest",
            snippet: "Image collection about basketball hoop dimensions.",
          },
          {
            title: "Book 1 \"Solar Red\" Basketball Shoes - Nike",
            link: "https://www.nike.com/t/book-1-solar-red-basketball-shoes-HtV54G",
            displayedLink: "Nike",
            snippet: "Nike product page for Book 1 Solar Red basketball shoes.",
          },
        ],
      },
      "Nike basketball shoes under $300 product page",
      "basketball shoes",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.name),
      ['Book 1 "Solar Red" Basketball Shoes - Nike'],
    );
  });

  it("keeps product detail pages whose names start with The", () => {
    const candidates = normalizeSerperOrganicResults(
      {
        organic: [
          {
            title: "The Barista Express Espresso Machine",
            link: "https://shop.example.com/products/the-barista-express-espresso-machine",
            displayedLink: "Example Store",
            snippet:
              "Product page for The Barista Express espresso machine.",
          },
        ],
      },
      "espresso machine built in grinder under 700 product page",
      "espresso machine",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].name, "The Barista Express Espresso Machine");
  });

  it("skips Serper safely when the API key is missing", async () => {
    const originalKey = process.env.SERPER_API_KEY;
    const originalNodeEnv = process.env.NODE_ENV;

    delete process.env.SERPER_API_KEY;
    process.env.NODE_ENV = "test";

    const result = await searchSerperForProducts(["black sleeper sofa"], "couch");

    process.env.NODE_ENV = originalNodeEnv;
    if (originalKey === undefined) {
      delete process.env.SERPER_API_KEY;
    } else {
      process.env.SERPER_API_KEY = originalKey;
    }

    assert.equal(result.candidates.length, 0);
    assert.equal(result.stats.skippedReason, "missing_api_key");
    assert.equal(result.stats.categoryGroup, "furniture");
    assert.ok(Array.isArray(result.stats.searchedRetailerDomainQueries));
  });

  it("normalizes direct retailer engine results", () => {
    const candidates = normalizeSerperDirectResults(
      {
        shopping: [
          {
            title: "Example 20V Drill Kit",
            link: "https://www.homedepot.com/p/example-drill",
            source: "Home Depot",
            price: "$129",
            rating: 4.8,
            ratingCount: 400,
            imageUrl: "https://images.example.com/drill.jpg",
            snippet: "20V drill kit with battery and charger.",
          },
        ],
      },
      "20v drill",
      "drill",
      "home_depot",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].retailer, "Home Depot");
    assert.equal(candidates[0].price, 129);
  });

  it("uses the same guarded merchant recovery for direct-retailer results", () => {
    const candidates = normalizeSerperDirectResults(
      {
        organic: [
          {
            title: "Example HD200 20V Drill Kit",
            productLink: "https://click.example.net/redirect?offer=hd200",
            link: "https://www.homedepot.com/p/example-hd200-drill/123456789",
            source: "Home Depot",
            price: "$129",
            snippet: "Example HD200 20V drill kit with battery and charger.",
          },
        ],
      },
      "Example HD200 20V drill",
      "drill",
      "home_depot",
      { enableNormalizationRecovery: true },
    );

    assert.equal(candidates.length, 1);
    assert.equal(
      candidates[0].productUrl,
      "https://www.homedepot.com/p/example-hd200-drill/123456789",
    );
  });

  it("normalizes Serper image and video vertical results into evidence sources", () => {
    const imageSources = normalizeSerperImageSources(
      {
        images: [
          {
            title: "Example Product Image",
            link: "https://example.com/product",
            imageUrl: "https://example.com/product.jpg",
            source: "Example Store",
          },
        ],
      },
      3,
    );
    const videoSources = normalizeSerperVideoSources(
      {
        videos: [
          {
            title: "Example Product Review",
            link: "https://www.youtube.com/watch?v=example",
            snippet: "Hands-on review of the example product.",
            channel: "Review Channel",
            source: "YouTube",
          },
        ],
      },
      3,
    );

    assert.equal(imageSources.length, 1);
    assert.equal(imageSources[0].url, "https://example.com/product");
    assert.match(imageSources[0].snippet, /Image:/);
    assert.equal(videoSources.length, 1);
    assert.equal(videoSources[0].url, "https://www.youtube.com/watch?v=example");
    assert.match(videoSources[0].snippet, /Hands-on review/);
    assert.match(videoSources[0].snippet, /Review Channel/);
  });

  it("cheap pre-filter removes obvious bad candidates before strict filtering", () => {
    const [goodCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Black Full Sleeper Sofa 60 in. Wide",
            link: "https://shop.example.com/products/black-sofa",
            imageUrl: "https://shop.example.com/black-sofa.jpg",
            price: 899,
            snippet: "Black full sleeper sofa 60 inches wide.",
          },
        ],
      },
      "black sleeper sofa",
      "pull out couch",
    );
    const [badCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Replacement sofa slipcover only",
            link: "https://shop.example.com/slipcover",
            price: 99,
            imageUrl: "https://shop.example.com/slipcover.jpg",
            snippet: "Replacement cover only for sofa cushions.",
          },
        ],
      },
      "black sleeper sofa",
      "pull out couch",
    );
    const result = cheapPreFilterRawCandidates(
      [goodCandidate, badCandidate],
      {
        budget: "under $1500",
        priorities: "under 64 inches",
        query: "pull out couch",
        selectedFeatures: ["Color: Black"],
      },
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].name, "Black Full Sleeper Sofa 60 in. Wide");
    assert.equal(result.rejectedCount, 1);
  });

  it("cheap pre-filter removes household floor cleaners from shop-vac discovery", () => {
    const response = {
      shopping: [
        {
          title:
            "BISSELL CrossWave HF3 Cordless Multi-Surface Wet Dry Vacuum 3649A",
          link: "https://shop.example.com/products/crosswave-hf3-3649a",
          imageUrl: "https://shop.example.com/images/crosswave-hf3.jpg",
          price: 199,
          snippet: "Household hard-floor cleaner and vacuum mop.",
        },
        {
          title: "Tineco Floor ONE S5 Wet Dry Vacuum Cleaner and Mop",
          link: "https://shop.example.com/products/floor-one-s5",
          imageUrl: "https://shop.example.com/images/floor-one-s5.jpg",
          price: 249,
          snippet: "Multi-surface household floor washer.",
        },
        {
          title: "RIDGID 9 Gallon NXT Wet Dry Shop Vacuum HD0900",
          link: "https://shop.example.com/products/ridgid-hd0900",
          imageUrl: "https://shop.example.com/images/ridgid-hd0900.jpg",
          price: 99,
          snippet:
            "4.25 Peak HP utility wet/dry vacuum for garage and jobsite debris.",
        },
      ],
    };
    const candidates = normalizeSerperShoppingResults(
      response,
      "shop vac",
      "shop vac",
    );
    const result = cheapPreFilterRawCandidates(
      candidates,
      {
        extractedRequirements: extractStructuredRequirements({
          query: "shop vac",
        }),
        query: "shop vac",
      },
      10,
    );

    assert.deepEqual(
      result.candidates.map((candidate) => candidate.name),
      ["RIDGID 9 Gallon NXT Wet Dry Shop Vacuum HD0900"],
    );
    assert.equal(result.rejectedCount, 2);
  });

  it("does not derive shop-vac product type from retailer labels or query-derived snippets", () => {
    const [candidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "RIDGID 9 Gallon NXT Wet Dry Shop Vacuum HD0900",
            link: "https://shop.example.com/products/ridgid-hd0900",
            imageUrl: "https://shop.example.com/images/ridgid-hd0900.jpg",
            price: 99,
            source: "CrossWave Floor Cleaner Outlet",
          },
        ],
      },
      "CrossWave floor cleaner",
      "shop vac",
    );
    assert.equal(
      candidate.evidenceSources[0].snippetProvenance,
      "query-derived",
    );
    const result = cheapPreFilterRawCandidates(
      [candidate],
      {
        extractedRequirements: extractStructuredRequirements({
          query: "shop vac",
        }),
        query: "shop vac",
      },
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.rejectedCount, 0);
  });

  it("cheap pre-filter treats multiple selected colors as alternatives", () => {
    const [beigeCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Beige Full Sleeper Sofa 62 in. Wide",
            link: "https://shop.example.com/products/beige-sleeper",
            imageUrl: "https://shop.example.com/beige-sleeper.jpg",
            price: 899,
            snippet: "Beige full sleeper sofa with compact 62 inch width.",
          },
        ],
      },
      "beige sleeper sofa",
      "pull out couch",
    );
    const result = cheapPreFilterRawCandidates(
      [beigeCandidate],
      {
        budget: "under $1500",
        priorities: "under 64 inches",
        query: "pull out couch",
        selectedFeatures: ["Color: Black", "Color: Beige"],
      },
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].name, "Beige Full Sleeper Sofa 62 in. Wide");
    assert.equal(result.rejectedCount, 0);
  });

  it("cheap pre-filter removes fixed avoid attribute violations", () => {
    const [grayCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Gray Left-Facing Sectional Sofa 84 in. Wide",
            link: "https://shop.example.com/products/gray-left-sectional",
            imageUrl: "https://shop.example.com/gray-sectional.jpg",
            price: 899,
            snippet: "Gray left-facing sectional sofa with 84 inch width.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const [beigeCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Beige Left-Facing Sectional Sofa 84 in. Wide",
            link: "https://shop.example.com/products/beige-left-sectional",
            imageUrl: "https://shop.example.com/beige-sectional.jpg",
            price: 999,
            snippet:
              "Beige left-facing sectional sofa with performance fabric and 84 inch width.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const request = {
      budget: "under $1500",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1500",
        priorities: "under 90 inches wide, pet-friendly, and not gray",
        query: "left-facing sectional",
      }),
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = cheapPreFilterRawCandidates(
      [grayCandidate, beigeCandidate],
      request,
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(
      result.candidates[0].name,
      "Beige Left-Facing Sectional Sofa 84 in. Wide",
    );
    assert.equal(result.rejectedCount, 1);
  });

  it("cheap pre-filter rejects exact length conflicts for plain length requirements", () => {
    const [fiftyFootCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Flexzilla 5/8 in. x 50 ft. Garden Hose",
            link: "https://shop.example.com/products/flexzilla-50-ft",
            imageUrl: "https://shop.example.com/flexzilla.jpg",
            price: 44.98,
            snippet: "50 ft garden hose with 5/8 inch diameter.",
          },
        ],
      },
      "garden hose 50 ft length",
      "garden hose",
    );
    const [hundredFootCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Gilmour Flexogen Water Hose 5/8 inch by 100 ft",
            link: "https://shop.example.com/products/gilmour-100-ft",
            imageUrl: "https://shop.example.com/gilmour.jpg",
            price: 79.99,
            snippet: "100 ft garden hose with heavy-duty construction.",
          },
        ],
      },
      "garden hose 50 ft length",
      "garden hose",
    );
    const request = {
      budget: "$100",
      extractedRequirements: extractStructuredRequirements({
        budget: "$100",
        priorities: "50 ft length",
        query: "garden hose",
      }),
      priorities: "50 ft length",
      query: "garden hose",
    };
    const result = cheapPreFilterRawCandidates(
      [fiftyFootCandidate, hundredFootCandidate],
      request,
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].name, "Flexzilla 5/8 in. x 50 ft. Garden Hose");
    assert.equal(result.rejectedCount, 1);
  });

  it("cheap pre-filter ranks hard-feature evidence ahead of generic category matches", () => {
    const [genericCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Apartment Sectional Sofa",
            link: "https://shop.example.com/products/generic-sectional",
            imageUrl: "https://shop.example.com/generic-sectional.jpg",
            price: 899,
            snippet: "Apartment sectional sofa with chaise.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const [specificCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Pet-Friendly Left-Facing Sectional Sofa 84 in. Wide",
            link: "https://shop.example.com/products/specific-sectional",
            imageUrl: "https://shop.example.com/specific-sectional.jpg",
            price: 999,
            snippet:
              "Pet-friendly performance fabric left-facing sectional sofa with 84 inch width.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const request = {
      budget: "under $1500",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1500",
        priorities: "under 90 inches wide, pet-friendly, and not gray",
        query: "left-facing sectional",
      }),
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };
    const result = cheapPreFilterRawCandidates(
      [genericCandidate, specificCandidate],
      request,
      10,
    );

    assert.equal(result.candidates.length, 2);
    assert.equal(
      result.candidates[0].name,
      "Pet-Friendly Left-Facing Sectional Sofa 84 in. Wide",
    );
  });

  it("cheap pre-filter rejects wrong-brand candidates for brand-only broad searches", () => {
    const [nikeCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Nike G.T. Cut Academy Basketball Shoes",
            link: "https://www.nike.com/t/gt-cut-academy",
            imageUrl: "https://static.nike.com/gt-cut.jpg",
            price: "$95",
            rating: 4.7,
            ratingCount: 2400,
            snippet:
              "Nike basketball shoes for indoor and outdoor courts with Zoom Air.",
          },
        ],
      },
      "nike basketball shoes under 300",
      "basketball shoes",
    );
    const [adidasCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Adidas Dame 9 Basketball Shoes",
            link: "https://www.adidas.com/us/dame-9",
            imageUrl: "https://assets.adidas.com/dame-9.jpg",
            price: "$120",
            rating: 4.6,
            ratingCount: 1300,
            snippet: "Adidas basketball shoes with Lightstrike cushioning.",
          },
        ],
      },
      "nike basketball shoes under 300",
      "basketball shoes",
    );
    const request = {
      budget: "$300",
      extractedRequirements: extractStructuredRequirements({
        budget: "$300",
        priorities: "Must be Nike only",
        query: "basketball shoes",
      }),
      priorities: "Must be Nike only",
      query: "basketball shoes",
    };
    const result = cheapPreFilterRawCandidates(
      [adidasCandidate, nikeCandidate],
      request,
      10,
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].name, "Nike G.T. Cut Academy Basketball Shoes");
    assert.equal(result.rejectedCount, 1);
  });

  it("only counts hard-detail evidence candidates as useful fallback coverage", () => {
    const [genericCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Apartment Sectional Sofa",
            link: "https://shop.example.com/products/generic-sectional",
            imageUrl: "https://shop.example.com/generic-sectional.jpg",
            price: 899,
            snippet: "Apartment sectional sofa with chaise.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const [specificCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Pet-Friendly Left-Facing Sectional Sofa 84 in. Wide",
            link: "https://shop.example.com/products/specific-sectional",
            imageUrl: "https://shop.example.com/specific-sectional.jpg",
            price: 999,
            snippet:
              "Pet-friendly performance fabric left-facing sectional sofa with 84 inch width.",
          },
        ],
      },
      "left-facing sectional under 90 inches",
      "sectional",
    );
    const request = {
      budget: "under $1500",
      extractedRequirements: extractStructuredRequirements({
        budget: "under $1500",
        priorities: "under 90 inches wide, pet-friendly, and not gray",
        query: "left-facing sectional",
      }),
      priorities: "under 90 inches wide, pet-friendly, and not gray",
      query: "left-facing sectional",
    };

    assert.equal(
      serperTestExports.isUsefulCoverageCandidate(genericCandidate, request, "deep"),
      false,
    );
    assert.equal(
      serperTestExports.isUsefulCoverageCandidate(specificCandidate, request, "deep"),
      true,
    );
    assert.equal(
      serperTestExports.hardEvidenceMatchCount(specificCandidate, request) >
        serperTestExports.hardEvidenceMatchCount(genericCandidate, request),
      true,
    );
  });

  it("cheap pre-filter removes candidates that clearly violate structured depth limits", () => {
    const [deepCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Counter Depth Refrigerator 36 in. Wide",
            link: "https://shop.example.com/deep-fridge",
            price: 1299,
            imageUrl: "https://shop.example.com/deep-fridge.jpg",
            snippet: "Depth 35 inches with stainless steel finish.",
          },
        ],
      },
      "counter depth refrigerator",
      "refrigerator",
    );
    const result = cheapPreFilterRawCandidates(
      [deepCandidate],
      {
        query: "refrigerator",
        extractedRequirements: {
          requiredConstraints: [],
          avoidConstraints: [],
          preferredConstraints: [],
          sizeConstraints: [
            {
              dimension: "depth",
              id: "size-1",
              label: "Depth: under 30 inches",
              operator: "max",
              unit: "in",
              value: 30,
            },
          ],
          colorConstraints: [],
          materialConstraints: [],
          brandConstraints: [],
          budgetRules: [],
          ambiguousConstraints: [],
          summary: [],
        },
      },
      10,
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.rejectedCount, 1);
  });

  it("removes standalone cooktops from oven and range searches", () => {
    const [cooktopCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Kucht 30-in 4 burners Stainless steel Gas Cooktop",
            link: "https://www.lowes.com/pd/kucht-gas-cooktop",
            price: 799,
            imageUrl: "https://images.example.com/kucht-cooktop.jpg",
            snippet: "Stainless steel gas cooktop with four burners.",
          },
        ],
      },
      "stainless steel gas range under 2000",
      "oven",
    );
    const result = cheapPreFilterRawCandidates(
      [cooktopCandidate],
      {
        budget: "under $2000",
        query: "oven",
        selectedFeatures: [
          {
            id: "fuel-type-equals-gas",
            name: "Fuel type",
            type: "enum",
            operator: "equals",
            value: "Gas",
            required: true,
            source: "smart_features",
          },
        ],
      },
      10,
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.rejectedCount, 1);
  });

  it("removes full-size wall ovens from toaster oven searches", () => {
    const [wallOvenCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "GE 30 in. Built-In Electric Wall Oven with Convection",
            link: "https://www.homedepot.com/p/ge-built-in-wall-oven",
            price: 399,
            imageUrl: "https://images.example.com/ge-wall-oven.jpg",
            snippet: "Full-size built-in wall oven with conventional convection cooking.",
          },
        ],
      },
      "toaster oven under 500",
      "toaster oven",
    );
    const result = cheapPreFilterRawCandidates(
      [wallOvenCandidate],
      {
        budget: "under $500",
        query: "toaster oven",
      },
      10,
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.rejectedCount, 1);
  });

  it("removes standalone ice makers from refrigerator searches", () => {
    const [iceMakerCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Summit BIM26H34 15 Inch Built-In Ice Maker with 22 lbs. Storage",
            link: "https://www.appliancesconnection.com/summit-bim26h34.html",
            price: 1299,
            imageUrl: "https://images.example.com/summit-ice-maker.jpg",
            snippet: "Built-in ice maker with stainless steel door and ice storage.",
          },
        ],
      },
      "counter depth refrigerator with ice maker under 1200",
      "refrigerator",
    );
    const result = cheapPreFilterRawCandidates(
      [iceMakerCandidate],
      {
        budget: "under $1200",
        priorities: "must have an ice maker and width under 33 inches",
        query: "counter-depth stainless steel refrigerator",
      },
      10,
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.rejectedCount, 1);
  });

  it("ranks specialist or brand product pages ahead of broad big-box listings", () => {
    const [walmartCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Wilson A2000 1786 11.5 Inch Baseball Glove",
            link:
              "https://www.walmart.com/ip/Wilson-A2000-1786-Baseball-Glove/123456",
            source: "Walmart",
            price: 299,
            imageUrl: "https://images.example.com/walmart-glove.jpg",
            snippet: "Wilson A2000 1786 baseball glove with 11.5 inch fit.",
          },
        ],
      },
      "baseball glove under 500",
      "baseball glove",
    );
    const [brandCandidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Wilson A2000 1786 11.5 Inch Baseball Glove",
            link:
              "https://www.wilson.com/en-us/product/a2000-1786-wbw100",
            source: "Wilson",
            price: 299,
            imageUrl: "https://images.example.com/wilson-glove.jpg",
            snippet: "Wilson official product page for the A2000 1786 baseball glove.",
          },
        ],
      },
      "baseball glove under 500",
      "baseball glove",
    );
    const result = cheapPreFilterRawCandidates(
      [walmartCandidate, brandCandidate],
      {
        budget: "under $500",
        query: "baseball glove",
      },
      2,
    );

    assert.equal(result.candidates.length, 2);
    assert.equal(result.candidates[0].productUrl.includes("wilson.com"), true);
  });

  it("converts raw candidates into weakly sourced product recommendations", () => {
    const [candidate] = normalizeSerperShoppingResults(
      {
        shopping: [
          {
            title: "Example Black Full Sleeper Sofa 63 in. Wide",
            link: "https://shop.example.com/products/black-full-sleeper-sofa",
            source: "Example Store",
            price: 899,
            rating: 4.6,
            ratingCount: 381,
            snippet:
              "Black full sleeper sofa with compact 63 inch width. Price: $899. 25% OFF.",
          },
        ],
      },
      "black sleeper sofa",
      "pull out couch",
    );
    const recommendation = serperCandidateToRecommendation(candidate);

    assert.equal(recommendation.recommendation_type, "Close Match");
    assert.equal(recommendation.source_consensus, "Weak");
    assert.equal(recommendation.product_page_url, candidate.productUrl);
    assert.equal(recommendation.citations[0].url, candidate.productUrl);
    assert.deepEqual(recommendation.pros, [
      "Available color option: black.",
      "Compact 63-inch width.",
      "Search result lists a 4.6 rating from 381 reviews.",
      "Listing details: Black full sleeper sofa with compact 63 inch width.",
    ]);
    assert.doesNotMatch(recommendation.pros.join("\n"), /^Price:/m);
    assert.doesNotMatch(recommendation.pros.join("\n"), /^Reviews:/m);
    assert.doesNotMatch(recommendation.pros.join("\n"), /OFF/);
  });

  it("merges duplicate Serper candidates into existing products", () => {
    const existing = buildProduct();
    const incoming = buildProduct({
      recommendation_type: "Close Match",
      product_page_url: "https://example.com/product?utm_source=serper",
      product_image_url: "https://example.com/image.jpg",
      citations: [
        {
          title: "Second source",
          url: "https://example.com/product?utm_source=serper",
          what_it_supports: "Same product from search.",
        },
      ],
    });
    const result = mergeProductRecommendations([existing], [incoming]);

    assert.equal(result.products.length, 1);
    assert.equal(result.duplicateCount, 1);
    assert.equal(result.products[0].product_image_url, "https://example.com/image.jpg");
  });

  it("keeps alternate retailer offer evidence when duplicate products merge", () => {
    const existing = buildProduct({
      product_page_url: "https://www.homedepot.com/p/example-drill/123",
      metadata: {
        ...buildProduct().metadata,
        offers: [
          {
            availability: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.homedepot.com/p/example-drill/123",
              value: null,
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            price: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.homedepot.com/p/example-drill/123",
              value: 199,
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            priceCurrency: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.homedepot.com/p/example-drill/123",
              value: "USD",
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            retailer: "Home Depot",
            url: "https://www.homedepot.com/p/example-drill/123",
          },
        ],
      },
      name: "DeWalt DCD800 20V MAX Cordless Drill",
    });
    const incoming = buildProduct({
      name: "DeWalt DCD800 20V MAX Cordless Drill - Lowe's",
      product_page_url: "https://www.lowes.com/pd/dewalt-dcd800/456",
      metadata: {
        ...buildProduct().metadata,
        offers: [
          {
            availability: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.lowes.com/pd/dewalt-dcd800/456",
              value: null,
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            price: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.lowes.com/pd/dewalt-dcd800/456",
              value: 209,
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            priceCurrency: {
              confidence: "Medium",
              sourceType: "serper",
              sourceUrl: "https://www.lowes.com/pd/dewalt-dcd800/456",
              value: "USD",
              verifiedAt: "2026-06-21T00:00:00.000Z",
            },
            retailer: "Lowe's",
            url: "https://www.lowes.com/pd/dewalt-dcd800/456",
          },
        ],
      },
    });
    const result = mergeProductRecommendations([existing], [incoming]);

    assert.equal(result.products.length, 1);
    assert.equal(result.duplicateCount, 1);
    assert.deepEqual(
      result.products[0].metadata.offers.map((offer) => offer.retailer),
      ["Home Depot", "Lowe's"],
    );
  });
});
