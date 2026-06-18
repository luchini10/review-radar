type VerdictCardProps = {
  emphasis?: boolean;
  helper?: string;
  title: string;
  verdict: string;
};

export function VerdictCard({
  emphasis = false,
  helper,
  title,
  verdict,
}: VerdictCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p
        className={
          emphasis
            ? "mt-1.5 font-display text-2xl font-semibold leading-8 text-slate-950"
            : "mt-1.5 text-sm font-medium leading-6 text-slate-800"
        }
      >
        {verdict}
      </p>
      {helper ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}
