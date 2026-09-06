import { createRecommendationPostHandler } from "../../../lib/recommendationHandler.ts";

export const runtime = "nodejs";
export const maxDuration = 90;
export const POST = createRecommendationPostHandler();
