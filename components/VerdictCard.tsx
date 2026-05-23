type VerdictCardProps = {
  title: string;
  verdict: string;
};

export function VerdictCard({ title, verdict }: VerdictCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-cyan-300">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{verdict}</p>
    </div>
  );
}
