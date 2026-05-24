type ConfidenceBadgeProps = {
  score: number;
};

function getConfidenceStyle(score: number) {
  if (score >= 75) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (score >= 45) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
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
