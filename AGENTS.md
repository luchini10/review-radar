# AGENTS.md

Instructions for Codex and any future coding agents working on ReviewRadar.

## Current operating authority

Read `docs/agent-next-task.md` first. It is the compact current-state handoff.
Then read the relevant guardrails and approved phase section in
`docs/forward-roadmap.md`. If an older `PROJECT_PLAN.md` conflicts with either
file, the current handoff and forward roadmap win.

## Progressive context protocol

Do not load historical Markdown files in full by default. Preserve every record
on disk, but retrieve it by topic:

- Read all of `docs/agent-next-task.md` at session start.
- Read only the standing guardrails and the relevant phase section of
  `docs/forward-roadmap.md`.
- For `docs/agent-dialogue.md`, read the protocol plus entries after your last
  entry, or the latest entry Taylor identifies as waiting.
- For `docs/RR-Issues-Report.md`, read the summary and only active/referenced
  RR IDs. Read the full register only when maintaining the register itself.
- Use `rg` to locate exact sections in `docs/qa-loop-results.md`,
  `docs/codex-handoff-phased-plan.md`, `docs/review-radar-test-memory.md`,
  `ReviewRadar-Overview.md`, and `docs/change-log.md`; then read bounded
  excerpts. They are historical/reference records, not session-start payloads.

This is a context-efficiency rule, not permission to skip verification. When a
claim depends on earlier evidence, retrieve and cite the relevant record.

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

The repo markdown files are the source of truth. Do not copy them to Desktop
locations.

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

Update the smallest authoritative record that fits the change:

- `docs/agent-next-task.md`: current state and next approved decision.
- `docs/RR-Issues-Report.md`: issue status or count changes only.
- `docs/qa-loop-results.md`: canonical verification result for an executed phase.
- `docs/agent-dialogue.md`: peer-agent conclusions/questions only.
- `docs/review-radar-test-memory.md`: durable test or trust contracts only.
- `ReviewRadar-Overview.md`: architecture changes only.
- `docs/change-log.md`: meaningful user-facing/product changes only.
- `docs/codex-handoff-phased-plan.md`: major milestones or explicit handoffs only.

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
