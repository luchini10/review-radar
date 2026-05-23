# ReviewRadar MVP Project Plan

ReviewRadar is an AI-powered product research app. A user enters a product category, optionally adds budget, use case, and deal-breaker filters, and receives structured buying recommendations based on AI-assisted research across public sources such as Reddit, YouTube, expert review sites, forums, retailer reviews, and social discussions.

The app should behave like a buying-decision engine, not a basic chatbot wrapper. The most important product principle is trust: recommendations must be grounded in available evidence, citations must not be invented, and weak evidence must be clearly labeled.

## Core MVP Stack

- Windows PC
- Codex
- GitHub and GitHub Desktop
- VS Code
- PowerShell
- Node.js LTS
- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Web search
- Structured JSON output
- No database yet
- No auth yet
- No payments yet

## Product Output Requirements

The app should return:

- Best overall pick
- Best value pick
- Best budget pick
- Best premium pick
- Best pick for the user's specific need
- One product to avoid
- Pros and cons
- Common complaint patterns
- Source consensus
- Confidence score or confidence level
- Plain-English confidence explanation
- Price/value verdict
- Final buying advice
- Source links and citations when actually available

## Safety and Trust Rules

- Do not invent product recommendations.
- Do not invent citations.
- Do not expose API keys.
- Keep OpenAI API calls server-side.
- Do not use `NEXT_PUBLIC_` for secrets.
- Do not send raw OpenAI responses to the client.
- Do not log secrets, request headers, API keys, or full raw model responses.
- Use structured JSON output.
- Validate structured JSON before rendering.
- Validate evidence rules before rendering.
- Clearly show loading and error states.
- If sources are weak, missing, unavailable, or conflicting, say so clearly.
- Recommendations should reference supporting source IDs.
- If a recommendation has no supporting source, do not present it as a confident pick.
- Confidence scoring should be transparent and simple, not fake precision.

## Step 0: Repository Sync Check

### Goal

Confirm the actual working project files are in the intended local repository before continuing.

This step matters because ReviewRadar may have been started in ChatGPT or another workspace. Codex should only plan from the repository state it can actually inspect.

### Files likely checked

- `package.json`
- `app/`
- `components/`
- `lib/`
- `types/`
- `README.md`
- `.env.local.example`
- Test files, if any
- `AGENTS.md`
- `PROJECT_PLAN.md`

### How I can test it

- Confirm the intended repo opens in VS Code.
- Confirm `package.json` exists.
- Confirm the app can run locally, if implementation files are present.
- Confirm prior phase work is actually present in the local repo.

### What could go wrong

- The ChatGPT project and local GitHub repo are out of sync.
- Codex is looking at a planning folder instead of the app repo.
- The local repo has only a README and no app implementation.
- Work is on another branch, folder, or machine location.

## Step 1: Project Setup

### Goal

Create the basic Next.js App Router project with TypeScript and Tailwind CSS.

### Files likely changed

- `package.json`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `tsconfig.json`
- `.gitignore`
- `.env.local.example`

### How I can test it

- Run the app locally.
- Confirm the homepage loads.
- Confirm Tailwind styling works.

### What could go wrong

- Tooling setup fails.
- Tailwind is not wired correctly.
- Environment file naming is confusing.

## Step 2: Data Contract and Safety Rules

### Goal

Define the exact shape of a ReviewRadar result before building the full UI or AI call.

This step should define:

- Search input shape
- Recommendation output shape
- Source/citation shape
- Claim/evidence shape
- Evidence requirements
- Insufficient-evidence behavior
- No-citation/no-recommendation rules

Important rule: a recommendation should include supporting source IDs. If it has no supporting source, the app should not present it as a confident pick.

### Files likely changed

- `types/review-radar.ts`
- Possibly `lib/researchSchema.ts`

### How I can test it

- Review the types/schema manually.
- Confirm every product pick can point back to sources.
- Confirm there is a valid "not enough evidence" result.
- Confirm the contract does not require fake precision.

### What could go wrong

- Schema becomes too complicated.
- The result shape encourages fake precision.
- Missing citations are treated as a small UI issue instead of a trust issue.

## Step 3: Homepage/Search Form

### Goal

Build a simple form for:

- Product category
- Budget
- Use case
- Deal-breakers
- Optional preferences

