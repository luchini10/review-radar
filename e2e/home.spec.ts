import { expect, test, type Page } from "@playwright/test";
import {
  twoLayerPreviewCards,
  twoLayerPreviewSources,
} from "../lib/twoLayerPreviewData";

async function failIfRecommendationsApiIsCalled(page: Page) {
  await page.route("**/api/recommendations", async () => {
    throw new Error("Unexpected /api/recommendations call in this test.");
  });
}

async function mockRecommendationsApi(page: Page, body: unknown, status = 200) {
  await page.route("**/api/recommendations", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status,
      body: JSON.stringify(body),
    });
  });
}

async function submitSearch(page: Page, category = "black microwave") {
  await page.goto("/");
  const categoryInput = page.getByLabel("Product category");
  await categoryInput.fill(category);
  await expect(categoryInput).toHaveValue(category);
  await page.getByRole("button", { name: "Find Recommendations" }).click();
}

test("home page loads ReviewRadar without calling research APIs", async ({
  page,
}) => {
  await failIfRecommendationsApiIsCalled(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/ReviewRadar/);
  await expect(
    page.getByRole("heading", {
      name: "Find the products people actually recommend.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find Recommendations" }),
  ).toBeVisible();
});

test("offers a working keyboard skip link", async ({ page }) => {
  await failIfRecommendationsApiIsCalled(page);
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator("#main")).toBeFocused();
});

