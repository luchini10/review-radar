import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/BrandMark";
import { DirectTerraReport } from "@/components/DirectTerraReport";
import {
  directTerraPreviewResult,
  isDirectTerraPreviewAvailable,
} from "@/lib/directTerraPreviewData";

export const metadata: Metadata = {
  title: "Direct Terra result preview",
};

export const dynamic = "force-dynamic";

export default function DirectTerraPreviewPage() {
  if (!isDirectTerraPreviewAvailable(process.env.NODE_ENV)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-5 py-8 sm:px-7 lg:py-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <h1 className="text-sm font-semibold tracking-[-0.02em]">
              ReviewRadar
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/65">
                Direct Terra presentation
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full bg-ink px-3 py-1.5 text-white">Development-only prototype</span>
            <span className="rounded-full bg-signal px-3 py-1.5 text-ink">Controlled example data</span>
          </div>
        </header>
        <DirectTerraReport result={directTerraPreviewResult} />
      </div>
    </main>
  );
}
