"use client";

import type { ReactNode } from "react";
import { LandingArtwork } from "./LandingArtwork";

export function DiscoveryHero({ children }: { children: ReactNode }) {
  return (
    <section className="discovery-hero" aria-labelledby="discovery-heading">
      <LandingArtwork />
      <div className="hero-copy">
        <h1 id="discovery-heading">Find what’s<br />worth buying.</h1>
        <p className="hero-description">Research less. Choose better.</p>
        {children}
      </div>
    </section>
  );
}
