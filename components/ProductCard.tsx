import Image from "next/image";
import { ArrowUpRight, ImageOff } from "lucide-react";

import type { SelectionProductRecommendation } from "@/types/review-radar";

function priceText(product: SelectionProductRecommendation) {
  if (!product.price) return "See product page for current price";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.price.currency,
    maximumFractionDigits:
      Number.isInteger(product.price.amount) ? 0 : 2,
  }).format(product.price.amount);
}

export function ProductCard({
  product,
}: {
  product: SelectionProductRecommendation;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-ink/10 bg-paper shadow-[0_16px_42px_rgba(12,27,22,0.08)] transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f1f3ec]">
        {product.imageUrl ? (
          <Image
            alt={product.name}
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            src={product.imageUrl}
            unoptimized
          />
        ) : (
          <div className="grid h-full place-items-center text-ink/35">
            <ImageOff aria-hidden="true" className="h-9 w-9" />
            <span className="sr-only">Product image unavailable</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest/70">
          {product.category}
        </p>
        <h3 className="mt-2 text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink">
          {product.name}
        </h3>
        <p className="mt-4 text-sm font-semibold text-ink/72">
          {priceText(product)}
        </p>

        <a
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-forest focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest/20"
          href={product.productPageUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          View product
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export const productCardTestExports = { priceText };
