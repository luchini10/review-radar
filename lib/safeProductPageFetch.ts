import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import {
  forwardAbortSignal,
  RequestCancelledError,
  throwIfRequestCancelled,
} from "./requestCancellation.ts";

export type SafeProductPageFetchFailureReason =
  | "credentials_forbidden"
  | "host_resolution_failed"
  | "http_status_not_usable"
  | "invalid_url"
  | "non_default_port"
  | "non_public_address"
  | "redirect_limit_exceeded"
  | "redirect_missing_location"
  | "request_failed"
  | "request_timeout"
  | "response_too_large"
  | "unsupported_content_type";

export type SafeProductPageFetchResult =
  | {
      body: string;
      byteLength: number;
      contentType: string;
      finalUrl: string;
      ok: true;
      redirectCount: number;
      requestedUrl: string;
      status: number;
    }
  | {
      body?: never;
      byteLength: number;
      contentType: string | null;
      finalUrl: string | null;
      ok: false;
      reason: SafeProductPageFetchFailureReason;
      redirectCount: number;
      requestedUrl: string;
      status: number | null;
    };

export type SafeProductPageFetchConfig = {
  allowedContentTypes: readonly string[];
  maxBytes: number;
  maxRedirects: number;
  signal?: AbortSignal;
  timeoutMs: number;
};

export type SafeProductPageTransportResponse = {
  body: Uint8Array;
  bodyTruncated?: boolean;
  headers: Record<string, string | string[] | undefined>;
  status: number;
};

export type SafeProductPageFetchDependencies = {
  resolveHost: (hostname: string) => Promise<string[]>;
  transport: (input: {
    accept?: string;
    address: string;
    maxBytes: number;
    signal: AbortSignal;
    timeoutMs: number;
    url: URL;
  }) => Promise<SafeProductPageTransportResponse>;
};

function parseIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 255,
    )
  ) {
    return null;
  }
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(value: number, base: string, prefix: number) {
  const baseValue = parseIpv4(base);
  if (baseValue === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function parseIpv6Segments(address: string) {
  let value = address;
  const finalColon = value.lastIndexOf(":");
  const finalToken = value.slice(finalColon + 1);
  if (finalToken.includes(".")) {
    const ipv4 = parseIpv4(finalToken);
    if (ipv4 === null) return null;
    value = `${value.slice(0, finalColon)}:${((ipv4 >>> 16) & 0xffff).toString(16)}:${(
      ipv4 & 0xffff
    ).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }
  const expanded = [
    ...head,
    ...Array.from({ length: Math.max(0, missing) }, () => "0"),
    ...tail,
  ].map((segment) => Number.parseInt(segment, 16));
  return expanded.length === 8 && expanded.every(Number.isFinite)
    ? expanded
    : null;
}

export function isPublicProductPageAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const kind = isIP(normalized);
  if (kind === 4) {
    const value = parseIpv4(normalized);
    return (
      value !== null &&
      !BLOCKED_IPV4_RANGES.some(([base, prefix]) =>
        inIpv4Range(value, base, prefix),
      )
    );
  }
  if (kind !== 6) return false;
  const segments = parseIpv6Segments(normalized);
  if (!segments) return false;
  const embedsIpv4 =
    segments.slice(0, 6).every((segment) => segment === 0) ||
    (segments.slice(0, 5).every((segment) => segment === 0) &&
      segments[5] === 0xffff);
  if (embedsIpv4) {
    const high = segments[6];
    const low = segments[7];
    return isPublicProductPageAddress(
      `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`,
    );
  }
  const [first, second] = segments;
  if (first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2002 || first === 0x3fff) return false;
  if (
    first === 0x2001 &&
    (second === 0 ||
      second === 2 ||
      (second >= 0x10 && second <= 0x2f) ||
      second === 0xdb8)
  ) {
    return false;
  }
  return true;
}

function parseSafeUrl(value: string): URL | SafeProductPageFetchFailureReason {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "invalid_url";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "invalid_url";
  }
  if (parsed.username || parsed.password) return "credentials_forbidden";
  if (
    parsed.port &&
    !(
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    )
  ) {
    return "non_default_port";
  }
  parsed.hash = "";
  return parsed;
}

function hostnameWithoutIpv6Brackets(hostname: string) {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
) {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
  return Array.isArray(entry) ? entry[0] || "" : entry || "";
}

function declaredBodyExceedsLimit(
  headers: Record<string, string | string[] | undefined>,
  maxBytes: number,
) {
  const value = headerValue(headers, "content-length").trim();
  if (!/^\d+$/.test(value)) return false;
  const byteLength = Number(value);
  return !Number.isSafeInteger(byteLength) || byteLength > maxBytes;
}

function abortError() {
  const error = new Error("request_timeout");
  error.name = "AbortError";
  return error;
}

function awaitStage<T>(start: () => Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortError()));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    let pending: Promise<T>;
    try {
      pending = start();
    } catch (error) {
      finish(() => reject(error));
      return;
    }
    pending.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    );
  });
}

function failure(input: {
  byteLength?: number;
  contentType?: string | null;
  currentUrl?: URL | null;
  reason: SafeProductPageFetchFailureReason;
  redirects: number;
  requestedUrl: string;
  status?: number | null;
}): SafeProductPageFetchResult {
  return {
    byteLength: input.byteLength ?? 0,
    contentType: input.contentType ?? null,
    finalUrl: input.currentUrl?.toString() || null,
    ok: false,
    reason: input.reason,
    redirectCount: input.redirects,
    requestedUrl: input.requestedUrl,
    status: input.status ?? null,
  };
}

export async function fetchSafeProductPage(
  requestedUrl: string,
  dependencies: SafeProductPageFetchDependencies,
  config: SafeProductPageFetchConfig,
): Promise<SafeProductPageFetchResult> {
  throwIfRequestCancelled(config.signal);
  let currentValue = requestedUrl;
  let redirects = 0;

  while (true) {
    throwIfRequestCancelled(config.signal);
    const parsed = parseSafeUrl(currentValue);
    if (typeof parsed === "string") {
      return failure({ requestedUrl, redirects, reason: parsed });
    }

    const controller = new AbortController();
    const removeAbortListener = forwardAbortSignal(config.signal, controller);
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    let stage: "resolution" | "transport" = "resolution";
    let response: SafeProductPageTransportResponse;
    try {
      const addresses = await awaitStage(
        () =>
          dependencies.resolveHost(
            hostnameWithoutIpv6Brackets(parsed.hostname),
          ),
        controller.signal,
      );
      if (addresses.length === 0) {
        return failure({
          currentUrl: parsed,
          reason: "host_resolution_failed",
          redirects,
          requestedUrl,
        });
      }
      if (addresses.some((address) => !isPublicProductPageAddress(address))) {
        return failure({
          currentUrl: parsed,
          reason: "non_public_address",
          redirects,
          requestedUrl,
        });
      }
      stage = "transport";
      response = await awaitStage(
        () =>
          dependencies.transport({
            address: addresses[0],
            maxBytes: config.maxBytes,
            signal: controller.signal,
            timeoutMs: config.timeoutMs,
            url: parsed,
          }),
        controller.signal,
      );
    } catch (error) {
      if (config.signal?.aborted) throw new RequestCancelledError(error);
      const reason: SafeProductPageFetchFailureReason =
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
          ? "request_timeout"
          : stage === "resolution"
            ? "host_resolution_failed"
            : error instanceof Error && error.message === "response_too_large"
              ? "response_too_large"
              : "request_failed";
      return failure({
        currentUrl: parsed,
        reason,
        redirects,
        requestedUrl,
      });
    } finally {
      clearTimeout(timeout);
      removeAbortListener();
    }

    const location = headerValue(response.headers, "location");
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!location) {
        return failure({
          currentUrl: parsed,
          reason: "redirect_missing_location",
          redirects,
          requestedUrl,
          status: response.status,
        });
      }
      if (redirects >= config.maxRedirects) {
        return failure({
          currentUrl: parsed,
          reason: "redirect_limit_exceeded",
          redirects,
          requestedUrl,
          status: response.status,
        });
      }
      try {
        currentValue = new URL(location, parsed).toString();
      } catch {
        return failure({
          currentUrl: parsed,
          reason: "invalid_url",
          redirects,
          requestedUrl,
          status: response.status,
        });
      }
      redirects += 1;
      continue;
    }

    const contentType = headerValue(response.headers, "content-type")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (response.status < 200 || response.status >= 300) {
      return failure({
        byteLength: response.body.byteLength,
        contentType,
        currentUrl: parsed,
        reason: "http_status_not_usable",
        redirects,
        requestedUrl,
        status: response.status,
      });
    }
    if (
      response.bodyTruncated ||
      response.body.byteLength > config.maxBytes ||
      declaredBodyExceedsLimit(response.headers, config.maxBytes)
    ) {
      return failure({
        byteLength: response.body.byteLength,
        contentType,
        currentUrl: parsed,
        reason: "response_too_large",
        redirects,
        requestedUrl,
        status: response.status,
      });
    }
    if (
      !config.allowedContentTypes.some(
        (allowed) =>
          contentType === allowed || contentType.startsWith(`${allowed};`),
      )
    ) {
      return failure({
        byteLength: response.body.byteLength,
        contentType,
        currentUrl: parsed,
        reason: "unsupported_content_type",
        redirects,
        requestedUrl,
        status: response.status,
      });
    }
    return {
      body: Buffer.from(response.body).toString("utf8"),
      byteLength: response.body.byteLength,
      contentType,
      finalUrl: parsed.toString(),
      ok: true,
      redirectCount: redirects,
      requestedUrl,
      status: response.status,
    };
  }
}

export async function resolveProductPageHost(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(addresses.map((entry) => entry.address))];
}

export function nodeProductPageTransport(input: {
  accept?: string;
  address: string;
  maxBytes: number;
  signal: AbortSignal;
  timeoutMs: number;
  url: URL;
}): Promise<SafeProductPageTransportResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let removeAbortListener = () => {};
    const finishResolve = (value: SafeProductPageTransportResponse) => {
      if (settled) return;
      settled = true;
      removeAbortListener();
      resolve(value);
    };
    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      removeAbortListener();
      reject(error);
    };
    const request = (input.url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        headers: {
          Accept: input.accept ?? "text/html,application/xhtml+xml;q=0.9",
          "Accept-Encoding": "identity",
          Host: input.url.host,
          "User-Agent": "ReviewRadar/0.1 product-page verifier",
        },
        hostname: input.address,
        method: "GET",
        path: `${input.url.pathname}${input.url.search}`,
        port: input.url.port || (input.url.protocol === "https:" ? 443 : 80),
        protocol: input.url.protocol,
        servername: hostnameWithoutIpv6Brackets(input.url.hostname),
      },
      (response) => {
        const chunks: Buffer[] = [];
        let byteLength = 0;
        const finishResponse = (body: Uint8Array, bodyTruncated = false) =>
          finishResolve({
            body,
            ...(bodyTruncated ? { bodyTruncated: true } : {}),
            headers: response.headers,
            status: response.statusCode || 0,
          });
        response.on("error", finishReject);
        if (declaredBodyExceedsLimit(response.headers, input.maxBytes)) {
          finishResponse(new Uint8Array(), true);
          response.destroy();
          return;
        }
        response.on("data", (chunk: Buffer | string) => {
          if (settled) return;
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          byteLength += buffer.byteLength;
          if (byteLength > input.maxBytes) {
            finishResponse(Buffer.concat(chunks), true);
            response.destroy();
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => finishResponse(Buffer.concat(chunks)));
      },
    );
    const abortRequest = () => {
      const error = abortError();
      finishReject(error);
      request.destroy(error);
    };
    removeAbortListener = () =>
      input.signal.removeEventListener("abort", abortRequest);
    if (input.signal.aborted) {
      abortRequest();
      return;
    }
    input.signal.addEventListener("abort", abortRequest, { once: true });
    request.setTimeout(input.timeoutMs, abortRequest);
    request.on("error", finishReject);
    request.end();
  });
}

export const LIVE_PRODUCT_PAGE_FETCH_DEPENDENCIES: SafeProductPageFetchDependencies = {
  resolveHost: resolveProductPageHost,
  transport: nodeProductPageTransport,
};
