import { expect, test, type Page, type Route } from "@playwright/test";

const runtimeErrors = new WeakMap<Page, string[]>();

const mockResult = {
  recommendations: [
    {
      name: "Example Vacuum X1",
      productPageUrl: "https://example.com/products/vacuum-x1",
    },
  ],
};

const resultHeading = (page: Page) =>
  page.getByRole("heading", { name: "Top product matches", exact: true });

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/hydrated|hydration|didn't match|uncaught/i.test(message.text())) errors.push(message.text());
  });
  // Every application response is mocked. No provider or merchant requests.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      await route.abort();
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      throw new Error(`Unexpected application API request: ${url.pathname}`);
    }
    await route.continue();
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "No runtime or hydration errors").toEqual([]);
});

test("loads the discovery home page without starting a search", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/ReviewRadar/);
  await expect(
    page.getByRole("heading", { name: /Find what[’']s worth buying\./ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Find products", exact: true })).toBeVisible();
  await expect(resultHeading(page)).toHaveCount(0);
  await expect(page.locator(".discovery-hero form")).toHaveCount(1);
  await expect(page.getByText("Smart Features", { exact: true })).toHaveCount(0);
  await expect(page.locator("#search-panel")).toHaveCount(0);
});

test("offers a working keyboard skip link", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("validates empty and vague categories before calling the API", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Find products", exact: true }).click();
  await expect(page.getByText("Please enter a product category.")).toBeVisible();
  await expect(page.getByLabel("Product category", { exact: true })).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Product category", { exact: true }).fill("anything");
  await page.getByRole("button", { name: "Find products", exact: true }).click();
  await expect(
    page.getByText("Please enter a more specific product category."),
  ).toBeVisible();
});

test("submits trimmed constraints and renders only the minimal product card in results", async ({ page }) => {
  let requestBody: Record<string, unknown> = {};
  await page.route("**/api/recommendations", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: { result: mockResult } });
  });
  await page.goto("/");
  await page.getByLabel("Product category", { exact: true }).fill("  cordless vacuum  ");
  await page.getByLabel("Budget", { exact: true }).fill("  under $300  ");
  await page.getByLabel("Important Details", { exact: true }).fill("  must include a battery  ");
  await page.getByRole("button", { name: "Find products", exact: true }).click();

  await expect(resultHeading(page)).toBeVisible();
  await expect(page.getByRole("form", { name: "Product search" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Find products", exact: true })).toBeEnabled();
  await expect(page.locator("#results-panel")).toHaveCSS("background-image", /landing-marble\.png/);
  await expect.poll(() => page.evaluate(() => document.getElementById("results-panel")!.getBoundingClientRect().top)).toBeLessThan(5);
  expect(await page.locator(".discovery-hero").count()).toBe(1);
  const productCard = page.getByRole("article");
  await expect(productCard).toHaveText("Example Vacuum X1View product");
  await expect(productCard.getByRole("img", { name: "Product image unavailable" })).toBeVisible();
  const productLink = productCard.getByRole("link", { name: /^View product/ });
  await expect(productLink).toHaveAttribute("href", "https://example.com/products/vacuum-x1");
  await expect(productLink).toHaveAttribute("target", "_blank");
  await expect(productLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText(/why recommended|needs verification/i)).toHaveCount(0);
  expect(requestBody).toMatchObject({
    budget: "under $300",
    priorities: "must include a battery",
    query: "cordless vacuum",
  });
});

test("cancels loading results back to the form with the brief retained", async ({ page }) => {
  let releaseResult!: () => void;
  const resultGate = new Promise<void>((resolve) => { releaseResult = resolve; });
  let finishRequest!: () => void;
  const handled = new Promise<void>((resolve) => { finishRequest = resolve; });
  await page.route("**/api/recommendations", async (route) => {
    await resultGate;
    try {
      await route.fulfill({ json: { result: mockResult } });
    } catch {
      // Chromium may discard the aborted mock before fulfillment.
    } finally {
      finishRequest();
    }
  });
  await page.goto("/");
  await page.getByLabel("Product category", { exact: true }).fill("cordless vacuum");
  await page.getByLabel("Budget", { exact: true }).fill("under $300");
  await page.getByRole("button", { name: "Find products", exact: true }).click();

  await expect(page.locator("#results-heading")).toBeVisible();
  await expect(page.getByRole("region", { name: "Product matches" })).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("form", { name: "Product search" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Find products", exact: true })).toBeDisabled();
  await expect(page.locator("#results-panel")).toHaveCSS("background-image", /landing-marble\.png/);
  await expect.poll(() => page.evaluate(() => document.getElementById("results-panel")!.getBoundingClientRect().top)).toBeLessThan(5);
  expect(await page.locator(".discovery-hero").count()).toBe(1);
  await page.getByRole("button", { name: "Cancel search", exact: true }).click();
  await expect(page.getByLabel("Product category", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Product category", { exact: true })).toHaveValue("cordless vacuum");
  await expect(page.getByLabel("Budget", { exact: true })).toHaveValue("under $300");
  await expect(page.getByRole("status")).toContainText("Search cancelled");

  releaseResult();
  await handled;
  await expect(page.getByRole("button", { name: "Find products", exact: true })).toBeVisible();
  await expect(page.locator("#results-heading")).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("empty research results keep an editable brief without implying commerce verification", async ({ page }) => {
  await page.route("**/api/recommendations", async (route) => {
    await route.fulfill({ json: { result: { recommendations: [] } } });
  });
  await page.goto("/");
  await expect(page.locator("#budget-helper")).toHaveText(
    "Prices in USD. Firm limits exclude over-budget or unverified prices.",
  );
  await page.getByLabel("Product category", { exact: true }).fill("cordless vacuum");
  await page.getByRole("button", { name: "Find products", exact: true }).click();

  await expect(page.getByRole("heading", { name: "No recommendations found", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^View product/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Edit search", exact: true }).click();
  await expect(page.getByLabel("Product category", { exact: true })).toHaveValue("cordless vacuum");
});

test("edit, back to results, rerun and new search retain the right brief", async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/recommendations", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { result: mockResult } });
  });
  await page.goto("/");
  await page.getByLabel("Product category", { exact: true }).fill("cordless vacuum");
  await page.getByLabel("Budget", { exact: true }).fill("under $300");
  await page.getByLabel("Important Details", { exact: true }).fill("must include a battery");
  await page.getByRole("button", { name: "Find products", exact: true }).click();
  await expect(resultHeading(page)).toBeVisible();

  await page.getByRole("button", { name: "Edit search", exact: true }).click();
  await expect(page.getByLabel("Product category", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Product category", { exact: true })).toHaveValue("cordless vacuum");
  await expect(page.getByLabel("Budget", { exact: true })).toHaveValue("under $300");
  await expect(page.getByLabel("Important Details", { exact: true })).toHaveValue("must include a battery");
  // Results remain on the page; editing again must still return focus to the form.
  await page.getByRole("button", { name: "Edit search", exact: true }).click();
  await expect(page.getByLabel("Product category", { exact: true })).toBeFocused();
  await page.getByLabel("Budget", { exact: true }).fill("under $250");
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await expect(resultHeading(page)).toBeVisible();
  await expect(page.getByText("under $300", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);

  await page.getByRole("button", { name: "Edit search", exact: true }).click();
  await expect(page.getByLabel("Budget", { exact: true })).toHaveValue("under $250");
  await page.getByRole("button", { name: "Find products", exact: true }).click();
  await expect(resultHeading(page)).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({ budget: "under $250", query: "cordless vacuum", priorities: "must include a battery" });

  await page.getByRole("button", { name: "New search", exact: true }).click();
  await expect(page.getByLabel("Product category", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Product category", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Budget", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Important Details", { exact: true })).toHaveValue("");
  await expect(resultHeading(page)).toHaveCount(0);
  await expect(page.locator(".discovery-hero form")).toHaveCount(1);
  await expect(page.getByText("Smart Features", { exact: true })).toHaveCount(0);
  await expect(page.locator("#search-panel")).toHaveCount(0);
  expect(requests).toHaveLength(2);
});

for (const viewport of [
  { label: "desktop", width: 1280, height: 900 },
  { label: "mobile", width: 390, height: 844 },
  { label: "narrow mobile", width: 320, height: 740 },
  { label: "tablet", width: 820, height: 1180 },
]) {
  test(`shows matched images and keeps missing or broken image products on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const products = Array.from({ length: 5 }, (_, index) => ({
      name: `Example Headphones X${index + 1}`,
      productPageUrl: `https://example.com/headphones/x${index + 1}`,
      ...(index < 3 ? { image: {
        url: `https://encrypted-tbn0.gstatic.com/shopping?q=tbn:${index}`,
        sourceUrl: `https://example.com/headphones/x${index + 1}`,
        sourceTitle: `Example Headphones X${index + 1}`,
      } } : {}),
    }));
    const imageRequests: string[] = [];
    await page.route(/^https:\/\/encrypted-tbn0\.gstatic\.com\/shopping\?/, async route => {
      imageRequests.push(route.request().url());
      if (route.request().url().endsWith("tbn:2")) return route.abort();
      await route.fulfill({ contentType: "image/png", body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64",
      ) });
    });
    await page.route("**/api/recommendations", route => route.fulfill({ json: { result: { recommendations: products } } }));
    await page.goto("/");
    await page.getByLabel("Product category", { exact: true }).fill("headphones");
    await page.getByRole("button", { name: "Find products", exact: true }).click();
    await expect(resultHeading(page)).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(5);
    for (const [index, product] of products.entries()) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByRole("heading")).toHaveText(product.name);
      await expect(card.getByRole("link")).toHaveAttribute("href", product.productPageUrl);
      if (index < 2) {
        const image = card.getByRole("img", { name: product.name, exact: true });
        await expect(image).toHaveAttribute("src", product.image!.url);
        await expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
        await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(1);
      } else {
        await expect(card.getByRole("img", { name: "Product image unavailable" })).toBeVisible();
      }
    }
    expect(imageRequests).toHaveLength(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await expect(page.locator("#results-panel")).toHaveCSS("background-image", /landing-marble\.png/);
  });

  test(`renders the simple shortlist on ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/recommendations", async (route) => {
      await route.fulfill({ json: { result: mockResult } });
    });
    await page.goto("/");
    await expect(page.locator(".artwork-ready .landing-still")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `output/ranking-ui-main/landing-${viewport.width}.png`, fullPage: true, animations: "disabled", caret: "initial" });
    await page.getByLabel("Product category", { exact: true }).fill("cordless vacuum");
    await page.getByRole("button", { name: "Find products", exact: true }).click();
    await expect(resultHeading(page)).toBeVisible();
    await page.getByRole("article").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/ranking-ui-main/results-${viewport.width}.png`, fullPage: true, animations: "disabled", caret: "initial" });
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /^View product/ })).toBeVisible();
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content).toBe(widths.viewport);
  });
}

