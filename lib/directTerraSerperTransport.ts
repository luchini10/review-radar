import {
  DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT,
  MAX_DIRECT_TERRA_SHOPPING_RESULTS,
  type DirectTerraSerperShoppingRequest,
  type DirectTerraSerperShoppingTransport,
} from "./directTerraSerperAssetAdapter.ts";
import {
  DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT,
  MAX_DIRECT_TERRA_ORGANIC_RESULTS,
  type DirectTerraSerperOrganicRequest,
  type DirectTerraSerperOrganicTransport,
} from "./directTerraSerperOrganicAdapter.ts";

export const DIRECT_TERRA_SERPER_TIMEOUT_MS = 12_000;
export const DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING = 512_000;

export type DirectTerraSerperTransportErrorCode =
  | "invalid_transport_config"
  | "invalid_request"
  | "request_timeout"
  | "request_failed"
  | "provider_http_error"
  | "provider_content_type_error"
  | "provider_response_too_large"
  | "provider_payload_error";

export class DirectTerraSerperTransportError extends Error {
  readonly code: DirectTerraSerperTransportErrorCode;

  constructor(code: DirectTerraSerperTransportErrorCode) {
    super("Direct-Terra Serper request failed.");
    this.name = "DirectTerraSerperTransportError";
    this.code = code;
  }
}

type DirectTerraSerperTransportConfig = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function directTerraSerperApiKeyIsValid(apiKey: string) {
  return (
    typeof apiKey === "string" &&
    apiKey.length >= 16 &&
    apiKey.length <= 512 &&
    apiKey === apiKey.trim() &&
    !/[\s\u0000-\u001f\u007f]/.test(apiKey)
  );
}

type DirectTerraSerperRequest =
  | DirectTerraSerperShoppingRequest
  | DirectTerraSerperOrganicRequest;

function validRequest(request: DirectTerraSerperRequest) {
  if (!request) return false;

  const body = request.body;
  if (!body || typeof body !== "object") return false;
  const keys = Object.keys(body).sort();
  if (keys.join(",") !== "gl,hl,num,q") return false;

  return (
    typeof body.q === "string" &&
    body.q.length > 0 &&
    body.q.length <= 180 &&
    !/[\u0000-\u001f\u007f]/.test(body.q) &&
    body.gl === "us" &&
    body.hl === "en" &&
    ((request.endpoint === DIRECT_TERRA_SERPER_SHOPPING_ENDPOINT &&
      body.num === MAX_DIRECT_TERRA_SHOPPING_RESULTS) ||
      (request.endpoint === DIRECT_TERRA_SERPER_ORGANIC_ENDPOINT &&
        body.num === MAX_DIRECT_TERRA_ORGANIC_RESULTS))
  );
}

function contentLength(response: Response) {
  const value = response.headers.get("content-length");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parsedProviderPayload(text: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new DirectTerraSerperTransportError("provider_payload_error");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new DirectTerraSerperTransportError("provider_payload_error");
  }
  const record = payload as Record<string, unknown>;
  if (record.error) {
    throw new DirectTerraSerperTransportError("provider_payload_error");
  }
  return payload;
}

function createBoundedDirectTerraSerperTransport(
  config: DirectTerraSerperTransportConfig,
) {
  const timeoutMs = config.timeoutMs ?? DIRECT_TERRA_SERPER_TIMEOUT_MS;
  if (
    !directTerraSerperApiKeyIsValid(config.apiKey) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 30_000
  ) {
    throw new DirectTerraSerperTransportError("invalid_transport_config");
  }
  const fetchImpl = config.fetchImpl ?? fetch;

  return async (request: DirectTerraSerperRequest) => {
    if (!validRequest(request)) {
      throw new DirectTerraSerperTransportError("invalid_request");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(request.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": config.apiKey,
        },
        body: JSON.stringify({
          q: request.body.q,
          gl: "us",
          hl: "en",
          num: request.body.num,
        }),
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new DirectTerraSerperTransportError("provider_http_error");
      }
      if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
        throw new DirectTerraSerperTransportError("provider_content_type_error");
      }
      const declaredLength = contentLength(response);
      if (
        declaredLength !== null &&
        declaredLength > DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING
      ) {
        throw new DirectTerraSerperTransportError("provider_response_too_large");
      }

      const text = await response.text();
      if (
        Buffer.byteLength(text, "utf8") >
        DIRECT_TERRA_SERPER_RESPONSE_BYTE_CEILING
      ) {
        throw new DirectTerraSerperTransportError("provider_response_too_large");
      }
      return parsedProviderPayload(text);
    } catch (error) {
      if (error instanceof DirectTerraSerperTransportError) throw error;
      throw new DirectTerraSerperTransportError(
        controller.signal.aborted ? "request_timeout" : "request_failed",
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function createDirectTerraSerperShoppingTransport(
  config: DirectTerraSerperTransportConfig,
): DirectTerraSerperShoppingTransport {
  const transport = createBoundedDirectTerraSerperTransport(config);
  return (request) => transport(request);
}

export function createDirectTerraSerperOrganicTransport(
  config: DirectTerraSerperTransportConfig,
): DirectTerraSerperOrganicTransport {
  const transport = createBoundedDirectTerraSerperTransport(config);
  return (request) => transport(request);
}
