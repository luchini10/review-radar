export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="space-y-5 border-b border-white/10 pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
            ReviewRadar
          </p>
          <h1 className="text-5xl font-bold tracking-normal sm:text-6xl">
            ReviewRadar
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-slate-300">
            Find the products people actually recommend.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/20">
          <h2 className="text-2xl font-semibold">MVP setup is ready.</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This is the clean Phase 1 homepage placeholder. The search form,
            recommendation engine, OpenAI integration, and product results will
            be added in later phases.
          </p>
        </div>
      </section>
    </main>
  );
}
