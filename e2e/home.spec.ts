import { expect, test, type Page } from "@playwright/test";

const mockResult = {
  recommendations: [
    {
      category: "cordless vacuum",
      imageUrl: null,
      name: "Example Vacuum X1",
      price: { amount: 199.99, currency: "USD" },
      productPageUrl: "https://example.com/products/vacuum-x1",
    },
  ],
};

async function blockRecommendations(page: Page) {
  await page.route("**/api/recommendations", async () => {
    throw new Error("Unexpected recommendations request.");
  });
}

test("loads the product-matching home page without starting a search", async ({
  page,
}) => {
  await blockRecommendations(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/ReviewRadar/);
  await expect(
    page.getByRole("heading", { name: /Find the right product/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find products" })).toBeVisible();
});

test("offers a working keyboard skip link", async ({ page }) => {
  await blockRecommendations(page);
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("validates empty and vague categories before calling the API", async ({
  page,
}) => {
  await blockRecommendations(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Find products" }).click();
  await expect(page.getByText("Please enter a product category.")).toBeVisible();

  await page.getByLabel("Product category").fill("anything");
  await page.getByRole("button", { name: "Find products" }).click();
  await expect(
    page.getByText("Please enter a more specific product category."),
  ).toBeVisible();
});

test("submits trimmed constraints and renders only the minimal product card", async ({
  page,
}) => {
  let requestBody: Record<string, unknown> = {};
  await page.route("**/api/recommendations", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: mockResult }),
    });
  });
  await page.goto("/");
  await page.getByLabel("Product category").fill("  cordless vacuum  ");
  await page.getByLabel("Budget").fill("  under $300  ");
  await page.getByLabel("Important Details").fill("  must include a battery  ");
  await page.getByRole("button", { name: "Find products" }).click();

  await expect(page.getByText("Example Vacuum X1")).toBeVisible();
  await expect(page.getByText("$199.99")).toBeVisible();
  const productLink = page.getByRole("link", { name: "View product" });
  await expect(productLink).toHaveAttribute(
    "href",
    "https://example.com/products/vacuum-x1",
  );
  await expect(productLink).toHaveAttribute("target", "_blank");
  await expect(page.getByText(/why recommended/i)).toHaveCount(0);
  await expect(page.getByText(/needs verification/i)).toHaveCount(0);
  expect(requestBody).toMatchObject({
    budget: "under $300",
    priorities: "must include a battery",
    query: "cordless vacuum",
  });
});

test("shows loading cards and lets the user cancel", async ({ page }) => {
  await page.route("**/api/recommendations", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: mockResult }),
    });
  });
  await page.goto("/");
  await page.getByLabel("Product category").fill("cordless vacuum");
  await page.getByRole("button", { name: "Find products" }).click();

  await expect(page.getByRole("heading", { name: "Top product matches" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel search" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel search" }).click();
  await expect(page.getByRole("button", { name: "Find products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top product matches" })).toHaveCount(0);
});

for (const viewport of [
  { label: "desktop", width: 1280, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`renders the simple shortlist on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/recommendations", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ result: mockResult }),
      });
    });
    await page.goto("/");
    await page.getByLabel("Product category").fill("cordless vacuum");
    await page.getByRole("button", { name: "Find products" }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "View product" })).toBeVisible();
  });
}