test("product entrance settles while search stays usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".artwork-ready")).toHaveCount(1);
  const pieces = page.locator("[data-piece]");
  await expect(pieces).toHaveCount(14);
  const motion = await pieces.evaluateAll((nodes) => nodes.map((node) => {
    const animation = node.getAnimations()[0];
    animation.pause();
    animation.currentTime = 0;
    return { opacity: getComputedStyle(node).opacity, duration: animation.effect?.getTiming().duration };
  }));
  expect(motion.every((piece) => piece.opacity === "0" && piece.duration === 700)).toBe(true);
  await page.getByLabel("Product category", { exact: true }).fill("coffee maker");
  await expect(page.getByLabel("Product category", { exact: true })).toHaveValue("coffee maker");
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
  await expect(page.locator(".landing-still")).toHaveCSS("opacity", "1");
  expect(await pieces.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).transform === "matrix(1, 0, 0, 1, 0, 0)"))).toBe(true);
});

test("reduced motion shows the final photograph without an entrance", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".landing-still")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-piece]")).toHaveCount(0);
  await expect(page.getByLabel("Product category", { exact: true })).toBeVisible();
});

test("failed animation assets fall back to the original photograph", async ({ page }) => {
  await page.route("**/images/landing-marble.png", route => route.abort());
  await page.goto("/");
  await expect(page.locator(".artwork-failed .landing-still")).toHaveCSS("opacity", "1");
  await expect(page.getByLabel("Product category", { exact: true })).toBeVisible();
});

