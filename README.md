# ReviewRadar

ReviewRadar uses one authoritative product-ranking backend. One OpenAI Responses
request researches up to five products using current web sources and returns names
and direct product links in recommendation order. Optional Serper Shopping lookups
add matching images without changing the ranking.

The app considers quality, performance, reliability, owner experience and popularity.
Budget and preferences guide research. Current prices, stock and product claims are
not independently verified; shoppers check those on the linked product pages.
Cards show only a name, optional image and View product link.

## Setup

Run `npm install`, configure server-only `OPENAI_API_KEY` in the existing environment,
and run `npm run dev`. Optional `SERPER_API_KEY` enables product images. Never overwrite
an existing credential file. `.env.example` documents the supported configuration.

The default model is `gpt-5.5` with medium reasoning. `OPENAI_RESEARCH_MODEL` may select
an account-supported model with Responses web search and Structured Outputs.
There is no alternative research-mode switch or fallback selection engine.

Each search uses one model request, at most six hosted web actions, at most 8,000
output tokens, a 75-second research deadline and no retries. Optional images use at
most five parallel Shopping requests with six-second deadlines. No cross-request
product cache, database, scheduled research or background refresh is used.

`POST /api/recommendations` returns:

```json
{"result":{"recommendations":[{"name":"Product name","productPageUrl":"https://manufacturer.example/product"}]}}
```

Products may include `image: {url, sourceUrl, sourceTitle, productId?}`. The client
discards invalid optional imagery without losing the product. The server validates
output shape, exact source-observed HTTPS links, duplicates and cancellation.

## Validation and release

Run `npm test`, `npm run typecheck`, `npm run lint -- --max-warnings=0`,
`npm run build`, and `npm run test:e2e`. Browser tests mock provider calls.
These checks do not establish live recommendation accuracy.

`main` is the source of truth. Historical Git commits and recovery archives are
recovery material, not supported alternate versions. Legacy benchmark records
remain historical evidence and do not describe the current product contract.
See [current handoff](docs/agent-next-task.md) for release state and limitations.
