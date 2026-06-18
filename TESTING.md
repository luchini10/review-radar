# ReviewRadar Testing Guide

These tests are for Phase 9 only. They check the app's safety guards and give you a manual checklist for local testing on Windows.

## Automated Tests

From the project folder in PowerShell:

```powershell
npm test
```

If PowerShell says running scripts are disabled, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" test
```

The automated tests do not call OpenAI and do not spend API quota.

They cover:

- Empty search validation
- Too-vague search validation
- Normal product search validation
- Missing or invalid API key message handling
- OpenAI API failure message handling
- Web/network failure message handling
- Slow response message handling
- Bad structured output rejection
- Broken citation URL rejection
- Extra field rejection
- No strong sources found
- Missing citation rejection
- Unverified citation rejection
- Overstated confidence rejection

## Manual Test Setup

Start the app from PowerShell:

```powershell
npm run dev
```

If PowerShell blocks `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Then open:

```text
http://localhost:3000
```

Keep the PowerShell window open while testing.

## Manual Test Cases

### Empty Search

1. Leave **Product category** blank.
2. Click **Find Recommendations**.
3. Expected result: `Please enter a product category.`

### Normal Product Search

1. Enter `gaming chair`.
2. Leave the other fields blank.
3. Click **Find Recommendations**.
4. Expected result: the app either returns evidence-backed results with citations or a clear reliability/error message.

### Product Search With Budget

1. Enter `gaming chair`.
2. Enter a budget such as `$300`.
3. Click **Find Recommendations**.
4. Expected result: the research should consider the budget. If sources are too weak, the app should say so.

### Product Search With Important Details

1. Enter `vacuum`.
2. Enter important details, such as `pet hair on carpet`.
3. Click **Find Recommendations**.
4. Expected result: the app should favor results that address that priority, or explain that evidence is limited.

### Missing API Key

1. Stop the dev server.
2. Temporarily remove or rename `OPENAI_API_KEY` in `.env.local`.
3. Restart the dev server.
4. Submit a normal product search.
5. Expected result: `The recommendation engine is not configured yet.`
6. Put the key back afterward and restart the dev server.

Do not paste your API key into the browser, logs, screenshots, or chat.

### API Failure

1. Stop the dev server.
2. Temporarily set `OPENAI_API_KEY` in `.env.local` to a fake value such as `invalid-test-key`.
3. Restart the dev server.
4. Submit a normal product search.
5. Expected result: a simple error message, not a technical crash.
6. Restore the real key afterward and restart the dev server.

### Bad Structured Output

This is covered by the automated tests. The app should reject model output that is missing required fields, has broken citation URLs, or includes fields outside the approved JSON contract.

### No Strong Sources Found

1. Search for a very niche or unclear product category.
2. Expected result: `I could not find enough reliable evidence for that search.` or another simple reliability message.

## Trust Checks

When real results appear, confirm:

- Product cards include citation links.
- Citation links are actual URLs.
- Recommendations do not appear when citations are missing.
- Weak evidence is not shown as high confidence.
- The browser network response does not include `OPENAI_API_KEY`.
- The browser never shows raw OpenAI responses.

## Serper Discovery Checks

These checks are manual because live Serper calls can spend credits.

### Test A: Restrictive sleeper search

Input:

- Product category: `pull out couch`
- Budget: `$1500`
- Smart Features: `Color: Black`, `Size: Full`
- Important Details: `Less than 64 inches`

Expected:

- The server searches multiple query variations.
- The raw candidate pool increases when `SERPER_API_KEY` is configured.
- Exact matches only include black, full/full-size sleeper products under 64 inches and within budget.
- Wider products appear only as near matches or are rejected.

### Test B: Monitor with USB-C

Input:

- Product category: `27 inch 4K monitor`
- Budget: `under $250`
- Smart Features: `USB-C`

Expected:

- Serper can contribute Google search product candidates.
- Exact matches must be 27 inch, 4K, USB-C, and under $250.
- Products without verified USB-C do not appear as exact matches.

### Test C: Missing Serper key

1. Temporarily remove or rename `SERPER_API_KEY` in `.env.local`.
2. Restart the dev server.
3. Submit a normal product search.
4. Expected result: the app still runs and continues with the existing research path.
5. Put the key back afterward and restart the dev server.
