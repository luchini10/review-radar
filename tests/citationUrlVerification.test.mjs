import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectReachableCitationUrls } from "../lib/citationUrlVerification.ts";

function resultFor(...urls) {
  return {
    recommendations: [
      {
        citations: urls.map((url) => ({ url })),
      },
    ],
  };
}

function htmlTransportResponse(
  status = 200,
  headers = { "content-type": "text/html; charset=utf-8" },
) {
  return {
    status,
    headers,
    body: Buffer.from("<html><title>reachable</title></html>"),
  };
}

async function withGlobalFetch(mock, run) {
  const originalFetch = global.fetch;
  global.fetch = mock;
  try {
    return await run();
  } finally {
    global.fetch = originalFetch;
  }
}

describe("legacy citation URL public-network boundary", () => {
  it("blocks literal link-local and private-DNS destinations before transport", async () => {
    const directFetches = [];
    let transportCalls = 0;
    const dependencies = {
      resolveHost: async (hostname) =>
        hostname === "metadata.example.test"
          ? ["127.0.0.1"]
          : hostname === "mapped.example.test"
            ? ["::ffff:7f00:1"]
          : [hostname],
      transport: async () => {
        transportCalls += 1;
        return htmlTransportResponse();
      },
    };

    const reachable = await withGlobalFetch(
      async (input) => {
        directFetches.push(String(input));
        return new Response("ok", { status: 200 });
      },
      () =>
        collectReachableCitationUrls(
          resultFor(
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/latest/meta-data/",
            "https://metadata.example.test/latest",
            "https://mapped.example.test/latest",
          ),
          dependencies,
        ),
    );

    assert.deepEqual([...reachable], []);
    assert.deepEqual(directFetches, []);
    assert.equal(transportCalls, 0);
  });

  it("revalidates every redirect and blocks a public-to-private hop", async () => {
    const directFetches = [];
    const transportedHosts = [];
    const dependencies = {
      resolveHost: async (hostname) =>
        hostname === "public.example.test"
          ? ["93.184.216.34"]
          : ["169.254.169.254"],
      transport: async ({ url }) => {
        transportedHosts.push(url.hostname);
        return {
          status: 302,
          headers: { location: "http://metadata.example.test/latest" },
          body: new Uint8Array(),
        };
      },
    };

    const reachable = await withGlobalFetch(
      async (input) => {
        directFetches.push(String(input));
        return new Response("redirected", { status: 200 });
      },
      () =>
        collectReachableCitationUrls(
          resultFor("https://public.example.test/product"),
          dependencies,
        ),
    );

    assert.deepEqual([...reachable], []);
    assert.deepEqual(directFetches, []);
    assert.deepEqual(transportedHosts, ["public.example.test"]);
  });

  it("rejects non-HTTP, credential-bearing, and non-default-port URLs", async () => {
    const directFetches = [];
    let transportCalls = 0;
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => {
        transportCalls += 1;
        return htmlTransportResponse();
      },
    };

    const reachable = await withGlobalFetch(
      async (input) => {
        directFetches.push(String(input));
        return new Response("ok", { status: 200 });
      },
      () =>
        collectReachableCitationUrls(
          resultFor(
            "file:///etc/passwd",
            "ftp://public.example.test/product",
            "https://user:password@public.example.test/product",
            "https://public.example.test:8443/product",
          ),
          dependencies,
        ),
    );

    assert.deepEqual([...reachable], []);
    assert.deepEqual(directFetches, []);
    assert.equal(transportCalls, 0);
  });

  it("preserves the established bot-wall, missing-page, and timeout policy", async () => {
    const statuses = new Map([
      ["missing.example.test", 404],
      ["gone.example.test", 410],
      ["forbidden.example.test", 403],
      ["method.example.test", 405],
      ["limited.example.test", 429],
      ["botwall.example.test", 503],
      ["failed.example.test", 500],
    ]);
    const urls = [
      ...[...statuses.keys()].map((host) => `https://${host}/product`),
      "https://timeout.example.test/product",
    ];
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async ({ url }) => {
        if (url.hostname === "timeout.example.test") {
          const error = new Error("timeout");
          error.name = "AbortError";
          throw error;
        }
        const response = htmlTransportResponse(statuses.get(url.hostname));
        return [404, 410].includes(response.status)
          ? { ...response, bodyTruncated: true }
          : response;
      },
    };

    const reachable = await withGlobalFetch(
      async (input) => {
        const url = new URL(String(input));
        if (url.hostname === "timeout.example.test") {
          const error = new Error("timeout");
          error.name = "AbortError";
          throw error;
        }
        return new Response("x", { status: statuses.get(url.hostname) });
      },
      () => collectReachableCitationUrls(resultFor(...urls), dependencies),
    );

    assert.deepEqual(
      [...reachable].sort(),
      [
        "https://botwall.example.test/product",
        "https://forbidden.example.test/product",
        "https://limited.example.test/product",
        "https://method.example.test/product",
        "https://timeout.example.test/product",
      ].sort(),
    );
  });

  it("caps concurrent destination checks without changing result order", async () => {
    const urls = Array.from(
      { length: 9 },
      (_, index) => `https://product-${index}.example.test/item`,
    );
    let active = 0;
    let maximumActive = 0;
    const hold = async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    };
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async () => {
        await hold();
        return htmlTransportResponse();
      },
    };

    const reachable = await withGlobalFetch(
      async () => {
        await hold();
        return new Response("ok", { status: 200 });
      },
      () => collectReachableCitationUrls(resultFor(...urls), dependencies),
    );

    assert.deepEqual([...reachable], urls);
    assert.ok(maximumActive <= 4, `expected <=4 concurrent checks, saw ${maximumActive}`);
  });

  it("bounds redirects and response bodies while preserving public reachability", async () => {
    const directFetches = [];
    const attemptsByKind = { redirect: 0, oversized: 0, unsupported: 0 };
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async ({ url }) => {
        if (url.hostname.startsWith("redirect-")) {
          attemptsByKind.redirect += 1;
          const current = Number.parseInt(url.hostname.split("-")[1], 10);
          return {
            status: 302,
            headers: {
              location: `https://redirect-${current + 1}.example.test/product`,
            },
            body: new Uint8Array(),
          };
        }
        if (url.hostname === "oversized.example.test") {
          attemptsByKind.oversized += 1;
          return {
            status: 200,
            headers: { "content-type": "text/html" },
            body: Buffer.alloc(5000),
          };
        }
        attemptsByKind.unsupported += 1;
        return {
          status: 200,
          headers: { "content-type": "image/png" },
          body: Buffer.from("png"),
        };
      },
    };
    const urls = [
      "https://redirect-0.example.test/product",
      "https://oversized.example.test/product",
      "https://unsupported.example.test/product",
    ];

    const reachable = await withGlobalFetch(
      async (input) => {
        directFetches.push(String(input));
        return new Response("ok", { status: 200 });
      },
      () => collectReachableCitationUrls(resultFor(...urls), dependencies),
    );

    assert.deepEqual([...reachable], urls);
    assert.deepEqual(attemptsByKind, {
      redirect: 3,
      oversized: 1,
      unsupported: 1,
    });
    assert.deepEqual(directFetches, []);
  });

  it("propagates request cancellation instead of treating it as a reachable timeout", async () => {
    const controller = new AbortController();
    let transportCalls = 0;
    let transportSignal;
    const dependencies = {
      resolveHost: async () => ["93.184.216.34"],
      transport: async ({ signal }) => {
        transportCalls += 1;
        transportSignal = signal;
        controller.abort();
        return htmlTransportResponse();
      },
    };

    await assert.rejects(
      () =>
        collectReachableCitationUrls(
          resultFor("https://public.example.test/product"),
          dependencies,
          { signal: controller.signal },
        ),
      (error) => error?.name === "RequestCancelledError",
    );
    assert.equal(transportCalls, 1);
    assert.equal(transportSignal?.aborted, true);
  });
});
