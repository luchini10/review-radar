# AGENTS.md

Instructions for Codex and any future coding agents working on ReviewRadar.

## Primary Rule

Always follow `PROJECT_PLAN.md`.

## Workflow Rules

- Work one step at a time.
- Stop after each step.
- Do not move to the next step until the user approves.
- Summarize files changed at the end of each step.
- Explain how to test the completed step.
- Keep changes scoped to the current approved step.
- Do not build ahead into later steps.
- Do not rewrite working code unless there is a clear reason.
- Do not delete files unless the reason is explained first.

## Repository Rules

- Before continuing implementation, confirm Codex is looking at the intended local repository.
- If the local repository does not contain the expected app files, stop and ask for sync or location clarification.
- Treat `PROJECT_PLAN.md` as the source of truth for the current build order.
- If a ChatGPT project and local repo differ, reconcile the repo state before making app changes.

## Safety Rules

- Never expose API keys.
- Never invent product recommendations.
- Never invent citations.
- Keep OpenAI calls server-side.
- Use structured JSON output.
- Validate structured JSON output before rendering.
- Validate evidence and citation rules before rendering.
- Add clear loading and error states.
- Do not use `NEXT_PUBLIC_` for secret environment variables.
- Do not send raw OpenAI responses to the client.
- Do not log secrets, request headers, API keys, or full raw model responses.

## Product Trust Rules

- ReviewRadar should behave like a buying-decision engine, not a basic chatbot wrapper.
- Recommendations must be evidence-backed.
- Source links and citations must only appear when actually available.
- Do not present unsupported recommendations as confident picks.
- Recommendations should reference valid source IDs.
- If evidence is weak, missing, or conflicting, say so clearly.
- Confidence scoring should be transparent and simple, not fake precision.
- Preserve meaningful disagreement between sources instead of hiding it.

## Markdown Documentation Rules

The repo markdown files are the source of truth. Desktop copies are convenience snapshots only.

Important markdown files:

- `ReviewRadar-Overview.md`: update when ReviewRadar's architecture, pipeline behavior, major modules, APIs, or important system rules change.
- `docs/qa-loop-results.md`: update after live QA sessions, result-quality investigations, or bug-fix loops where the repo should remember what failed, what was tested, and what was fixed.
- `docs/change-log.md`: update for meaningful changes only, written in plain English.

Update `docs/change-log.md` after:

- major pipeline changes
- ranking/search/evidence changes
- UI feature changes
- important bug fixes
- live QA fixes worth remembering

Do not update `docs/change-log.md` for typo fixes, formatting-only edits, tiny internal cleanup, or behaviorless refactors.

Change-log entries should be dated and use short sections such as `Changed` and `Verified`. Only list verification commands that were actually run.

Whenever any of these markdown files are updated in the repo, also copy the updated repo version to `C:\Users\tluch\Desktop\RR Markdowns`:

- `ReviewRadar-Overview.md` -> `C:\Users\tluch\Desktop\RR Markdowns\ReviewRadar-Overview.md`
- `docs/qa-loop-results.md` -> `C:\Users\tluch\Desktop\RR Markdowns\qa-loop-results.md`
- `docs/change-log.md` -> `C:\Users\tluch\Desktop\RR Markdowns\change-log.md`

## Step 11 Rule

Step 11 is `Testing and Trust Audit`, not just normal testing.

At Step 11, verify:

- Form validation works.
- Backend validation works.
- Structured JSON validation works.
- Citation enforcement works.
- Referenced source IDs actually exist.
- Unsupported recommendations are rejected, downgraded, or labeled as insufficient evidence.
- Fake citations cannot pass validation.
- Missing sources trigger insufficient-evidence behavior.
- API keys are not exposed to browser code, network responses, or logs.
- Raw OpenAI responses are not sent to the client.
- Loading, empty, weak-evidence, and error states render clearly.
- Results render safely when fields are missing.
- The app does not look or behave like a generic chatbot wrapper.

## Phase Completion Checklist

At the end of each step, report:

- What was completed
- Files changed
- How the user can test it
- Any known risks or limitations
- Whether approval is needed before continuing
