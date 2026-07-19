import { createDirectTerraRecommendationHandlers } from "@/lib/directTerraRecommendationRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createDirectTerraRecommendationHandlers();

export const POST = handlers.POST;
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
