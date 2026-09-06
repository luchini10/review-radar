# ReviewRadar architecture

The authoritative implementation is the ranking backend on `main`.

1. The browser validates a search and sends one POST to `/api/recommendations`.
2. `lib/recommendationHandler.ts` bounds and validates the body, acquires the
   process-local paid-request permit and handles cancellation and safe errors.
3. `lib/productResearch.ts` makes one fresh Responses web-research request. The
   model ranks up to five exact products. Output validation preserves model order,
   rejects unsafe or unobserved links and removes exact duplicates.
4. `lib/productImages.ts` optionally performs bounded Serper Shopping lookups for
   the selected names. Images require matching listing identity and approved
   thumbnail hosts. Missing images never alter the recommendation list.
5. `lib/recommendationClient.ts` validates the minimal response. Product cards render
   names, optional images and direct product links.

Research uses the ranking worktree's default prompt and limits: GPT-5.5 / medium
by default, six hosted actions, 8,000 maximum output tokens, 75 seconds, no retries,
store:false. Server-only model configuration is supported. Experimental adaptive
and verified modes and the former deterministic selection pipeline are removed.

There is no product database, cross-request research cache, price/stock validation,
background refresh or alternate selection path. The budget is research guidance.
Source-observed links do not independently prove the model's quality judgments.

Runtime configuration: OPENAI_API_KEY required, OPENAI_RESEARCH_MODEL optional,
SERPER_API_KEY optional for images. Credentials remain server-only.

Historical evaluation records are preserved but do not prove this implementation
has superior live accuracy. See docs/agent-next-task.md for current release proof.
