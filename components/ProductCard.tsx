"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";
import type { SelectionProductRecommendation } from "@/types/review-radar";

export function ProductCard({
  product,
}: {
  product: SelectionProductRecommendation;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  const imageUrl = product.imageUrl;
  return (
    <article className="product-card">
      <div className="product-image">
        {imageUrl && failedImage !== imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={400}
            height={300}
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(imageUrl)}
          />
        ) : (
          <div className="product-image-placeholder" role="img" aria-label="Product image unavailable">
            <Package size={48} strokeWidth={1.25} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="product-content">
        <h3>{product.name}</h3>
        <a
          className="primary-button product-link"
          href={product.productPageUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          View product
        </a>
      </div>
    </article>
  );
}
