import { NextResponse } from "next/server";
import { createOpenAIClient, MissingOpenAISdkError } from "@/lib/openaiClient";
import {
  getSafeOpenAIErrorMessage,
  getSearchValidationError,
  USER_ERROR_MESSAGES,
} from "@/lib/errorMessages";
import { collectReachableCitationUrls } from "@/lib/citationUrlVerification";
import {
  filterResultToVerifiedCitations,
  getRecommendationResultIssue,
} from "@/lib/recommendationResultValidation";
import { normalizeResearchResult } from "@/lib/normalizeResearchResult";
import { enrichProductAssets } from "@/lib/productAssets";
import {
  recommendationResultJsonSchema,
  recommendationResultSchema,
} from "@/lib/recommendationSchema";
import { buildResearchPrompt, researchSystemPrompt } from "@/lib/researchPrompt";
import { collectVerifiedSourceUrls } from "@/lib/responseSources";
import type { RecommendationApiRequest } from "@/types/review-radar";

export const runtime = "nodejs";

const SERVER_RESEARCH_TIMEOUT_MS = 90000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalString(
  body: Record<string, unknown>,
  field: keyof RecommendationApiRequest,
) {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return {
      error: `${field} must be a string.`,
    };
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function validateRequest(body: unknown) {
  if (!isRecord(body)) {
    return {
      error: "Request body must be a JSON object.",
    };
  }

  const query = body.query;

  if (typeof query !== "string") {
    return {
      error: USER_ERROR_MESSAGES.emptySearch,
    };
  }

  const searchValidationError = getSearchValidationError(query);

  if (searchValidationError) {
    return {
      error: searchValidationError,
    };
  }

  const requestBody: RecommendationApiRequest = {
    query: query.trim(),
  };

  for (const field of ["budget", "useCase", "dealBreakers"] as const) {
    const result = getOptionalString(body, field);

    if (isRecord(result) && typeof result.error === "string") {
      return {
        error: result.error,
      };
    }

    if (typeof result === "string") {
      requestBody[field] = result;
    }
  }

  return {
    data: requestBody,
  };
}

function getOutputText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === "string") {
    return response.output_text;
  }

  return "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validation = validateRequest(body);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: USER_ERROR_MESSAGES.missingApiKey,
      },
      { status: 500 },
    );
  }

  try {
    const client = await createOpenAIClient(apiKey);
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

    const response = await client.responses.create({
      model,
      max_output_tokens: 16000,
      tools: [
        {
          type: "web_search",
          search_context_size: "high",
        },
      ],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      input: [
        {
          role: "system",
          content: researchSystemPrompt,
        },
        {
          role: "user",
          content: buildResearchPrompt(validation.data),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "review_radar_recommendations",
          schema: recommendationResultJsonSchema,
          strict: true,
        },
      },
    }, {
      timeout: SERVER_RESEARCH_TIMEOUT_MS,
    });

    const outputText = getOutputText(response);

    if (!outputText) {
      return NextResponse.json(
        { error: USER_ERROR_MESSAGES.noReliableEvidence },
        { status: 502 },
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      return NextResponse.json(
        { error: USER_ERROR_MESSAGES.badStructuredOutput },
        { status: 502 },
      );
    }

    const result = recommendationResultSchema.safeParse(
      normalizeResearchResult(parsed),
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: USER_ERROR_MESSAGES.badStructuredOutput,
        },
        { status: 502 },
      );
    }

    let verifiedUrls = collectVerifiedSourceUrls(response);

    if (verifiedUrls.size === 0) {
      verifiedUrls = await collectReachableCitationUrls(result.data);
    }

    const verifiedResult = filterResultToVerifiedCitations(
      result.data,
      verifiedUrls,
    );
    const resultIssue = getRecommendationResultIssue(verifiedResult, verifiedUrls);

    if (resultIssue) {
      return NextResponse.json(
        {
          error:
            resultIssue === "no_reliable_evidence"
              ? USER_ERROR_MESSAGES.noReliableEvidence
              : USER_ERROR_MESSAGES.badStructuredOutput,
        },
        { status: resultIssue === "no_reliable_evidence" ? 422 : 502 },
      );
    }

    const enrichedResult = await enrichProductAssets(verifiedResult);

    return NextResponse.json({ result: enrichedResult });
  } catch (error) {
    if (error instanceof MissingOpenAISdkError) {
      return NextResponse.json(
        { error: USER_ERROR_MESSAGES.missingApiKey },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: getSafeOpenAIErrorMessage(error) },
      { status: 502 },
    );
  }
}
