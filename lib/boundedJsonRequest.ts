export const DEFAULT_JSON_BODY_MAX_BYTES = 64 * 1024;

export type BoundedJsonBodyFailureReason =
  | "body_too_large"
  | "invalid_content_length"
  | "invalid_json";

export type BoundedJsonBodyResult =
  | { ok: true; value: unknown; byteLength: number }
  | { ok: false; reason: BoundedJsonBodyFailureReason };

function validMaximum(maxBytes: number) {
  return Number.isSafeInteger(maxBytes) && maxBytes > 0;
}

function declaredLength(request: Request) {
  const header = request.headers.get("content-length");
  if (header === null) return { ok: true as const, value: null };
  const value = header.trim();
  if (!/^\d+$/.test(value)) {
    return { ok: false as const };
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed)
    ? { ok: true as const, value: parsed }
    : { ok: false as const };
}

export async function readBoundedJsonBody(
  request: Request,
  { maxBytes = DEFAULT_JSON_BODY_MAX_BYTES }: { maxBytes?: number } = {},
): Promise<BoundedJsonBodyResult> {
  if (!validMaximum(maxBytes)) {
    throw new Error("Bounded JSON body size must be a positive safe integer.");
  }

  const declared = declaredLength(request);
  if (!declared.ok) {
    return { ok: false, reason: "invalid_content_length" };
  }
  if (declared.value !== null && declared.value > maxBytes) {
    return { ok: false, reason: "body_too_large" };
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // The size verdict is already final; cancellation is best effort.
          }
          return { ok: false, reason: "body_too_large" };
        }
        chunks.push(value);
      }
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return {
      ok: true,
      byteLength,
      value: JSON.parse(text),
    };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
