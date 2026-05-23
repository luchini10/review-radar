type ConfidenceBadgeProps = {
  score: number;
};

function getConfidenceStyle(score: number) {
  if (score >= 75) {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (score >= 45) {
    return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
  }

  return "border-amber-300/30 bg-amber-300/10 text-amber-100";
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getConfidenceStyle(safeScore)}`}
      aria-label={`${safeScore} percent confidence`}
    >
      {safeScore}% confidence
    </span>
  );
}