### Files likely changed

- `app/page.tsx`
- `components/SearchForm.tsx`
- `types/review-radar.ts`

### How I can test it

- Enter a product category.
- Submit the form.
- Confirm empty searches are blocked.
- Confirm the app captures optional fields correctly.

### What could go wrong

- The form feels like a chatbot prompt box.
- Inputs are too vague.
- Validation is too loose.

## Step 4: Backend API Route Without OpenAI

### Goal

Create a server-side API route that accepts the search form request and returns a safe placeholder response.

The placeholder must not use real product names or fake URLs.

### Files likely changed

- `app/api/research/route.ts`
- `lib/validation.ts`
- `types/review-radar.ts`

### How I can test it

- Submit the form.
- Confirm the frontend talks to the backend.
- Confirm validation errors return clean messages.
- Confirm no secrets are sent to the browser.

### What could go wrong

- Client and server types drift.
- Placeholder data looks too real.
- Error messages expose technical details.

## Step 5: Results Components With Safe Placeholder Data

### Goal

Build the results UI using obviously fake placeholder records, not realistic product recommendations.

The UI should show:

- Recommendation cards
- Evidence/source links
- Complaint patterns
- Confidence explanation
- Final advice
- Insufficient-evidence state

### Files likely changed

- `components/ResultsView.tsx`
- `components/ProductPickCard.tsx`
- `components/SourceList.tsx`
- `components/ConfidenceBadge.tsx`
- `components/LoadingState.tsx`
- `components/ErrorMessage.tsx`

### How I can test it

- Submit a search.
- Confirm loading state appears.
- Confirm all result sections render.
- Confirm missing or unsupported picks are not shown as real recommendations.

### What could go wrong

- UI overstates confidence.
- Unsupported picks still look authoritative.
- Long text breaks layout.

## Step 6: OpenAI Integration Server-Side

### Goal

Connect the backend route to the OpenAI Responses API, keeping all API calls server-side.

Strict API key rules:

- Use a server-only environment variable like `OPENAI_API_KEY`.
- Do not use `NEXT_PUBLIC_OPENAI_API_KEY`.
- Do not send raw OpenAI responses to the client.
- Do not log secrets.
- Do not expose stack traces in API responses.

### Files likely changed

- `lib/openai.ts`
- `app/api/research/route.ts`
- `.env.local.example`

### How I can test it

- Add the API key locally.
- Submit a search.
- Confirm the request works.
- Inspect browser network responses and confirm no key appears.

### What could go wrong

- Missing API key.
- Timeout or rate limit.
- Full raw responses accidentally returned to the client.
- Secret appears in logs or browser output.

## Step 7: Web Research Prompt and Citation Discipline

### Goal

Prompt the model to research public sources and produce only evidence-backed output.

The prompt should require:

- No invented products
- No invented citations
- Each recommendation must reference source IDs
- If evidence is weak, say so
- Include source URLs only when actually available
- Separate direct source facts from synthesized advice
- Preserve disagreement between sources instead of hiding it

### Files likely changed

- `lib/researchPrompt.ts`
- `lib/researchSchema.ts`
- `app/api/research/route.ts`

### How I can test it

- Search common categories.
- Search niche categories.
- Confirm sources are real links when shown.
- Confirm weak evidence produces lower confidence or insufficient-evidence output.

### What could go wrong

- The model still fills gaps.
- Citations are attached to claims they do not support.
- Search results are too thin.
- Sources disagree and the app hides that disagreement.

## Step 8: Structured JSON and Evidence Validation

### Goal

Validate both the model response shape and the trust rules before rendering.

If the JSON is invalid, incomplete, or unsupported by sources, return a friendly error or partial insufficient-evidence result.

Validation should check:

- Required top-level fields exist.
- Source IDs referenced by recommendations actually exist.
- Recommendations without supporting source IDs are rejected or downgraded.
- Fake or empty citation URLs are not displayed.
- Missing evidence triggers an insufficient-evidence result.

### Files likely changed

- `lib/researchSchema.ts`
- `lib/validateResearchResult.ts`
- `app/api/research/route.ts`

### How I can test it

- Try several searches.
- Simulate invalid JSON.
- Simulate missing sources.
- Simulate source ID mismatches.
- Confirm the app refuses unsupported recommendations.

