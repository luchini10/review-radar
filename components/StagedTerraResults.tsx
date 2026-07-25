import { Sparkles } from "lucide-react";

import { TwoLayerResults } from "@/components/TwoLayerResultPreview";
import type { StagedTerraCompletedResponse } from "@/lib/stagedTerraApiContract";

export function StagedTerraResults({
  result,
}: {
  result: StagedTerraCompletedResponse;
}) {
  return (
    <div className="grid gap-10">
      <TwoLayerResults cards={result.cards} sources={result.sources} />
      {result.finalAdvice.length > 0 ? (
        <section
          aria-labelledby="staged-terra-final-advice"
          className="rounded-[2rem] border border-forest/15 bg-[#edf3e7] p-6 sm:p-8"
        >
          <div className="flex items-center gap-2 text-forest">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <h2
              className="font-display text-2xl font-semibold tracking-[-0.03em]"
              id="staged-terra-final-advice"
            >
              Final buying advice
            </h2>
          </div>
          <ul className="mt-5 grid gap-3">
            {result.finalAdvice.map((advice) => (
              <li
                className="rounded-2xl border border-forest/10 bg-paper px-5 py-4 text-sm leading-7 text-slate-700"
                key={advice}
              >
                {advice}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
