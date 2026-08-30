import { NextResponse } from "next/server.js";
import {
  createOpenAIClient as createDefaultOpenAIClient,
  MissingOpenAISdkError,
} from "../../../lib/openaiClient.ts";
import { readBoundedJsonBody } from "../../../lib/boundedJsonRequest.ts";
import {
  createBoundedAsyncCache,
  normalizeCacheKey,
  type BoundedAsyncCache,
} from "../../../lib/cache.ts";
import { USER_ERROR_MESSAGES } from "../../../lib/errorMessages.ts";
import {
  DEFAULT_PAID_REQUEST_ADMISSION,
  type PaidRequestAdmission,
} from "../../../lib/paidRequestAdmission.ts";
import {
  getFallbackSmartFeatures,
  smartFeatureResponseJsonSchema,
  smartFeatureResponseSchema,
} from "../../../lib/smartFeatureSuggestions.ts";
import type { SmartFeatureResponse } from "../../../types/smart-features.ts";

export const runtime = "nodejs";

const FEATURE_TIMEOUT_MS = 30_000;
const PRODUCT_CATEGORY_MAX_LENGTH = 80;
const FEATURE_CONTEXT_MAX_LENGTH = 240;
export const GENERATED_FEATURE_CACHE_MAX_ENTRIES = 100;
export const GENERATED_FEATURE_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;

const defaultGeneratedFeatureCache = createBoundedAsyncCache({
  maxEntries: GENERATED_FEATURE_CACHE_MAX_ENTRIES,
});

type FeatureEnvironment = {
  apiKey: string | undefined;
  model: string;
};

type FeaturePostHandlerDependencies = {
  cache: BoundedAsyncCache;
  createOpenAIClient: typeof createDefaultOpenAIClient;
  getEnvironment: () => FeatureEnvironment;
  paidRequestAdmission: PaidRequestAdmission;
};

const DEFAULT_DEPENDENCIES: FeaturePostHandlerDependencies = {
  cache: defaultGeneratedFeatureCache,
  createOpenAIClient: createDefaultOpenAIClient,
  getEnvironment: () => ({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  }),
  paidRequestAdmission: DEFAULT_PAID_REQUEST_ADMISSION,
};

class FeatureAdmissionError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Paid feature generation was not admitted.");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type FeatureGenerationFailureReason =
  | "invalid_output"
  | "missing_sdk"
  | "provider_error";

class FeatureGenerationError extends Error {
  readonly reason: FeatureGenerationFailureReason;

  constructor(reason: FeatureGenerationFailureReason) {
    super(`Feature generation failed: ${reason}`);
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text;
  }

  return "";
}

function optionalContextText(
  body: Record<string, unknown>,
  field: "budget" | "importantDetails",
) {
  const value = body[field];
  if (value === undefined || value === null) {
    return { ok: true as const, value: "" };
  }
  if (typeof value !== "string" || value.length > FEATURE_CONTEXT_MAX_LENGTH) {
    return { ok: false as const };
  }
  return { ok: true as const, value: value.trim() };
}

function fallbackWithWarning(productCategory: string, warning: string) {
  const fallback = getFallbackSmartFeatures(productCategory);

  if (!fallback) {
    return {
      category: productCategory || "product",
      features: [],
      warning:
        "Smart Features could not load for this product. You can still use Important Details.",
    };
  }

  return {
    ...fallback,
    warning,
  };
}

function generationWarning(reason: FeatureGenerationFailureReason) {
  if (reason === "missing_sdk") {
    return "OpenAI is not installed locally, so fallback features were returned.";
  }
  if (reason === "invalid_output") {
    return "AI feature generation returned invalid data, so fallback features were returned.";
  }
  return "AI feature generation failed, so fallback features were returned.";
}

