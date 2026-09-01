import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productSelectionTestExports } from "../lib/productSelection.ts";
import { extractStructuredRequirements } from "../lib/requirementExtraction.ts";

const {
  attachMarketEvidence,
  bayesianCommerceRating,
  candidateMatchesTarget,
  candidateHasUsablePage,
  dedupeSelectionCandidates,
  interleaveSearchCandidates,
  isNonUsMarketUrl,
  isSecondaryMarketCandidate,
  operationLimits,
  pageIdentityScore,
  pageSourceScore,
  processVerificationWaves,
  productPageSearchQuery,
  rankAcceptedSelections,
  rankCandidates,
  resolvedCandidate,
  resolvedCandidates,
  resolveProductPages,
  selectionBrand,
  selectionRequirementResult,
  selectDistinctProducts,
  selectVerificationCandidates,
  marketTargetsNeedingSearch,
  trustedAvailability,
  trustedPrice,
} = productSelectionTestExports;

function candidate(name, overrides = {}) {
  return {
    availableColors: [],
    brand: null,
    category: "product",
    dimensions: {
      depth: null,
      height: null,
      unit: null,
      width: null,
    },
    evidenceSources: [
      {
        snippet: name,
        snippetProvenance: "source-derived",
        title: name,
        url: "https://shop.example/products/item",
      },
    ],
    id: name,
    imageUrl: null,
    keySpecs: [name],
    name,
    price: 199,
    productUrl: "https://shop.example/products/item",
    ...overrides,
  };
}

function field(value) {
  return {
    confidence: "Medium",
    sourceType: "serper",
    sourceUrl: "https://shop.example/products/item",
    value,
    verifiedAt: "2026-08-31T00:00:00.000Z",
  };
}

function asset(name, overrides = {}) {
  const raw = candidate(name, overrides.candidate);
  return {
    candidate: raw,
    category: raw.category,
    imageUrl: "",
    metadata: {
      offers: [],
      title: field(name),
      ...(overrides.metadata || {}),
    },
    name,
    pageUrl: raw.productUrl,
    availabilityTrust: overrides.availabilityTrust || {
      status: "available",
      source: "page_metadata",
    },
    ...(overrides.priceTrust ? { priceTrust: overrides.priceTrust } : {}),
  };
}

function marketTarget(
  brand,
  model,
  evidenceTier = "strong",
  consensusOrder = 0,
  aliases = [],
) {
  return {
    aliases,
    brand,
    consensusOrder,
    evidenceTier,
    model,
    sourceUrls: ["https://www.rtings.com/example/reviews/best/product"],
  };
}

function emptyRequirements(preferredConstraints = []) {
  return {
    ambiguousConstraints: [],
    avoidConstraints: [],
    brandConstraints: [],
    budgetRules: [],
    colorConstraints: [],
    materialConstraints: [],
    preferredConstraints,
    requiredConstraints: [],
    sizeConstraints: [],
    specConstraints: [],
    summary: [],
  };
}