test("shows validation near the form for an empty product category", async ({
  page,
}) => {
  await failIfRecommendationsApiIsCalled(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Find Recommendations" }).click();

  await expect(page.getByText("Please enter a product category.")).toBeVisible();
});

test("shows validation near the form for a vague product category", async ({
  page,
}) => {
  await failIfRecommendationsApiIsCalled(page);
  await page.goto("/");

  await page.getByLabel("Product category").fill("anything");
  await page.getByRole("button", { name: "Find Recommendations" }).click();

  await expect(
    page.getByText("Please enter a more specific product category."),
  ).toBeVisible();
});

test("sends a trimmed request with important details and selected Smart Features", async ({
  page,
}) => {
  let recommendationRequestBody = {};

  await page.route("**/api/features", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        features: [
          {
            id: "color",
            name: "Color",
            description: "Available color.",
            type: "enum",
            possibleValues: ["White", "Black"],
            operators: ["equals"],
            unit: "",
            examples: ["White", "Black"],
            commonlyImportant: true,
          },
        ],
      }),
    });
  });

  await page.route("**/api/recommendations", async (route) => {
    recommendationRequestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: mockRecommendationResult }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Product category").fill("  refrigerator  ");
  await page.getByLabel("Budget").fill("  under $1500  ");
  await page
    .getByLabel("Important Details")
    .fill("  for a narrow apartment kitchen  ");
  await page.getByRole("button", { name: "Smart Features" }).click();
  await page.getByRole("button", { name: "White" }).click();
  await page.getByRole("button", { name: "Find Recommendations" }).click();

  await expect(page.getByText(/Showing 1 exact match/)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Research results ready.");
  await expect(page.getByRole("link", { name: "How it works" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "The decision brief" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Start new research" }),
  ).toBeVisible();
  expect(recommendationRequestBody).toMatchObject({
    budget: "under $1,500",
    priorities: "for a narrow apartment kitchen",
    query: "refrigerator",
    selectedFeatures: [
      {
        name: "Color",
        operator: "equals",
        required: true,
        source: "smart_features",
        value: "White",
      },
    ],
  });
});

test("shows loading skeletons and allows canceling a search", async ({ page }) => {
  await page.route("**/api/recommendations", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: mockRecommendationResult }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Product category").fill("cordless vacuum");
  await page.getByRole("button", { name: "Find Recommendations" }).click();

  await expect(page.getByRole("button", { name: "Preparing search..." })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Research in progress.");
  await expect(page.getByTestId("results-loading-skeletons")).toBeVisible();

  await page.getByRole("button", { name: "Cancel search" }).click();

  await expect(page.getByRole("button", { name: "Find Recommendations" })).toBeVisible();
});

for (const viewport of [
  { label: "desktop", width: 1280, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`polls and renders two-layer results on ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const jobToken = "signed-app-job-token";
    const requests: Array<{ method: string; url: string; token: string | null }> = [];

    await page.route("**/api/recommendations**", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.pathname === "/api/recommendations/progress") {
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({ events: [], status: "running" }),
        });
        return;
      }
      const method = route.request().method();
      requests.push({
        method,
        url: route.request().url(),
        token: route.request().headers()["x-reviewradar-job-token"] || null,
      });
      if (method === "POST") {
        await route.fulfill({
          contentType: "application/json",
          status: 202,
          body: JSON.stringify({
            pipeline: "two_layer",
            version: "oai-two-layer-api-v1",
            state: "pending",
            status: "queued",
            jobToken,
            pollAfterMs: 1_000,
            expiresAtMs: Date.now() + 60_000,
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "completed",
          presentationVersion: "oai-two-layer-presentation-v1",
          cards: twoLayerPreviewCards.slice(0, 1),
          sources: twoLayerPreviewSources,
        }),
      });
    });

    await submitSearch(page, "cordless vacuum");

    await expect(
      page.getByRole("heading", {
        name: "Ranked recommendations with visible trust states",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Example Durable Canister" }),
    ).toBeVisible();
    await expect(page.getByText("Check current price")).toBeVisible();
    expect(requests.map((entry) => entry.method)).toEqual(["POST", "GET"]);
    expect(requests[1].url).not.toContain(jobToken);
    expect(requests[1].token).toBe(jobToken);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test("cancels a known two-layer job with one DELETE", async ({ page }) => {
  const jobToken = "signed-cancel-token";
  const methods: string[] = [];

  await page.route("**/api/recommendations**", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === "/api/recommendations/progress") {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ events: [], status: "running" }),
      });
      return;
    }
    const method = route.request().method();
    methods.push(method);
    if (method === "DELETE") {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          pipeline: "two_layer",
          version: "oai-two-layer-api-v1",
          state: "cancelled",
          status: "cancelled",
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      status: 202,
      body: JSON.stringify({
        pipeline: "two_layer",
        version: "oai-two-layer-api-v1",
        state: "pending",
        status: method === "POST" ? "queued" : "in_progress",
        jobToken,
        pollAfterMs: 1_000,
        expiresAtMs: Date.now() + 60_000,
      }),
    });
  });

  await page.goto("/");
  await page.getByLabel("Product category").fill("cordless vacuum");
  await page.getByRole("button", { name: "Find Recommendations" }).click();
  await expect.poll(() => methods.filter((method) => method === "GET").length).toBe(1);
  await page.getByRole("button", { name: "Cancel search" }).click();
  await expect.poll(() => methods.filter((method) => method === "DELETE").length).toBe(1);
  await expect(page.getByRole("button", { name: "Find Recommendations" })).toBeVisible();
  expect(methods.filter((method) => method === "POST")).toHaveLength(1);
  expect(methods.filter((method) => method === "DELETE")).toHaveLength(1);
});

test("renders mocked exact-match result cards and citations", async ({ page }) => {
  await mockRecommendationsApi(page, { result: mockRecommendationResult });

  await submitSearch(page);

  await expect(page.getByText(/Showing 1 exact match/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Whirlpool Countertop Microwave" })).toBeVisible();
  await expect(page.getByText("Why we recommend it")).toBeVisible();
  await expect(page.getByText("Tradeoff", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence quality")).toBeVisible();
  await expect(page.getByText(/1 source checked/).first()).toBeVisible();
  const citationLink = page.getByRole("link", { name: "Retailer product page" });

  await expect(citationLink).toBeVisible();
  await expect(citationLink).toHaveAttribute("target", "_blank");
  await expect(citationLink).toHaveAttribute("rel", "noreferrer noopener");
});

test("renders a product image when a safe image is available", async ({
  page,
}) => {
  await page.route("**/mock-product-image.png", async (route) => {
    await route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
      contentType: "image/png",
    });
  });
  await mockRecommendationsApi(page, {
    result: mockImageRecommendationResult,
  });

  await submitSearch(page, "tablet");

  await expect(page.getByAltText("Apple iPad Pro M4")).toBeVisible();
  await expect(page.getByText("Product image unavailable")).toHaveCount(0);
});

test("shows image unavailable only when no safe image is present", async ({
  page,
}) => {
  await mockRecommendationsApi(page, { result: mockRecommendationResult });

  await submitSearch(page);

  await expect(page.getByText("Product image unavailable")).toBeVisible();
});

test("prefers an official product page link over a retailer link", async ({
  page,
}) => {
  await mockRecommendationsApi(page, {
    result: mockOfficialProductRecommendationResult,
  });

  await submitSearch(page, "tablet");

  const officialProductLink = page.getByRole("link", {
    name: "View best offer",
  });

  await expect(officialProductLink).toBeVisible();
  await expect(officialProductLink).toHaveAttribute(
    "href",
    "https://www.apple.com/ipad-pro/",
  );
  await expect(officialProductLink).toHaveAttribute("target", "_blank");
  await expect(officialProductLink).toHaveAttribute(
    "rel",
    "noreferrer noopener",
  );
});

test("renders near matches as useful alternatives with the missed requirement", async ({
  page,
}) => {
  await mockRecommendationsApi(page, {
    result: mockNearMatchRecommendationResult,
  });

  await submitSearch(page, "white microwave");

  await expect(page.getByText("Showing 1 exact match")).toBeVisible();
  await page.getByLabel("Dealbreaker strength").fill("2");
  await expect(page.getByText("Near Matches")).toBeVisible();
  await expect(page.getByText("What to check")).toBeVisible();
  await expect(page.getByText("Why we recommend it").last()).toBeVisible();
  await expect(page.getByText("Color: White: Color: Black").first()).toBeVisible();
});

test("shows a safe user-facing alert when the recommendation API fails", async ({
  page,
}) => {
  await mockRecommendationsApi(
    page,
    { error: "Something went wrong while researching. Try again." },
    502,
  );

  await submitSearch(page);

  await expect(
    page.getByText("Something went wrong while researching. Try again."),
  ).toBeVisible();
  await expect(page.getByText(/stack|OPENAI_API_KEY|sk-/i)).toHaveCount(0);
});

test("shows a helpful empty state when mocked results contain no products", async ({
  page,
}) => {
  await mockRecommendationsApi(page, {
    result: mockEmptyRecommendationResult,
  });

  await submitSearch(page, "white microwave under $50");

  await expect(page.getByText("No exact matches found", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "No exact matches found for these requirements. Try removing one requirement or increasing the budget.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Final buying advice")).toBeVisible();
  await expect(
    page.getByText("No mocked products met every requirement."),
  ).toBeVisible();
});

const mockProduct = {
  best_for: "Buyers who want a simple microwave from a known appliance brand.",
  category: "Microwave",
  citations: [
    {
      title: "Retailer product page",
      url: "https://example.com/microwave",
      what_it_supports: "Product details and current offer information.",
    },
  ],
  common_complaints: [],
  confidence_score: 82,
  cons: ["Smaller interior than larger family-size models."],
  estimated_price_range: "$149 to $179",
  metadata: {
    brand: {
      confidence: "High",
      sourceType: "retailer_page",
      sourceUrl: "https://example.com/microwave",
      value: "Whirlpool",
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
    offers: [
      {
        availability: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://example.com/microwave",
          value: "In stock",
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        price: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://example.com/microwave",
          value: 159,
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        priceCurrency: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://example.com/microwave",
          value: "USD",
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        retailer: "Example Retailer",
        url: "https://example.com/microwave",
      },
    ],
    rating: {
      confidence: "Medium",
      sourceType: "retailer_page",
      sourceUrl: "https://example.com/microwave",
      value: 4.4,
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
    reviewCount: {
      confidence: "Medium",
      sourceType: "retailer_page",
      sourceUrl: "https://example.com/microwave",
      value: 321,
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
  },
  name: "Whirlpool Countertop Microwave",
  not_for: ["Shoppers who need a large built-in microwave."],
  price_value_verdict: "Good value for a basic compact microwave.",
  product_image_url: "",
  product_page_url: "https://example.com/microwave",
  pros: ["Compact footprint for smaller kitchens.", "Simple controls."],
  recommendation_type: "Best Match",
  requirementCheck: {
    exactMatch: true,
    failed: [],
    passed: ["Color: Black", "Budget: under $200"],
    unknown: [],
  },
  requirementComparisons: [
    {
      productHas: "Color: Black",
      required: "Color: Black",
      status: "matched",
    },
    {
      productHas: "$159",
      required: "Budget: under $200",
      status: "matched",
    },
  ],
  source_consensus: "Mixed",
  why_recommended:
    "This is the strongest mocked exact match because it has a current offer, basic review data, and a product page citation.",
};

const mockNearMatchProduct = {
  ...mockProduct,
  best_for: "Buyers who can be flexible on color for a compact microwave.",
  category: "Microwave",
  citations: [
    {
      title: "Near match product page",
      url: "https://example.com/near-microwave",
      what_it_supports: "Product color, price, and compact microwave details.",
    },
  ],
  confidence_score: 74,
  cons: ["Only verified in black, not white."],
  matchedRequirements: ["Budget: under $200", "Compact countertop microwave"],
  name: "Black Countertop Microwave",
  near_match_reason:
    "It is a credible compact microwave, but it only missed the requested white finish.",
  price_value_verdict: "Worth considering if color is flexible.",
  product_page_url: "https://example.com/near-microwave",
  pros: ["Compact footprint.", "Simple controls."],
  recommendation_type: "Close Match",
  requirementCheck: {
    exactMatch: false,
    failed: ["Color: White"],
    passed: ["Budget: under $200", "Compact countertop microwave"],
    unknown: [],
  },
  requirementComparisons: [
    {
      productHas: "Color: Black",
      required: "Color: White",
      status: "failed",
    },
    {
      productHas: "$129",
      required: "Budget: under $200",
      status: "matched",
    },
  ],
  source_consensus: "Weak",
  why_recommended:
    "This near match has a cited product page and fits the size and budget, but misses the requested finish.",
};

const mockOfficialProduct = {
  ...mockProduct,
  best_for: "Buyers who want a tablet with a clear official product page.",
  category: "Tablet",
  citations: [
    {
      title: "Retailer product page",
      url: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
      what_it_supports: "Retailer listing and availability.",
    },
  ],
  metadata: {
    brand: {
      confidence: "High",
      sourceType: "manufacturer_page",
      sourceUrl: "https://www.apple.com/ipad-pro/",
      value: "Apple",
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
    canonicalUrl: {
      confidence: "High",
      sourceType: "manufacturer_page",
      sourceUrl: "https://www.apple.com/ipad-pro/",
      value: "https://www.apple.com/ipad-pro/",
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
    offers: [
      {
        availability: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
          value: "In stock",
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        price: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
          value: 999,
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        priceCurrency: {
          confidence: "Medium",
          sourceType: "retailer_page",
          sourceUrl: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
          value: "USD",
          verifiedAt: "2026-06-11T00:00:00.000Z",
        },
        retailer: "Best Buy",
        url: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
      },
    ],
    title: {
      confidence: "High",
      sourceType: "manufacturer_page",
      sourceUrl: "https://www.apple.com/ipad-pro/",
      value: "Apple iPad Pro",
      verifiedAt: "2026-06-11T00:00:00.000Z",
    },
  },
  name: "Apple iPad Pro",
  product_page_url: "https://www.bestbuy.com/site/apple-ipad-pro/123.p",
  why_recommended:
    "This mocked result includes both official and retailer links so the card can choose the official page.",
};

const mockImageProduct = {
  ...mockProduct,
  category: "Tablet",
  metadata: {
    image: {
      confidence: "High",
      sourceType: "serper",
      sourceUrl: "http://localhost:3000/mock-product-image.png",
      value: "http://localhost:3000/mock-product-image.png",
      verifiedAt: "2026-06-12T00:00:00.000Z",
    },
    offers: [],
  },
  name: "Apple iPad Pro M4",
  product_image_url: "http://localhost:3000/mock-product-image.png",
  why_recommended:
    "This mocked result includes a safe product image so the card can render it.",
};

const mockRecommendationResult = {
  assumptions: [],
  exactMatches: [mockProduct],
  final_buying_advice: "The mocked exact match is the only product shown.",
  nearMatches: [],
  premiumAboveBudget: [],
  raw_candidate_count: 1,
  recommendations: [mockProduct],
  searchCoverage: {
    canonicalProductCount: 1,
    enrichedProductCount: 1,
    exactMatchCount: 1,
    executedQueryCount: 1,
    generatedQueryCount: 1,
    nearMatchCount: 0,
    rawCandidateCount: 1,
    sourceTimeouts: 0,
    stageCounts: {
      pass1: 1,
      pass2: 0,
      pass3: 0,
    },
  },
  search_summary: "Mocked UI test result.",
  what_to_avoid: [],
};

const mockOfficialProductRecommendationResult = {
  ...mockRecommendationResult,
  exactMatches: [mockOfficialProduct],
  recommendations: [mockOfficialProduct],
};

const mockImageRecommendationResult = {
  ...mockRecommendationResult,
  exactMatches: [mockImageProduct],
  recommendations: [mockImageProduct],
};

const mockNearMatchRecommendationResult = {
  ...mockRecommendationResult,
  exactMatches: [mockProduct],
  nearMatches: [mockNearMatchProduct],
  recommendations: [mockProduct],
  searchCoverage: {
    ...mockRecommendationResult.searchCoverage,
    nearMatchCount: 1,
  },
};

const mockEmptyRecommendationResult = {
  assumptions: [],
  exactMatches: [],
  final_buying_advice: "No mocked products met every requirement.",
  nearMatches: [],
  premiumAboveBudget: [],
  raw_candidate_count: 0,
  recommendations: [],
  searchCoverage: {
    canonicalProductCount: 0,
    enrichedProductCount: 0,
    exactMatchCount: 0,
    executedQueryCount: 1,
    generatedQueryCount: 1,
    nearMatchCount: 0,
    rawCandidateCount: 0,
    sourceTimeouts: 0,
    stageCounts: {
      pass1: 1,
      pass2: 0,
      pass3: 0,
    },
  },
  search_summary: "Mocked empty UI test result.",
  what_to_avoid: [],
};