export function createFeaturePostHandler(
  dependencies: Partial<FeaturePostHandlerDependencies> = {},
) {
  const routeDependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };

  return async function POST(request: Request) {
    const bodyResult = await readBoundedJsonBody(request);
    if (!bodyResult.ok) {
      return NextResponse.json(
        {
          error:
            bodyResult.reason === "body_too_large"
              ? "The request body is too large."
              : "Invalid JSON body.",
        },
        { status: bodyResult.reason === "body_too_large" ? 413 : 400 },
      );
    }

    if (!isRecord(bodyResult.value)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const body = bodyResult.value;
    if (
      typeof body.productCategory !== "string" ||
      body.productCategory.length > PRODUCT_CATEGORY_MAX_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            typeof body.productCategory === "string"
              ? "Product category is too long."
              : "Product category is required.",
        },
        { status: 400 },
      );
    }

    const productCategory = body.productCategory.trim();
    if (!productCategory) {
      return NextResponse.json(
        { error: "Product category is required." },
        { status: 400 },
      );
    }

    const budgetResult = optionalContextText(body, "budget");
    if (!budgetResult.ok) {
      return NextResponse.json(
        { error: "Budget must be text no longer than 240 characters." },
        { status: 400 },
      );
    }
    const detailsResult = optionalContextText(body, "importantDetails");
    if (!detailsResult.ok) {
      return NextResponse.json(
        { error: "Important details must be text no longer than 240 characters." },
        { status: 400 },
      );
    }
    const budget = budgetResult.value;
    const importantDetails = detailsResult.value;

    const catalogFeatures = getFallbackSmartFeatures(productCategory);
    if (catalogFeatures) {
      return NextResponse.json(catalogFeatures);
    }

    const environment = routeDependencies.getEnvironment();
    if (!environment.apiKey?.trim()) {
      return NextResponse.json(
        fallbackWithWarning(
          productCategory,
          "OPENAI_API_KEY is missing, so fallback features were returned.",
        ),
      );
    }

    const cacheKey = normalizeCacheKey([
      "generated-features-v1",
      environment.model,
      productCategory,
      budget,
      importantDetails,
    ]);

    try {
      const features = await routeDependencies.cache.getCachedOrLoad(
        cacheKey,
        GENERATED_FEATURE_CACHE_TTL_MS,
        async (): Promise<SmartFeatureResponse> => {
          const admission = routeDependencies.paidRequestAdmission.tryAcquire();
          if (!admission.ok) {
            throw new FeatureAdmissionError(admission.retryAfterSeconds);
          }

          try {
            const client = await routeDependencies.createOpenAIClient(
              environment.apiKey!,
            );
            const response = await client.responses.create(
              {
                model: environment.model,
                max_output_tokens: 1_200,
                input: [
                  {
                    role: "system",
                    content:
                      "You generate practical product feature filters for a product recommendation app. Return useful shopping features that a normal buyer would understand. Make the features specific to the product category and the user's budget/details when provided. Prioritize measurable or verifiable attributes such as width, height, capacity, color, material, finish, screen size, refresh rate, fuel type, USB-C, weight capacity, counter-depth, and garage ready. Avoid vague features like quality, popular, best, durable, or value unless tied to a measurable attribute. Do not include brand names. Do not include unsafe, illegal, adult, or unrelated suggestions. For every feature, include possibleValues as an array, unit as a string or empty string, operators, examples, and commonlyImportant.",
                  },
                  {
                    role: "user",
                    content: [
                      `Product category: ${productCategory}`,
                      `Budget: ${budget || "Not specified"}`,
                      `Important Details: ${importantDetails || "Not specified"}`,
                      "Generate 5 to 10 customizable shopping features and clickable option values.",
                    ].join("\n"),
                  },
                ],
                text: {
                  format: {
                    type: "json_schema",
                    name: "product_feature_suggestions",
                    strict: true,
                    schema: smartFeatureResponseJsonSchema,
                  },
                },
              },
              { timeout: FEATURE_TIMEOUT_MS },
            );

            const outputText = getOutputText(response);
            if (!outputText) {
              throw new FeatureGenerationError("invalid_output");
            }

            let decoded: unknown;
            try {
              decoded = JSON.parse(outputText);
            } catch {
              throw new FeatureGenerationError("invalid_output");
            }
            const parsed = smartFeatureResponseSchema.safeParse(decoded);
            if (!parsed.success) {
              throw new FeatureGenerationError("invalid_output");
            }
            return parsed.data;
          } catch (error) {
            if (
              error instanceof FeatureAdmissionError ||
              error instanceof FeatureGenerationError
            ) {
              throw error;
            }
            if (error instanceof MissingOpenAISdkError) {
              throw new FeatureGenerationError("missing_sdk");
            }
            throw new FeatureGenerationError("provider_error");
          } finally {
            admission.release();
          }
        },
      );
      return NextResponse.json(features);
    } catch (error) {
      if (error instanceof FeatureAdmissionError) {
        return NextResponse.json(
          { error: USER_ERROR_MESSAGES.temporaryRateLimit },
          {
            headers: { "Retry-After": String(error.retryAfterSeconds) },
            status: 429,
          },
        );
      }
      const reason =
        error instanceof FeatureGenerationError
          ? error.reason
          : "provider_error";
      return NextResponse.json(
        fallbackWithWarning(productCategory, generationWarning(reason)),
      );
    }
  };
}

export const POST = createFeaturePostHandler();
