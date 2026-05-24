type VerdictCardProps = {
  title: string;
  verdict: string;
};

export function VerdictCard({ title, verdict }: VerdictCardProps) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{verdict}</p>
    </div>
  );
}
