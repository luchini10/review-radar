"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import {
  SEARCH_PROGRESS_MILESTONES,
  type SearchProgressMilestoneKey,
  type SearchProgressPollResponse,
} from "@/lib/searchProgress";

type SearchProgressPanelProps = {
  active: boolean;
  progressId: string | null;
};

const POLL_INTERVAL_MS = 1250;

function formatElapsed(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// Live narration for the research wait. It polls the progress endpoint for
// the current search and renders the pipeline's milestone roadmap; until the
// first event arrives (or for pipelines that do not report progress) it shows
// only the generic research copy, so it can never claim work that is not
// actually happening.
export function SearchProgressPanel({
  active,
  progressId,
}: SearchProgressPanelProps) {
  const [snapshot, setSnapshot] = useState<SearchProgressPollResponse | null>(
    null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Callers key this component by progressId, so each new search mounts a
  // fresh panel; the effect only has to manage its own timers.
  useEffect(() => {
    if (!active || !progressId) {
      return;
    }

    let disposed = false;

    async function poll() {
      try {
        const response = await fetch(
          `/api/recommendations/progress?id=${encodeURIComponent(progressId ?? "")}`,
          { cache: "no-store" },
        );
        if (!response.ok || disposed) {
          return;
        }
        const body = (await response.json()) as SearchProgressPollResponse;
        if (!disposed && body && Array.isArray(body.events)) {
          setSnapshot(body);
        }
      } catch {
        // Polling is best-effort; keep the last known state.
      }
    }

    void poll();
    const pollTimer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const elapsedTimer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      disposed = true;
      window.clearInterval(pollTimer);
      window.clearInterval(elapsedTimer);
    };
  }, [active, progressId]);

  if (!active) {
    return null;
  }

  const events = snapshot?.events ?? [];
  const reached = new Set<SearchProgressMilestoneKey>(
    events.map((event) => event.milestone),
  );
  const currentKey =
    snapshot?.status === "running" && events.length > 0
      ? events[events.length - 1].milestone
      : null;

  return (
    <div
      className="relative mt-6 overflow-hidden rounded-[2rem] bg-ink p-5 text-white shadow-[0_22px_60px_rgba(12,27,22,0.17)] sm:p-7"
      data-testid="search-progress-panel"
    >
      <div aria-hidden="true" className="rr-radar absolute -right-28 -top-32 h-80 w-80 rounded-full opacity-50" />
      <div className="flex items-start gap-3">
        <LoaderCircle
          aria-hidden="true"
          className="relative mt-0.5 h-5 w-5 shrink-0 animate-spin text-signal"
        />
        <div className="relative text-sm leading-6 text-white/58">
          <p className="font-semibold text-white">
            The radar is working through your brief.
          </p>
          <p className="mt-0.5">
            Checking reviews, prices, specs, and owner feedback — usually one
            to three minutes.
            <span aria-hidden="true"> {formatElapsed(elapsedSeconds)} so far.</span>{" "}
            You can keep this tab open.
          </p>
        </div>
      </div>

      {events.length > 0 ? (
        <ol className="relative mt-5 grid gap-2 border-t border-white/10 pt-5">
          {SEARCH_PROGRESS_MILESTONES.map((milestone) => {
            const isCurrent = milestone.key === currentKey;
            const isDone = !isCurrent && reached.has(milestone.key);

            return (
              <li
                className="flex items-start gap-2.5 text-sm leading-6"
                key={milestone.key}
              >
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center"
                >
                  {isCurrent ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-signal" />
                  ) : isDone ? (
                    <Check className="h-4 w-4 text-signal" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={
                      isCurrent
                        ? "font-semibold text-white"
                        : isDone
                          ? "text-white/65"
                          : "text-white/52"
                    }
                  >
                    {milestone.label}
                  </span>
                  {isCurrent ? (
                    <span className="block text-xs leading-5 text-white/68">
                      {milestone.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
