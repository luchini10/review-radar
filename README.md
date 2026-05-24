# ReviewRadar

ReviewRadar is an MVP product research app. You enter a product category, optional budget, use case, and deal breakers, and the app asks OpenAI to research public web sources before returning structured buying recommendations.

The goal is to act like a buying-decision helper, not a generic chatbot. Results should include evidence-backed product picks, confidence scores, source consensus, pros and cons, common complaints, price/value notes, and citation links when reliable sources are available.

## What You Need On Windows

Install these before running the project:

- Windows 10 or Windows 11
- [Node.js LTS](https://nodejs.org/)
- npm, which is included with Node.js
- PowerShell, which is included with Windows
- VS Code, recommended for editing files
- Git or GitHub Desktop, recommended if you want version control

After installing Node.js, open a new PowerShell window and check:

```powershell
node --version
npm --version
```

Both commands should print version numbers.

## Install Dependencies

Open PowerShell in this project folder:

```powershell
cd "C:\Users\tluch\Documents\GitHub\review-radar-fixed"
```

Install the project packages:

```powershell
npm install
```

If PowerShell says running scripts are disabled, use the Windows npm command directly:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

## Create `.env.local`

The app needs an OpenAI API key to run live product research.

Create a local environment file only if `.env.local` does not already exist:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
```

Open `.env.local` in VS Code or Notepad and put your key after `OPENAI_API_KEY=`:

```text
OPENAI_API_KEY=your_api_key_here
```

Do not add quotes around the key. Do not use `NEXT_PUBLIC_` for the key. The OpenAI key must stay server-side.

Important: do not run `Copy-Item .env.local.example .env.local` again after adding your real key. That command can replace your real key with the blank example file.

Optional: you can leave `OPENAI_MODEL=` blank. The app defaults to `gpt-5.4-mini`, which gives the recommendation engine a good balance of quality, speed, and cost.

## Run The App Locally

From the project folder in PowerShell:

```powershell
npm run dev
```

If PowerShell blocks `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Keep that PowerShell window open. Then open this address in your browser:

```text
http://localhost:3000
```

## Test A Search

1. Open `http://localhost:3000`.
2. Enter a product category, such as `vacuum` or `gaming chair`.
3. Optionally enter a budget, use case, and deal breakers.
4. Click **Find Recommendations**.
5. Wait for the research to finish.

Live searches use the OpenAI API and may use paid API quota. If the app cannot find enough reliable evidence, it should show a clear message instead of making up recommendations.

## Run Local Tests

These tests check validation and safety rules. They do not call OpenAI and do not spend API quota.

```powershell
npm test
```

If PowerShell blocks `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" test
```

For the manual testing checklist, see:

```text
TESTING.md
```

## Available Commands

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm test
```

- `npm run dev` starts the local development server.
- `npm run build` checks that the production build works.
- `npm run start` runs the production build after `npm run build`.
- `npm run lint` checks code style and common issues.
- `npm test` runs local validation tests.

## Not Built Yet

This MVP does not include:

- User accounts
- Login or authentication
- Payments
- A database
- Saved searches
- Search history
- Product comparison tables
- Result caching
- Admin tools
- Affiliate links

## Common Troubleshooting

### `localhost:3000` will not open

Make sure the development server is running:

```powershell
npm run dev
```

Keep the PowerShell window open while using the app.

### PowerShell says `npm.ps1 cannot be loaded`

Use the Windows npm command directly:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

You can also use the same pattern for other commands:

```powershell
& "C:\Program Files\nodejs\npm.cmd" test
```

### Port 3000 is already in use

Stop the other server, or run this app on another port:

```powershell
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

### The recommendation engine is not configured yet

Check that `.env.local` exists and contains:

```text
OPENAI_API_KEY=your_api_key_here
```

After editing `.env.local`, stop and restart the dev server.

### OpenAI quota or billing error

Check your OpenAI billing and usage limits. After funding an account or changing limits, it may take a little time before requests work normally.

### Selected model is not available

Leave `OPENAI_MODEL=` blank in `.env.local` unless you know your account can use a specific model. The default is set to `gpt-5.4-mini` because it is a practical MVP balance for structured product research.

### Search returns weak-evidence or no-results message

Try a more specific product category or add a use case. Some niche products may not have enough reliable public sources.

### Something went wrong while researching

Restart the dev server and try again. The app uses structured JSON output, so if a response is interrupted or the OpenAI API has a temporary issue, the app rejects the result instead of showing broken product cards.

### Dependencies seem broken

Try reinstalling packages:

```powershell
npm install
```

If PowerShell blocks `npm`, use:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

## API Key Safety

Never commit API keys.

Keep real keys only in `.env.local`. This file is intended for your computer only and should not be pushed to GitHub.

Do not paste API keys into screenshots, browser windows, GitHub issues, README files, or chat messages.

Do not rename the key to `NEXT_PUBLIC_OPENAI_API_KEY`; anything starting with `NEXT_PUBLIC_` can be exposed to the browser.

## MVP Limits

- Results depend on public source availability.
- Citations are rejected if they cannot be verified from web search output.
- Confidence scores are simple evidence signals, not scientific measurements.
- The app may refuse to recommend products when evidence is weak or missing.