describe("selection correctness", () => {
  it("backfills rejected finalist waves without repeating discovery", async () => {
    const waves = [];
    const result = await processVerificationWaves({
      acceptedCount: (accepted) => accepted.length,
      candidates: Array.from({ length: 9 }, (_, index) => index + 1),
      maximumAccepted: 1,
      verifyWave: async (values, wave) => {
        waves.push(values);
        return {
          accepted: values.filter((value) => value > 5),
          outcome: wave,
        };
      },
      waveSize: 3,
    });

    assert.deepEqual(waves, [[1, 2, 3], [4, 5, 6]]);
    assert.deepEqual(result.accepted, [6]);
    assert.deepEqual(result.outcomes, [1, 2]);
  });

  it("stops scheduling verification waves after enough candidates pass", async () => {
    const waves = [];
    const result = await processVerificationWaves({
      acceptedCount: (accepted) => Math.min(accepted.length, 5),
      candidates: Array.from({ length: 9 }, (_, index) => index + 1),
      maximumAccepted: 5,
      verifyWave: async (values) => {
        waves.push(values);
        return { accepted: values, outcome: values.length };
      },
      waveSize: 3,
    });

    assert.equal(waves.length, 2);
    assert.deepEqual(result.accepted, [1, 2, 3, 4, 5, 6]);
  });

  it("does not schedule another wave after request cancellation", async () => {
    const controller = new AbortController();
    let waves = 0;

    await assert.rejects(
      processVerificationWaves({
        acceptedCount: (accepted) => accepted.length,
        candidates: [1, 2, 3, 4, 5, 6],
        maximumAccepted: 5,
        signal: controller.signal,
        verifyWave: async () => {
          waves += 1;
          controller.abort("test cancellation");
          return { accepted: [], outcome: null };
        },
        waveSize: 3,
      }),
      { name: "RequestCancelledError" },
    );
    assert.equal(waves, 1);
  });

  it("keeps direct product pages eligible when resolution-query budget is spent", async () => {
    const directCandidates = [
      candidate("RIDGID HD0600 Wet Dry Shop Vacuum", {
        productUrl: "https://shop.example/products/ridgid-hd0600",
      }),
      candidate("Stanley SL18116P Wet Dry Vacuum", {
        productUrl: "https://shop.example/products/stanley-sl18116p",
      }),
    ];
    const result = await resolveProductPages({
      candidates: directCandidates,
      category: "shop vacuum",
      executionOptions: {},
      maximumQueries: 0,
    });

    assert.deepEqual(result.candidates, directCandidates);
    assert.deepEqual(result.queries, []);
    assert.deepEqual(
      result.diagnostics.map((entry) => entry.status),
      ["direct", "direct"],
    );
  });

  it("rejects a direct product URL whose explicit configuration contradicts the offer", () => {
    assert.equal(
      candidateHasUsablePage(
        candidate("17.3 inch Laptop with 16GB RAM and 512GB SSD", {
          productUrl:
            "https://www.walmart.com/ip/HP-14-inch-Laptop-4GB-RAM-128GB-UFS/13989468860",
        }),
      ),
      false,
    );
  });

  it("interleaves candidates so one query cannot monopolize verification slots", () => {
    const values = interleaveSearchCandidates([
      [candidate("A1"), candidate("A2"), candidate("A3")],
      [candidate("B1"), candidate("B2")],
      [candidate("C1")],
    ]);

    assert.deepEqual(
      values.map((value) => value.name),
      ["A1", "B1", "C1", "A2", "B2", "A3"],
    );
  });

  it("spreads limited page verification across product brands", () => {
    const ranked = [
      candidate("Shark AI Ultra RV2502AE", { brand: "Shark" }),
      candidate("Shark Matrix RV2310AE", { brand: "Shark" }),
      candidate("Shark IQ AV2501S", { brand: "Shark" }),
      candidate("Shark UR2360S", { brand: "Shark" }),
      candidate("Eufy Omni C20", { brand: "Eufy" }),
      candidate("iRobot Roomba i3+", { brand: "iRobot" }),
      candidate("Roborock Q5 Max+", { brand: "Roborock" }),
    ];

    const selected = selectVerificationCandidates(ranked, 5);

    assert.deepEqual(
      selected.map((value) => value.name),
      [
        "Shark AI Ultra RV2502AE",
        "Shark Matrix RV2310AE",
        "Eufy Omni C20",
        "iRobot Roomba i3+",
        "Roborock Q5 Max+",
      ],
    );
  });

  it("rejects support pages even when the host matches the product brand", () => {
    assert.equal(
      pageSourceScore(
        candidate("Shark UR2360S Robot Vacuum", {
          brand: "Shark",
          productUrl:
            "https://support.sharkninja.com/product/shark-ur2360s-robot-vacuum",
        }),
      ),
      -1,
    );
    assert.equal(
      pageSourceScore(
        candidate("Shark Matrix Robot Vacuum", {
          brand: "Shark",
          productUrl:
            "https://www.sharkninja.com/shark-matrix-self-emptying-robot-vacuum/RV2310AE.html",
        }),
      ),
      350,
    );
  });

  it("uses the discovered brand to recognize an official product page", () => {
    const score = pageIdentityScore(
      candidate(
        "iRobot I355020 Roomba i3+ EVO Wi-Fi Connected Self-Emptying Robot Vacuum",
        { brand: "iRobot" },
      ),
      candidate("Roomba i3+ EVO Self-Emptying Robot Vacuum", {
        brand: null,
        price: null,
        productUrl:
          "https://www.irobot.com/en_US/roomba-i3plus-evo-self-emptying-robot-vacuum/I355020.html",
      }),
    );

    assert.ok(score > 0);
  });

  it("rejects an accessory page even when its title repeats the product identity", () => {
    assert.equal(
      pageIdentityScore(
        candidate("Wyze Robot Vacuum with LiDAR Room Mapping", { brand: "Wyze" }),
        candidate("Wyze Sweeper Vacuum Robot with High-Precision Mapping", {
          brand: "Wyze",
          price: null,
          productUrl:
            "https://www.walmart.com/ip/Wyze-Robot-Vacuum-Additional-Spare-Parts/123917010",
        }),
      ),
      0,
    );
  });

  it("uses stable model IDs without pinning page searches to one merchant", () => {
    const query = productPageSearchQuery(
      candidate(
        "Airrobo L50+ Robot Vacuum & Mops - Self Empty, 240min Runtime",
        { brand: "Airrobo", retailer: "Walmart" },
      ),
      "robot vacuum",
    );

    assert.match(query, /l50/i);
    assert.doesNotMatch(query, /walmart/i);
    assert.doesNotMatch(query, /240min/i);
  });

  it("pins an unresolved current Shopping offer to its own merchant", () => {
    const query = productPageSearchQuery(
      candidate("Milwaukee M18 FUEL Hammer Drill 2904-20", {
        brand: "Milwaukee",
        currentShoppingOffer: true,
        productUrl: "https://www.google.com/search?ibp=oshop&udm=28",
        retailer: "Home Depot",
      }),
      "cordless drill",
    );

    assert.match(query, /2904/i);
    assert.match(query, /home depot/i);
  });

  it("keeps a scout numeric model in a truncated offer's resolution query", () => {
    const query = productPageSearchQuery(
      candidate("Milwaukee M18 FUEL Cordless Hammer Drill ...", {
        brand: "Milwaukee",
        currentShoppingOffer: true,
        marketEvidence: {
          consensusOrder: 0,
          sourceUrls: ["https://www.popularmechanics.com/example"],
          targetBrand: "Milwaukee",
          targetModel: "M18 2904 Hammer Drill",
          tier: "strong",
        },
        productUrl: "https://www.google.com/search?ibp=oshop&udm=28",
        retailer: "Home Depot",
      }),
      "cordless drill",
    );

    assert.match(query, /2904/i);
    assert.match(query, /home depot/i);
  });

  it("accepts a product-shaped page from the exact Shopping merchant", () => {
    assert.equal(
      pageSourceScore(
        candidate("Vacmaster Wet/Dry Vacuum VFB511B 0201", {
          productUrl:
            "https://www.mgbuildingmaterials.com/pd/vacmaster-vacuum-professional-5-gal-beast-55-hp-wet-dry-vfb511b-0201/13051",
        }),
        null,
        "MG Building Materials",
      ),
      250,
    );
    assert.equal(
      pageSourceScore(
        candidate("Vacmaster Wet/Dry Vacuum VFB511B 0201", {
          productUrl: "https://www.mgbuildingmaterials.com/search/vacmaster",
        }),
        null,
        "MG Building Materials",
      ),
      -1,
    );
  });

  it("accepts an official page whose base model has a letter-only merchandising suffix", () => {
    const discovery = candidate(
      "Cuisinart 14 Cup Programmable Coffeemaker DCC-3200",
      { brand: "Cuisinart", retailer: "Arbor" },
    );
    const sameProductPage = candidate(
      "Cuisinart 14 Cup Programmable Coffee Maker",
      {
        brand: "Cuisinart",
        price: null,
        productUrl:
          "https://www.cuisinart.com/14-cup-programmable-coffee-maker/DCC-3200BKSNAS.html",
      },
    );
    const siblingPage = candidate(
      "Cuisinart 14 Cup Programmable Coffee Maker DCC-3400BKSNAS",
      {
        brand: "Cuisinart",
        price: null,
        productUrl:
          "https://www.cuisinart.com/14-cup-programmable-coffee-maker/DCC-3400BKSNAS.html",
      },
    );

    assert.ok(pageIdentityScore(discovery, sameProductPage) > 0);
    assert.equal(pageIdentityScore(discovery, siblingPage), 0);
  });

  it("rejects a page whose title echoes the target but whose path names a sibling model", () => {
    assert.equal(
      pageIdentityScore(
        candidate("NIPOGI Laptop AMD Ryzen 7 5700U 16GB RAM 512GB SSD"),
        candidate("NIPOGI Laptop AMD Ryzen 7 5700U 16GB RAM 512GB SSD", {
          price: null,
          productUrl:
            "https://www.walmart.com/ip/NIPOGI-Laptop-AMD-Ryzen-7-5825U-16GB-RAM-512GB-SSD/17680069291",
        }),
      ),
      0,
    );
  });

  it("rejects a page whose echoed title masks a conflicting hard spec in its path", () => {
    assert.equal(
      pageIdentityScore(
        candidate("Sun Joe 2000 PSI Max Electric Pressure Washer", {
          brand: "Sun Joe",
          retailer: "Sam's Club",
        }),
        candidate("Sun Joe 2000 PSI Max Electric Pressure Washer", {
          brand: "Sun Joe",
          price: null,
          productUrl:
            "https://www.samsclub.com/ip/sun-joe-electric-pressure-washer-1500-psi-rated-pressure/19730005534",
        }),
      ),
      0,
    );
  });

  it("does not use performance measurements as product models", () => {
    const query = productPageSearchQuery(
      candidate(
        "Eureka E20 Evo Plus Robot Vacuum 10,000Pa Suction 45-Day Self-Emptying",
        { brand: "Eureka", retailer: "eureka.com" },
      ),
      "robot vacuum",
    );

    assert.match(query, /e20/i);
    assert.match(query, /evo/i);
    assert.match(query, /plus/i);
    assert.doesNotMatch(query, /(?:10000|000)pa|45day/i);
  });

  it("does not resolve a named sibling variant as the discovered product", () => {
    assert.equal(
      pageIdentityScore(
        candidate("Eureka E20 Evo Plus Robot Vacuum", {
          brand: "Eureka",
          retailer: "eureka.com",
        }),
        candidate("Eureka E20 Plus Robot Vacuum", {
          brand: "Eureka",
          price: null,
          productUrl: "https://us.eureka.com/products/eureka-e20plus",
        }),
      ),
      0,
    );
  });

  it("rejects non-US country pages for the default US market", () => {
    assert.equal(
      pageSourceScore(
        candidate("Eureka E20 Plus Robot Vacuum", {
          brand: "Eureka",
          productUrl: "https://au.eureka.com/products/eureka-e20-plus-robot-vacuum",
          retailer: "eureka.com",
        }),
      ),
      -1,
    );
    assert.ok(
      pageSourceScore(
        candidate("Eureka E20 Plus Robot Vacuum", {
          brand: "Eureka",
          productUrl: "https://us.eureka.com/products/eureka-e20plus",
          retailer: "eureka.com",
        }),
      ) > 0,
    );
    assert.equal(
      isNonUsMarketUrl("https://www.eufy.com/eu-en/robot-vacuum-s1-pro"),
      true,
    );
    assert.equal(
      isNonUsMarketUrl("https://www.breville.com/en-us/product/bdc465"),
      false,
    );
  });

  it("removes secondary-market offers before page verification", () => {
    assert.equal(
      isSecondaryMarketCandidate(
        candidate("Shark Matrix RV2310AE", {
          retailer: "eBay - pawnamerica",
        }),
      ),
      true,
    );
    assert.equal(
      isSecondaryMarketCandidate(
        candidate("Shark Matrix RV2310AE", { retailer: "Target" }),
      ),
      false,
    );
    assert.equal(
      isSecondaryMarketCandidate(
        candidate("Shark Matrix RV2310AE", { retailer: "Reebelo USA" }),
      ),
      true,
    );
  });

  it("attaches market evidence only to the exact stable model identity", () => {
    const target = marketTarget("AOC", "Q27G3XMN");
    const attached = attachMarketEvidence(
      [
        candidate("AOC Q27G3XMN 27-inch Gaming Monitor", { brand: "AOC" }),
        candidate("AOC Q27G4X 27-inch Gaming Monitor", { brand: "AOC" }),
        candidate("AOC 27-inch Gaming Monitor", { brand: "AOC" }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence.tier, "strong");
    assert.equal(attached[0].marketEvidence.targetModel, "Q27G3XMN");
    assert.equal(attached[1].marketEvidence, undefined);
    assert.equal(attached[2].marketEvidence, undefined);
  });

  it("binds an official target page when an exact alias appears only in its URL", () => {
    const target = marketTarget(
      "Breville",
      "BDC465BSS1BNA1",
      "strong",
      0,
      ["BDC465"],
    );

    assert.equal(
      candidateMatchesTarget(
        candidate("the Luxe Brewer Thermal", {
          price: null,
          productUrl: "https://www.breville.com/en-us/product/bdc465",
        }),
        target,
      ),
      true,
    );
    assert.equal(
      candidateMatchesTarget(
        candidate("the Luxe Brewer Thermal", {
          price: null,
          productUrl: "https://www.breville.com/en-us/product/bdc450",
        }),
        target,
      ),
      false,
    );
  });

  it("preserves a resolved page's own direct current Shopping offer", () => {
    const resolved = resolvedCandidate(
      candidate("Alpha A100 Robot Vacuum", {
        brand: "Alpha",
        currentShoppingOffer: true,
        price: 249,
        productUrl:
          "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:111",
        retailer: "Example Store",
      }),
      [
        candidate("Alpha A100 Robot Vacuum", {
          brand: "Alpha",
          commerceSignals: {
            offerCount: 4,
            position: 1,
            productId: "222",
            rating: 4.7,
            ratingCount: 800,
          },
          currentShoppingOffer: true,
          price: 239,
          productUrl:
            "https://www.homedepot.com/p/Alpha-A100-Robot-Vacuum/123456",
          retailer: "Home Depot",
        }),
      ],
    );

    assert.equal(resolved.price, 239);
    assert.equal(resolved.retailer, "Home Depot");
    assert.equal(resolved.currentShoppingOffer, true);
    assert.equal(resolved.commerceSignals.productId, "222");
    assert.ok(resolved.keySpecs.includes("Alpha A100 Robot Vacuum"));
  });

  it("does not let a generic alias bypass the target catalog model", () => {
    const target = marketTarget(
      "Craftsman",
      "CMXEVBE17595 16-Gallon Wet/Dry Vac",
      "supported",
      0,
      ["Craftsman 16-Gallon 6 HP Corded Wet/Dry Shop Vacuum with Accessories"],
    );
    const attached = attachMarketEvidence(
      [
        candidate("Craftsman CMXEVBE17595 16-Gallon Wet/Dry Vac", {
          brand: "Craftsman",
        }),
        candidate(
          "Craftsman 16-Gallon 6 HP Corded Wet/Dry Shop Vacuum with Accessories CMXECXA8101645",
          { brand: "Craftsman" },
        ),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.targetModel, target.model);
    assert.equal(attached[1].marketEvidence, undefined);
  });

  it("does not treat a short all-caps brand as model identity", () => {
    const target = marketTarget(
      "FLEX",
      "FX1271T",
      "strong",
      0,
      [
        "FLEX FX1271T-2B",
        "FLEX 24V Hammer Drill with Turbo",
      ],
    );
    const attached = attachMarketEvidence(
      [
        candidate("FLEX FX1271T-2B Hammer Drill", { brand: "FLEX" }),
        candidate("FLEX FX1272T-2C Hammer Drill", { brand: "FLEX" }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.targetModel, "FX1271T");
    assert.equal(attached[1].marketEvidence, undefined);
  });

  it("binds an exact catalog model split by retailer formatting", () => {
    const target = {
      aliases: [],
      brand: "Vacmaster",
      consensusOrder: 0,
      evidenceTier: "strong",
      model: "VFB511B0201",
      sourceUrls: ["https://www.rtings.com/example"],
    };

    assert.equal(
      candidateMatchesTarget(
        {
          brand: "Vacmaster",
          name: "Vacmaster Wet/Dry Vacuum VFB511B 0201",
          productUrl: "https://www.walmart.com/ip/vacmaster-vfb511b-0201/123",
        },
        target,
      ),
      true,
    );
    assert.equal(
      candidateMatchesTarget(
        {
          brand: "Vacmaster",
          name: "Vacmaster Wet/Dry Vacuum VFB512B 0201",
          productUrl: "https://www.walmart.com/ip/vacmaster-vfb512b-0201/124",
        },
        target,
      ),
      false,
    );
  });

  it("uses a source-derived exact model only when the page names no sibling", () => {
    const target = marketTarget("DeWalt", "DCD701F2");
    const candidateFromSource = candidate(
      "DeWalt XTREME 12V MAX Cordless Drill Kit",
      {
        brand: "DeWalt",
        evidenceSources: [
          {
            snippet: "DeWalt DCD701F2 compact drill kit with battery and charger.",
            snippetProvenance: "source-derived",
            title: "DeWalt XTREME 12V MAX Cordless Drill Kit",
            url: "https://www.lowes.com/pd/dewalt-xtreme-drill/123",
          },
        ],
        productUrl: "https://www.lowes.com/pd/dewalt-xtreme-drill/123",
      },
    );

    assert.equal(candidateMatchesTarget(candidateFromSource, target), true);
    assert.equal(
      candidateMatchesTarget(
        {
          ...candidateFromSource,
          name: "DeWalt DCD709 Cordless Drill Kit",
        },
        target,
      ),
      false,
    );
  });

  it("does not let a source snippet override a short sibling model", () => {
    assert.equal(
      candidateMatchesTarget(
        candidate("ECOVACS DEEBOT T50 PRO OMNI", {
          brand: "Ecovacs",
          evidenceSources: [
            {
              snippet: "Compare the DEEBOT X9 PRO OMNI.",
              snippetProvenance: "source-derived",
              title: "ECOVACS DEEBOT T50 PRO OMNI",
              url: "https://www.bestbuy.com/product/ecovacs-t50/123",
            },
          ],
          productUrl: "https://www.bestbuy.com/product/ecovacs-t50/123",
        }),
        marketTarget("Ecovacs", "DEEBOT X9 PRO OMNI"),
      ),
      false,
    );
    assert.equal(
      candidateMatchesTarget(
        candidate("ECOVACS DEEBOT T80S OMNI", { brand: "Ecovacs" }),
        marketTarget("Ecovacs", "DEEBOT T80 OMNI"),
      ),
      false,
    );
  });

  it("does not transfer a numeric catalog target across a tool-platform sibling", () => {
    const target = marketTarget(
      "Milwaukee",
      "M18 2904 Hammer Drill",
      "strong",
      0,
    );
    const attached = attachMarketEvidence(
      [
        candidate("Milwaukee M18 FUEL 2904-20 Hammer Drill", {
          brand: "Milwaukee",
        }),
        candidate("Milwaukee M18 FUEL 2903-20 Hammer Drill", {
          brand: "Milwaukee",
        }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.targetModel, target.model);
    assert.equal(attached[1].marketEvidence, undefined);
  });

  it("rejects a direct product URL whose capacity contradicts the offer title", () => {
    assert.equal(
      candidateHasUsablePage(
        candidate("Cuisinart PerfecTemp 14 Cup Programmable Coffeemaker", {
          productUrl:
            "https://editorialist.com/p/cuisinart-5-cup-coffeemaker/?sku=89428415",
        }),
      ),
      false,
    );
  });

  it("rejects a direct product URL whose slug names a different leading brand", () => {
    assert.equal(
      candidateHasUsablePage(
        candidate("Kffkff Cold Electric Pressure Washer 2000 PSI", {
          productUrl:
            "https://www.walmart.com/ip/SKYSHALO-Cold-Electric-Pressure-Washer-2000-PSI/5463804498",
        }),
      ),
      false,
    );
  });

  it("rejects a retailer page whose hyphenated catalog model belongs to a different product", () => {
    assert.equal(
      pageIdentityScore(
        candidate("Milwaukee M18 FUEL Hammer Drill Driver Kit 2904-22", {
          brand: "Milwaukee",
          retailer: "Home Depot",
        }),
        candidate("Milwaukee M18 Compact Drill Driver 3601-21P", {
          brand: "Milwaukee",
          price: null,
          productUrl:
            "https://www.homedepot.com/p/Milwaukee-M18-Compact-Drill-Driver-3601-21P/325479354",
        }),
      ),
      0,
    );
  });

  it("uses a matching supplied brand when the exact model name leads the title", () => {
    const target = marketTarget("Technivorm", "Moccamaster KBGV Select");
    const attached = attachMarketEvidence(
      [
        candidate("Moccamaster KBGV Select Matte Silver", {
          brand: "Moccamaster",
        }),
        candidate("Moccamaster Cup-One Coffee Maker", {
          brand: "Technivorm",
        }),
        candidate("Shark Moccamaster KBGV Select Vacuum", {
          brand: "Technivorm",
        }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.targetModel, "Moccamaster KBGV Select");
    assert.equal(attached[1].marketEvidence, undefined);
    assert.equal(attached[2].marketEvidence, undefined);
  });

  it("does not transfer market evidence across a named sibling variant", () => {
    const target = marketTarget("iRobot", "Roomba i3+ EVO");
    const attached = attachMarketEvidence(
      [
        candidate("iRobot Roomba i3+ EVO Robot Vacuum", { brand: "iRobot" }),
        candidate("iRobot Roomba i3 EVO Robot Vacuum", { brand: "iRobot" }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.tier, "strong");
    assert.equal(attached[1].marketEvidence, undefined);
  });

  it("requires an explicit model generation before attaching its evidence", () => {
    const target = marketTarget("Dreame", "D10 Plus Gen 2");
    const attached = attachMarketEvidence(
      [
        candidate("Dreame D10 Plus Gen 2 Robot Vacuum", { brand: "Dreame" }),
        candidate("Dreame D10 Plus Robot Vacuum", { brand: "Dreame" }),
      ],
      [target],
    );

    assert.equal(attached[0].marketEvidence?.tier, "strong");
    assert.equal(attached[1].marketEvidence, undefined);
  });

  it("searches strong targets first and uses supported targets only for remaining slots", () => {
    const targets = [
      marketTarget("Alpha", "A100", "strong", 0),
      marketTarget("Beta", "B200", "strong", 1),
      marketTarget("Gamma", "C300", "supported", 2),
      marketTarget("Delta", "D400", "strong", 3),
      marketTarget("Epsilon", "E500", "strong", 4),
    ];
    const selected = marketTargetsNeedingSearch(
      [candidate("Alpha A100 Robot Vacuum", { brand: "Alpha" })],
      targets,
    );

    assert.deepEqual(
      selected.map((target) => target.model),
      ["B200", "D400", "E500"],
    );
    assert.deepEqual(
      marketTargetsNeedingSearch([], [
        marketTarget("Alpha", "A100", "strong", 0),
        marketTarget("Beta", "B200", "supported", 1),
        marketTarget("Gamma", "C300", "supported", 2),
      ]).map((target) => target.model),
      ["A100", "B200", "C300"],
    );
  });

  it("keeps the discovery and resolution work within the fifteen-operation ceiling", () => {
    assert.deepEqual(operationLimits, {
      discoverySearches: 6,
      neutralSearches: 3,
      resolutionCandidates: 9,
      targetSearches: 3,
      totalLogicalSearches: 15,
    });
    assert.equal(
      operationLimits.discoverySearches + operationLimits.resolutionCandidates,
      operationLimits.totalLogicalSearches,
    );
  });

  it("ranks evidence tiers before commerce metadata and never rewards price proximity", () => {
    const leader = candidate("Alpha A100 Robot Vacuum", {
      brand: "Alpha",
      commerceSignals: {
        offerCount: 1,
        position: 10,
        productId: "leader",
        rating: 4.1,
        ratingCount: 10,
      },
      price: 120,
    });
    const unscored = candidate("Beta B200 Robot Vacuum", {
      brand: "Beta",
      commerceSignals: {
        offerCount: 50,
        position: 1,
        productId: "unscored",
        rating: 4.9,
        ratingCount: 5000,
      },
      price: 299,
    });
    const ranked = rankCandidates(
      [unscored, leader],
      [marketTarget("Alpha", "A100")],
      { query: "robot vacuum", budget: "$300" },
    );

    assert.equal(ranked[0].name, leader.name);
    assert.equal(ranked[0].marketEvidence.tier, "strong");
  });

  it("shrinks sparse ratings so 5.0 with one review cannot beat 4.6 with 1,000", () => {
    const sparse = candidate("Alpha A100 Robot Vacuum", {
      commerceSignals: {
        offerCount: 1,
        position: 1,
        productId: "sparse",
        rating: 5,
        ratingCount: 1,
      },
    });
    const supported = candidate("Beta B200 Robot Vacuum", {
      commerceSignals: {
        offerCount: 1,
        position: 2,
        productId: "supported",
        rating: 4.6,
        ratingCount: 1000,
      },
    });

    assert.ok(
      bayesianCommerceRating(sparse.commerceSignals) <
        bayesianCommerceRating(supported.commerceSignals),
    );
    assert.equal(
      rankCandidates([sparse, supported], [], { query: "robot vacuum" })[0]
        .name,
      supported.name,
    );
  });

  it("uses directly supported preferences before scout consensus within one tier", () => {
    const preferred = {
      id: "quiet",
      label: "Quiet operation",
      source: "important_details",
      type: "feature",
      value: "quiet",
    };
    const ranked = rankCandidates(
      [
        candidate("Alpha A100 Robot Vacuum", { brand: "Alpha" }),
        candidate("Beta B200 Quiet Robot Vacuum", { brand: "Beta" }),
      ],
      [
        marketTarget("Alpha", "A100", "strong", 0),
        marketTarget("Beta", "B200", "strong", 1),
      ],
      {
        query: "robot vacuum",
        extractedRequirements: emptyRequirements([preferred]),
      },
    );

    assert.equal(ranked[0].name, "Beta B200 Quiet Robot Vacuum");
  });

  it("uses scout consensus before commerce metadata within one evidence tier", () => {
    const ranked = rankCandidates(
      [
        candidate("Beta B200 Robot Vacuum", {
          brand: "Beta",
          commerceSignals: {
            offerCount: 20,
            position: 1,
            productId: "beta",
            rating: 5,
            ratingCount: 1000,
          },
        }),
        candidate("Alpha A100 Robot Vacuum", {
          brand: "Alpha",
          commerceSignals: {
            offerCount: 1,
            position: 10,
            productId: "alpha",
            rating: 4,
            ratingCount: 1,
          },
        }),
      ],
      [
        marketTarget("Alpha", "A100", "strong", 0),
        marketTarget("Beta", "B200", "strong", 1),
      ],
      { query: "robot vacuum" },
    );

    assert.equal(ranked[0].name, "Alpha A100 Robot Vacuum");
  });

  it("reapplies quality ordering after every eligibility gate passes", () => {
    const leaderAsset = asset("Alpha A100 Robot Vacuum", {
      candidate: {
        brand: "Alpha",
        marketEvidence: {
          consensusOrder: 0,
          sourceUrls: ["https://www.rtings.com/example"],
          targetBrand: "Alpha",
          targetModel: "A100",
          tier: "strong",
        },
      },
    });
    const popularAsset = asset("Beta B200 Robot Vacuum", {
      candidate: {
        brand: "Beta",
        commerceSignals: {
          offerCount: 20,
          position: 1,
          productId: "beta",
          rating: 4.9,
          ratingCount: 5000,
        },
      },
    });
    const accepted = [popularAsset, leaderAsset].map((item) => ({
      asset: item,
      recommendation: {
        category: item.category,
        imageUrl: null,
        name: item.name,
        price: null,
        productPageUrl: item.pageUrl,
      },
    }));

    assert.equal(
      rankAcceptedSelections(accepted, { query: "robot vacuum" })[0].asset.name,
      leaderAsset.name,
    );
  });

  it("ranks trusted merchants ahead of unknown sellers", () => {
    const ranked = rankCandidates(
      [
        candidate("Eureka E20 Plus Robot Vacuum", {
          brand: "Eureka",
          retailer: "DiscountToday",
        }),
        candidate("AIRROBO L50 Robot Vacuum", {
          brand: "AIRROBO",
          retailer: "Walmart - AIRROBO",
        }),
      ],
      [],
      { query: "robot vacuum" },
    );

    assert.equal(ranked[0].retailer, "Walmart - AIRROBO");
  });

  it("ranks resolvable branded model identities ahead of generic offer names", () => {
    const ranked = rankCandidates(
      [
        candidate("14-Cup Programmable Coffee Maker", {
          retailer: "Best Buy",
        }),
        candidate("Cuisinart 14 Cup Coffeemaker DCC-3200", {
          brand: "Cuisinart",
          retailer: "Arbor",
        }),
      ],
      [],
      { query: "coffee maker", priorities: "14-cup programmable" },
    );

    assert.equal(ranked[0].name, "Cuisinart 14 Cup Coffeemaker DCC-3200");
  });

  it("recognizes the current Best Buy product URL format", () => {
    assert.equal(
      pageSourceScore(
        candidate("bObsweep UltraVision Self-Empty Robot Vacuum", {
          brand: "bObsweep",
          productUrl:
            "https://www.bestbuy.com/product/bobsweep-ultravision-pet-self-empty-robot-vacuum/J3RVRQVYWX",
        }),
      ),
      300,
    );
  });

  it("accepts exact retailer product pages but rejects listing and Q&A pages", () => {
    assert.equal(
      pageSourceScore(
        candidate("MSI 27-inch Gaming Monitor", {
          productUrl:
            "https://www.newegg.com/p/pl?d=1ms+response+time+240hz+curved+monitor",
        }),
      ),
      -1,
    );
    assert.equal(
      pageSourceScore(
        candidate("Acer KG271U Gaming Monitor", {
          productUrl:
            "https://www.newegg.com/acer-kg271u/p/N82E16824011452",
        }),
      ),
      300,
    );
    assert.equal(
      pageSourceScore(
        candidate("Black and Decker Coffee Maker", {
          productUrl:
            "https://www.homedepot.com/p/questions/BLACK-DECKER-CM1331S/313780612/1",
        }),
      ),
      -1,
    );
    assert.equal(
      pageSourceScore(
        candidate("Cuisinart DCC-3200 Coffee Maker", {
          brand: "Cuisinart",
          productUrl:
            "https://www.cuisinart.com/discontinued-14-cup-programmable-coffee-maker/DCC-3200.html?cgid=partsaccessories_coffeemakers",
        }),
      ),
      -1,
    );
    assert.equal(
      pageSourceScore(
        candidate("Greenworks Leaf Blower 2415902", {
          productUrl:
            "https://www.contractorsupplynetwork.com/2415902-Greenworks-Tools.aspx",
        }),
      ),
      300,
    );
  });

  it("prefers the merchant named by Shopping over a different valid offer", () => {
    const discovery = candidate("Shark Matrix Robot Vacuum RV2310AE", {
      brand: "Shark",
      retailer: "Target",
      productUrl: "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:1",
    });
    const manufacturer = candidate("Shark Matrix Robot Vacuum RV2310AE", {
      brand: "Shark",
      price: null,
      productUrl:
        "https://www.sharkninja.com/shark-matrix-self-empty-robot-vacuum/RV2310AE.html",
    });
    const merchant = candidate("Shark Matrix Robot Vacuum RV2310AE", {
      brand: "Shark",
      price: null,
      productUrl:
        "https://www.target.com/p/shark-matrix-self-empty-robot-vacuum-rv2310ae/-/A-88070988",
    });

    assert.equal(
      resolvedCandidate(discovery, [manufacturer, merchant]).productUrl,
      merchant.productUrl,
    );
  });

  it("does not transfer one merchant's Shopping price to another seller", () => {
    const discovery = candidate("Vacmaster VFB511B Wet Dry Vacuum", {
      brand: "Vacmaster",
      currentShoppingOffer: true,
      price: 79,
      productUrl: "https://www.google.com/search?ibp=oshop&udm=28",
      retailer: "MG Building Materials",
    });
    const otherSeller = candidate("Vacmaster VFB511B Wet Dry Vacuum", {
      brand: "Vacmaster",
      price: null,
      productUrl:
        "https://www.walmart.com/ip/Vacmaster-VFB511B-Wet-Dry-Vacuum/12345678",
    });

    const resolved = resolvedCandidate(discovery, [otherSeller]);
    assert.equal(resolved.price, null);
    assert.equal(resolved.currentShoppingOffer, false);
  });

  it("keeps two exact page alternatives on distinct hosts without extra searches", () => {
    const discovery = candidate("Ridgid HD06001 Wet Dry Shop Vacuum", {
      brand: "Ridgid",
      currentShoppingOffer: true,
      price: 79.98,
      productUrl: "https://www.google.com/search?ibp=oshop&udm=28",
      retailer: "Home Depot",
    });
    const homeDepot = candidate("Ridgid HD06001 Wet Dry Shop Vacuum", {
      productUrl:
        "https://www.homedepot.com/p/Ridgid-HD06001-Wet-Dry-Shop-Vacuum/306256721",
    });
    const duplicateHost = candidate("Ridgid HD06001 Wet Dry Shop Vacuum", {
      productUrl:
        "https://www.homedepot.com/p/Ridgid-HD06001-Wet-Dry-Vac/306256722",
    });
    const walmart = candidate("Ridgid HD06001 Wet Dry Shop Vacuum", {
      productUrl:
        "https://www.walmart.com/ip/Ridgid-HD06001-Wet-Dry-Shop-Vacuum/617432809",
    });
    const thirdHost = candidate("Ridgid HD06001 Wet Dry Shop Vacuum", {
      productUrl:
        "https://www.ridgid.com/us/en/product/hd06001-wet-dry-vacuum",
    });

    const resolved = resolvedCandidates(discovery, [
      homeDepot,
      duplicateHost,
      walmart,
      thirdHost,
    ]);

    assert.deepEqual(
      resolved.map((item) => new URL(item.productUrl).hostname),
      ["www.homedepot.com", "www.walmart.com"],
    );
    assert.equal(resolved[0].price, 79.98);
    assert.equal(resolved[0].currentShoppingOffer, true);
    assert.equal(resolved[1].price, null);
    assert.equal(resolved[1].currentShoppingOffer, false);
  });

  it("matches the storefront rather than the seller suffix in merchant labels", () => {
    const discovery = candidate("AIRROBO L50+ Robot Vacuum", {
      brand: "AIRROBO",
      retailer: "Walmart - AIRROBO",
      productUrl: "https://www.google.com/search?ibp=oshop&udm=28&prds=productid:2",
    });
    const manufacturer = candidate("AIRROBO L50+ Robot Vacuum", {
      brand: "AIRROBO",
      price: null,
      productUrl: "https://us.air-robo.com/products/airrobo-l50",
    });
    const merchant = candidate("AIRROBO L50+ Robot Vacuum", {
      brand: "AIRROBO",
      price: null,
      productUrl:
        "https://www.walmart.com/ip/AIRROBO-L50-Robot-Vacuum/15164166411",
    });

    assert.equal(
      resolvedCandidate(discovery, [manufacturer, merchant]).productUrl,
      merchant.productUrl,
    );
  });

  it("does not infer Hewlett-Packard from horsepower", () => {
    assert.equal(
      selectionBrand(
        candidate("CRAFTSMAN 12 Gallon 6 Peak HP Wet Dry Shop Vacuum"),
      )?.toLowerCase(),
      "craftsman",
    );
    assert.equal(selectionBrand(candidate("HP OmniBook X 14 Laptop")), "HP");
  });

  it("deduplicates the same product identity across retailer URLs", () => {
    const result = dedupeSelectionCandidates([
      candidate("Shark IQ AV1002AE Robot Vacuum", {
        id: "one",
        productUrl: "https://shop-a.example/products/shark-iq-av1002ae",
      }),
      candidate("Shark IQ AV1002AE Robot Vacuum", {
        id: "two",
        productUrl: "https://shop-b.example/products/shark-iq-av1002ae",
      }),
      candidate("iHome Nova S1 Pro Robot Vacuum", {
        id: "three",
        productUrl: "https://shop.example/products/ihome-nova-s1-pro",
      }),
    ]);

    assert.equal(result.candidates.length, 2);
    assert.equal(result.duplicateCount, 1);
  });

  it("does not merge named sibling variants that share a model number", () => {
    const result = dedupeSelectionCandidates([
      candidate("Eureka E20 Plus Robot Vacuum", {
        brand: "Eureka",
        productUrl: "https://shop-a.example/products/eureka-e20-plus",
      }),
      candidate("Eureka E20 Evo Plus Robot Vacuum", {
        brand: "Eureka",
        productUrl: "https://shop-b.example/products/eureka-e20-evo-plus",
      }),
    ]);

    assert.equal(result.candidates.length, 2);
  });

  it("keeps the direct retailer offer instead of an aggregate Google offer", () => {
    const aggregate = candidate("Shark IQ AV1002AE Robot Vacuum", {
      price: 124,
      productUrl:
        "https://www.google.com/search?ibp=oshop&prds=productid:123&udm=28",
    });
    const direct = candidate("Shark IQ AV1002AE Robot Vacuum", {
      price: 249,
      productUrl:
        "https://www.walmart.com/ip/Shark-IQ-AV1002AE-Robot-Vacuum/123456",
    });
    const result = dedupeSelectionCandidates([aggregate, direct]);

    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].productUrl, direct.productUrl);
    assert.equal(result.candidates[0].price, 249);
  });

  it("fails closed on explicit hard feature and spec requirements", () => {
    const robotInput = {
      query: "robot vacuum",
      priorities: "must be self-emptying",
    };
    robotInput.extractedRequirements =
      extractStructuredRequirements(robotInput);
    assert.equal(
      selectionRequirementResult(
        asset("iHome Nova S1 Pro Self-Emptying Robot Vacuum"),
        robotInput,
      ).isMatch,
      true,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Eufy Robot Vacuum with Charging Dock"),
        robotInput,
      ).isMatch,
      false,
    );

    const cordlessInput = { query: "cordless leaf blower" };
    cordlessInput.extractedRequirements =
      extractStructuredRequirements(cordlessInput);
    assert.equal(
      selectionRequirementResult(
        asset("RYOBI 40V HP Brushless Whisper Series Blower", {
          candidate: {
            productUrl:
              "https://www.homedepot.com/p/RYOBI-40V-Cordless-Battery-Leaf-Blower/334570740",
          },
        }),
        cordlessInput,
      ).isMatch,
      true,
    );

    const priorityInput = {
      query: "robot vacuum",
      priorities: "self-emptying",
    };
    priorityInput.extractedRequirements =
      extractStructuredRequirements(priorityInput);
    assert.equal(
      selectionRequirementResult(
        asset("Wyze Robot Vacuum with LiDAR Room Mapping"),
        priorityInput,
      ).isMatch,
      false,
    );

    const monitorInput = {
      query: "gaming monitor",
      priorities:
        "must be exactly 27-inch, must be 1440p, and at least 144Hz",
    };
    monitorInput.extractedRequirements =
      extractStructuredRequirements(monitorInput);
    assert.equal(
      selectionRequirementResult(
        asset("Acer 27-inch 2560x1440 QHD 180Hz Gaming Monitor"),
        monitorInput,
      ).isMatch,
      true,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Acer 32-inch 4K 144Hz Gaming Monitor"),
        monitorInput,
      ).isMatch,
      false,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Acer 27-inch 1080p 180Hz Gaming Monitor"),
        monitorInput,
      ).isMatch,
      false,
    );
  });

  it("rejects a known numeric contradiction in an otherwise soft priority", () => {
    const coffeeInput = {
      query: "coffee maker",
      priorities: "14-cup programmable",
    };
    coffeeInput.extractedRequirements =
      extractStructuredRequirements(coffeeInput);

    assert.equal(
      selectionRequirementResult(
        asset("Mr. Coffee 14-Cup Programmable Coffee Maker"),
        coffeeInput,
      ).isMatch,
      true,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Hamilton Beach 12 Cup Programmable Coffee Maker"),
        coffeeInput,
      ).isMatch,
      false,
    );
    assert.equal(
      selectionRequirementResult(
        asset("Programmable Coffee Maker"),
        coffeeInput,
      ).isMatch,
      true,
    );
  });

  it("requires a trustworthy in-budget price when a budget exists", () => {
    assert.deepEqual(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 179, status: "verified" },
        }),
        200,
      ),
      { accepted: true, price: 179 },
    );
    assert.equal(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 250, status: "verified" },
        }),
        200,
      ).accepted,
      false,
    );
    assert.equal(
      trustedPrice(
        asset("Monitor", {
          priceTrust: { price: 50, status: "suspicious" },
        }),
        200,
      ).accepted,
      false,
    );
  });

  it("requires affirmative current availability", () => {
    assert.equal(
      trustedAvailability(
        asset("Available monitor", {
          availabilityTrust: {
            status: "available",
            source: "page_metadata",
          },
        }),
      ),
      true,
    );
    assert.equal(
      trustedAvailability(
        asset("Unavailable monitor", {
          availabilityTrust: {
            status: "unavailable",
            source: "page_metadata",
          },
        }),
      ),
      false,
    );
    assert.equal(
      trustedAvailability(
        asset("Unverified monitor", {
          availabilityTrust: {
            status: "unknown",
            source: "unverified_page",
          },
        }),
      ),
      false,
    );
  });

  it("returns distinct products with at most two from one brand initially", () => {
    const products = [
      ["Acer XV272U", "Acer"],
      ["Acer VG271U", "Acer"],
      ["Acer XZ270U", "Acer"],
      ["Dell G2724D", "Dell"],
    ].map(([name, brand]) => {
      const value = asset(name, {
        candidate: {
          brand,
          productUrl: `https://shop.example/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        },
      });
      return {
        asset: value,
        recommendation: {
          category: "gaming monitor",
          imageUrl: null,
          name,
          price: null,
          productPageUrl: value.pageUrl,
        },
      };
    });
    const selected = selectDistinctProducts(products);

    assert.equal(selected.length, 4);
    assert.equal(new Set(selected.map((item) => item.name)).size, 4);
  });

  it("returns one card when different discovery identities resolve to one page", () => {
    const pageUrl = "https://www.ryobitools.com/products/33287240876";
    const products = [
      "Ryobi ONE+ HP 18V Brushless Cordless Compact 4-Tool Combo Kit",
      "Ryobi ONE+ HP 18V Brushless Cordless 2-Tool Combo Kit",
    ].map((name) => {
      const value = asset(name, { candidate: { brand: "Ryobi", productUrl: pageUrl } });
      return {
        asset: value,
        recommendation: {
          category: "cordless drill",
          imageUrl: null,
          name,
          price: null,
          productPageUrl: pageUrl,
        },
      };
    });

    assert.equal(selectDistinctProducts(products).length, 1);
  });
});
