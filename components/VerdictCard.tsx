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
    <div className="rounded-[2rem] border border-ink bg-ink p-6 text-white shadow-[0_22px_60px_rgba(12,27,22,0.18)] sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-signal">
        {title}
      </p>
      <p
        className={
          emphasis
            ? "mt-4 font-display text-3xl font-semibold leading-tight text-white"
            : "mt-4 max-w-3xl font-display text-xl font-medium leading-8 text-white/82 sm:text-2xl"
        }
      >
        {verdict}
      </p>
      {helper ? (
        <p className="mt-3 text-xs leading-5 text-white/58">{helper}</p>
      ) : null}
    </div>
  );
}
