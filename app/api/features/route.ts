import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient, MissingOpenAISdkError } from "@/lib/openaiClient";
import {
  getFallbackSmartFeatures,
  smartFeatureCategoryKey,
  smartFeatureResponseJsonSchema,
  smartFeatureResponseSchema,
} from "@/lib/smartFeatureSuggestions";
import type { SmartFeatureResponse } from "@/types/smart-features";

export const runtime = "nodejs";

const FEATURE_TIMEOUT_MS = 30000;
const generatedFeatureCache = new Map<string, SmartFeatureResponse>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text;
  }

  return "";
}

function getOptionalString(body: Record<string, unknown>, field: string) {
  const value = body[field];

  if (value === undefined || value === null) {
    return "";
  }

  return typeof value === "string" ? value.trim().slice(0, 240) : "";
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

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  if (typeof body.productCategory !== "string") {
    return NextResponse.json(
      { error: "Product category is required." },
      { status: 400 },
    );
  }

  const productCategory = body.productCategory.trim();
  const budget = getOptionalString(body, "budget");
  const importantDetails = getOptionalString(body, "importantDetails");

  if (!productCategory) {
    return NextResponse.json(
      { error: "Product category is required." },
      { status: 400 },
    );
  }

  if (productCategory.length > 80) {
    return NextResponse.json(
      { error: "Product category is too long." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const catalogFeatures = getFallbackSmartFeatures(productCategory);

  if (catalogFeatures) {
    return NextResponse.json(catalogFeatures);
  }

  const cacheKey = smartFeatureCategoryKey(productCategory);
  const cachedFeatures = generatedFeatureCache.get(cacheKey);

  if (cachedFeatures) {
    return NextResponse.json(cachedFeatures);
  }

  if (!apiKey) {
    return NextResponse.json(
      fallbackWithWarning(
        productCategory,
        "OPENAI_API_KEY is missing, so fallback features were returned.",
      ),
    );
  }

  try {
    const client = await createOpenAIClient(apiKey);
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

    const response = await client.responses.create({
      model,
      max_output_tokens: 1200,
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
    }, {
      timeout: FEATURE_TIMEOUT_MS,
    });

    const outputText = getOutputText(response);

    if (!outputText) {
      return NextResponse.json(
        fallbackWithWarning(
          productCategory,
          "AI feature generation failed, so fallback features were returned.",
        ),
      );
    }

    const parsed = smartFeatureResponseSchema.safeParse(JSON.parse(outputText));

    if (!parsed.success) {
      return NextResponse.json(
        fallbackWithWarning(
          productCategory,
          "AI feature generation returned invalid data, so fallback features were returned.",
        ),
      );
    }

    generatedFeatureCache.set(cacheKey, parsed.data);

    return NextResponse.json(parsed.data);
  } catch (featureError) {
    if (featureError instanceof MissingOpenAISdkError) {
      return NextResponse.json(
        fallbackWithWarning(
          productCategory,
          "OpenAI is not installed locally, so fallback features were returned.",
        ),
      );
    }

    return NextResponse.json(
      fallbackWithWarning(
        productCategory,
        "AI feature generation failed, so fallback features were returned.",
      ),
    );
  }
}
