import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  citationUrlIsVerified,
  collectVerifiedSourceUrls,
} from "../lib/responseSources.ts";

describe("same-response source extraction", () => {
  it("collects search sources, opened pages, find-in-page targets, and URL citations", () => {
    const urls = collectVerifiedSourceUrls({
      output: [
        {
          type: "web_search_call",
          action: {
            type: "search",
            sources: [{ url: "https://one.example/product?utm_source=test" }],
          },
        },
        {
          type: "web_search_call",
          action: { type: "open_page", url: "https://two.example/product/" },
        },
        {
          type: "web_search_call",
          action: {
            type: "find_in_page",
            pattern: "price",
            url: "https://three.example/product#offer",
          },
        },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              annotations: [
                { type: "url_citation", url: "https://four.example/review" },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(citationUrlIsVerified("https://one.example/product", urls), true);
    assert.equal(citationUrlIsVerified("https://two.example/product", urls), true);
    assert.equal(citationUrlIsVerified("https://three.example/product", urls), true);
    assert.equal(citationUrlIsVerified("https://four.example/review", urls), true);
  });

  it("ignores URL-looking strings outside supported response source locations", () => {
    const urls = collectVerifiedSourceUrls({
      input: "https://untrusted.example/from-prompt",
      output_text: "https://invented.example/from-model-text",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "https://invented.example/from-message-text",
              annotations: [{ type: "other", url: "https://ignored.example/annotation" }],
            },
          ],
        },
      ],
    });
    assert.equal(urls.size, 0);
  });
});
