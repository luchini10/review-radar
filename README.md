# ReviewRadar

ReviewRadar is a request-time product-selection app. A shopper enters a product
category plus optional budget, must-have details, and exclusions. ReviewRadar
then performs fresh discovery and research for that request, validates current
product offers and pages, and returns a small ranked shortlist.

Product research is request-time and request-bound. ReviewRadar does not
precompute market research, keep a persistent product-evidence index, prewarm
recommendations, refresh research in the background, or reuse one shopper's
product research for another search.

Each product card contains only:

- product image when identity-safe;
- product name;
- simple product/category label;
- current USD price when trustworthy;
- a direct **View product** link.

There are no research reports, confidence badges, pros/cons, citations,
evidence breakdowns, or long recommendation explanations in the public result.

## Requirements

- Windows 10 or Windows 11
- Node.js LTS and npm
- PowerShell
- a Serper.dev API key for live Shopping and product-page discovery
- optionally, an OpenAI API key for the fresh request-time market scout

## Install

From PowerShell in this repository:

```powershell
npm install
```

If PowerShell blocks `npm.ps1`, use the Windows command directly:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

## Configure local credentials

Create `.env.local` only when it does not already exist:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Set the server-only keys in `.env.local`:

```text
SERPER_API_KEY=your_serper_key
OPENAI_API_KEY=your_openai_key
REVIEW_RADAR_CONSTRAINT_ALLOCATION=off
```

`SERPER_API_KEY` is required for product results. `OPENAI_API_KEY` is optional;
without it the request falls back to neutral live Serper discovery with no
market-scout quality boost. The constraint-allocation flag only changes how
otherwise ambiguous Important Details are treated in the current request. It
does not cache or persist product research.

Never use `NEXT_PUBLIC_` for credentials, and do not overwrite an existing
`.env.local` after adding real keys. Restart the development server after
changing local environment values.

## Run locally

```powershell
npm run dev
```

Open `http://localhost:3000`, enter a product search, and select **Find
Recommendations**. Live searches consume configured provider quota.

The browser sends one `POST /api/recommendations` request. The server performs
fresh scouting and Shopping discovery, applies deterministic safety and
requirement gates, resolves current product pages/prices/images, and returns
only the minimal product shape. Responses use `Cache-Control: no-store`.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run qa:live-accuracy` is the bounded paid live-audit harness. It requires
an explicit approved run count and should be used only for an authorized live
window; it is not part of ordinary credential-free verification.

## Current boundaries

- no accounts, saved searches, search history, or recommendation database;
- no persistent cross-request product, Shopping, page, or research cache;
- no background recommendation job, polling route, alternate recommender, or
  startup prewarm;
- one public recommendation route: `POST /api/recommendations`;
- Serper is the sole commerce/search transport;
- OpenAI scouting uses `store: false` and is not price, availability, product-
  identity, or eligibility authority;
- products without safe direct detail pages are not returned;
- budgeted searches require a trustworthy in-budget USD price;
- live provider coverage can still omit a qualifying product.

For implementation details and current measured limitations, see
`ReviewRadar-Overview.md` and `docs/agent-next-task.md`.
