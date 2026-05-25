import { NextRequest, NextResponse } from "next/server";
import { createOpenAIClient, MissingOpenAISdkError } from "@/lib/openaiClient";
import {
  fallbackFeatures,
  smartFeatureResponseJsonSchema,
  smartFeatureResponseSchema,
} from "@/lib/smartFeatureSuggestions";

export const runtime = "nodejs";

const FEATURE_TIMEOUT_MS = 30000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text;
  }

  return "";
}

function fallbackWithWarning(warning: string) {
  return {
    ...fallbackFeatures,
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

  if (!apiKey) {
    return NextResponse.json(
      fallbackWithWarning(
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
            "You generate practical product feature filters for a product recommendation app. Return useful shopping features that a normal buyer would understand. Make the features specific to the product category. Avoid vague generic features unless they are truly relevant. Do not include brand names. Do not include unsafe, illegal, adult, or unrelated suggestions.",
        },
        {
          role: "user",
          content: `Generate 5 to 10 customizable shopping features for this product category: ${productCategory}`,
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
          "AI feature generation failed, so fallback features were returned.",
        ),
      );
    }

    const parsed = smartFeatureResponseSchema.safeParse(JSON.parse(outputText));

    if (!parsed.success) {
      return NextResponse.json(
        fallbackWithWarning(
          "AI feature generation returned invalid data, so fallback features were returned.",
        ),
      );
    }

    return NextResponse.json(parsed.data);
  } catch (featureError) {
    if (featureError instanceof MissingOpenAISdkError) {
      return NextResponse.json(
        fallbackWithWarning(
          "OpenAI is not installed locally, so fallback features were returned.",
        ),
      );
    }

    return NextResponse.json(
      fallbackWithWarning(
        "AI feature generation failed, so fallback features were returned.",
      ),
    );
  }
}
