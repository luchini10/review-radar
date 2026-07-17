import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TwoLayerResultPreview } from "@/components/TwoLayerResultPreview";
import {
  isTwoLayerPreviewAvailable,
  twoLayerPreviewCards,
  twoLayerPreviewSources,
} from "@/lib/twoLayerPreviewData";

export const metadata: Metadata = {
  title: "Two-layer result preview",
};

export const dynamic = "force-dynamic";

export default function TwoLayerPreviewPage() {
  if (!isTwoLayerPreviewAvailable(process.env.NODE_ENV)) {
    notFound();
  }

  return (
    <TwoLayerResultPreview
      cards={twoLayerPreviewCards}
      sources={twoLayerPreviewSources}
    />
  );
}
