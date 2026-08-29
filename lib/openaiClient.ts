import type {
  ResponseCreateParamsNonStreaming,
  ResponseRetrieveParamsNonStreaming,
} from "openai/resources/responses/responses";

type OpenAIClient = {
  responses: {
    create: (
      options: ResponseCreateParamsNonStreaming | Record<string, unknown>,
      requestOptions?: Record<string, unknown>,
    ) => Promise<unknown>;
    retrieve: (
      responseId: string,
      query?: ResponseRetrieveParamsNonStreaming | Record<string, unknown>,
      requestOptions?: Record<string, unknown>,
    ) => Promise<unknown>;
    cancel: (
      responseId: string,
      requestOptions?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};

type OpenAIConstructor = new (options: {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
}) => OpenAIClient;

export class MissingOpenAISdkError extends Error {
  constructor() {
    super("OpenAI SDK is not installed. Run npm install before using recommendations.");
    this.name = "MissingOpenAISdkError";
  }
}

export async function createOpenAIClient(
  apiKey: string,
  options: { baseURL?: string; maxRetries?: number } = {},
) {
  try {
    const loadSdk = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<{ default: OpenAIConstructor }>;

    const { default: OpenAI } = await loadSdk("openai");
    return new OpenAI({ apiKey, ...options });
  } catch (error) {
    if (error instanceof Error && error.message.includes("openai")) {
      throw new MissingOpenAISdkError();
    }

    throw error;
  }
}