### What could go wrong

- Validation is too strict and blocks useful results.
- Validation is too loose and allows fake confidence.
- Error state becomes frustrating.

## Step 9: Transparent Evidence Scoring

### Goal

Add transparent confidence scoring without pretending it is scientific.

MVP confidence should be based on:

- Number of cited sources
- Source diversity
- Whether multiple sources agree
- Whether complaints repeat across sources
- Whether the user's specific need is directly addressed
- Whether any pick has weak or missing support

Instead of only showing a numeric score like "87% confidence," the app should show a short explanation like:

"Medium confidence: several sources agree on the top pick, but long-term owner complaints are limited."

### Files likely changed

- `lib/sourceScoring.ts`
- `types/review-radar.ts`
- `components/ConfidenceBadge.tsx`
- `components/ResultsView.tsx`

### How I can test it

- Compare a popular category with a niche category.
- Confirm weak evidence lowers confidence.
- Confirm confidence explanations are readable.
- Confirm the app does not claim consensus from too few sources.

### What could go wrong

- Score feels fake.
- Weighting overvalues one source type.
- The app claims consensus from too few sources.

## Step 10: Error Handling and Empty States

### Goal

Make failures understandable.

Handle:

- Empty query
- Missing API key
- OpenAI failure
- Timeout
- Rate limit
- Invalid JSON
- No useful sources
- Weak evidence

### Files likely changed

- `components/ErrorMessage.tsx`
- `components/LoadingState.tsx`
- `app/api/research/route.ts`
- `app/page.tsx`

### How I can test it

- Submit empty input.
- Remove API key locally.
- Search a niche product.
- Trigger a simulated backend error.
- Confirm the user can retry.

### What could go wrong

- Error messages are too technical.
- App appears broken during slow research.
- User cannot retry easily.

## Step 11: Testing and Trust Audit

### Goal

Add practical MVP tests and perform a trust audit around the riskiest parts of the app.

ReviewRadar's riskiest failure mode is not only a broken button. It is giving confident-looking buying advice from weak evidence, fake citations, or unsupported model output.

Focus tests and manual checks on:

- Form validation
- Backend validation
- Structured JSON validation
- Citation enforcement
- Source ID enforcement
- Empty/error states
- Result rendering with missing fields
- API key exposure checks
- Raw OpenAI response leakage checks
- Unsupported recommendation handling

### Manual trust audit matrix

Run or simulate:

- Popular category
- Niche category
- Empty category
- Conflicting evidence
- Missing citations
- Fake source ID references
- API failure
- Slow request
- Weak source consensus

### Files likely changed

- Test config files
- Test files for validation and components
- Possibly `README.md`

### How I can test it

- Run the test command.
- Manually test common and niche searches.
- Confirm no fake citations pass validation.
- Confirm recommendations without valid source support are rejected, downgraded, or labeled as insufficient evidence.
- Confirm API keys are not visible in browser code, network responses, or logs.

### What could go wrong

- Tests become too complex.
- AI behavior is tested directly instead of testing app safeguards.
- Manual testing misses citation mismatch issues.
- The app passes UI tests but still fails trust expectations.

## Step 12: README and Beginner Instructions

### Goal

Write clear setup and usage instructions.

README should include:

- What ReviewRadar does
- What it does not do yet
- How to install dependencies
- How to create `.env.local`
- Correct API key variable name
- How to run locally
- How to test
- Citation/recommendation safety rules
- MVP limitations
- How to interpret confidence scores
- What to do when evidence is weak

### Files likely changed

- `README.md`
- `.env.local.example`

### How I can test it

- Follow the README from scratch.
- Confirm setup works.
- Confirm safety limits are understandable.

### What could go wrong

- README assumes too much experience.
- API key instructions are unclear.
- Limitations are undersold.

## Required Build Order

0. Repository sync check
1. Project setup
2. Data contract and safety rules
3. Homepage/search form
4. Backend API route without OpenAI
5. Results components with safe placeholder data
6. OpenAI integration server-side
7. Web research prompt and citation discipline
8. Structured JSON and evidence validation
9. Transparent evidence scoring
10. Error handling and empty states
11. Testing and trust audit
12. README and beginner instructions

Work one step at a time. Stop after each step and wait for approval before moving to the next step.