test("approved homepage keeps its typography and transparent olive-focus form", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero-copy h1")).toHaveCSS("font-family", 'Fraunces, Georgia, serif');
  expect(await page.evaluate(() => document.fonts.check('750 72px Fraunces'))).toBe(true);
  await expect(page.getByRole("form", { name: "Product search" })).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  for (const field of ["Product category", "Budget", "Important Details"]) {
    const input = page.getByLabel(field, { exact: true });
    await input.focus();
    await expect(input).toHaveCSS("outline-color", "rgb(102, 113, 60)");
  }
});

test("cancelled searches cannot overwrite a later completed search", async ({ page }) => {
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let firstFinished!: () => void;
  const firstHandled = new Promise<void>((resolve) => { firstFinished = resolve; });
  let requests = 0;
  await page.route("**/api/recommendations", async (route) => {
    requests += 1;
    if (requests === 1) {
      await firstGate;
      try {
        await fulfillResult(route, { recommendations: [{ ...mockResult.recommendations[0], name: "Stale first result" }] });
      } catch {
        // Chromium can discard an aborted route before its mock is fulfilled.
      } finally {
        firstFinished();
      }
      return;
    }
    await fulfillResult(route);
  });
  await page.goto("/");
  await startSearch(page);
  await expect(page.getByRole("heading", { name: "Finding your matches", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel search", exact: true }).click();
  await expect(page.getByRole("button", { name: "Find products", exact: true })).toBeVisible();
  await startSearch(page, "upright vacuum");
  await expect(resultHeading(page)).toBeVisible();
  releaseFirst();
  await firstHandled;
  await expect(page.getByText("Example Vacuum X1", { exact: true })).toBeVisible();
  await expect(page.getByText("Stale first result", { exact: true })).toHaveCount(0);
  expect(requests).toBe(2);
});


for (const failure of ["server", "malformed"] as const) {
  test(`${failure} response stays distinct from no matches and can retry the same brief`, async ({ page }) => {
    const requests: Record<string, unknown>[] = [];
    await page.route("**/api/recommendations", async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length > 1) return fulfillResult(route);
      if (failure === "server") {
        await route.fulfill({ status: 502, json: { error: "Product search is temporarily unavailable. Please try again shortly." } });
      } else {
        await route.fulfill({ contentType: "text/html", body: "<html>Invalid response</html>" });
      }
    });
    await page.goto("/");
    await startSearch(page);
    await expect(page.getByRole("heading", { name: "Search interrupted", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(failure === "server" ? "temporarily unavailable" : "unexpected response");
    await expect(page.getByRole("heading", { name: "No recommendations found", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(resultHeading(page)).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
  });
}


async function fulfillResult(route: Route, result = mockResult) { await route.fulfill({ json: { result } }); }
async function startSearch(page: Page, category = "cordless vacuum") { await page.getByLabel("Product category", { exact: true }).fill(category); await page.getByRole("button", { name: "Find products", exact: true }).click(); }
