import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ReviewRadar — Evidence-first product research",
    template: "%s | ReviewRadar",
  },
  description:
    "ReviewRadar researches reviews, prices, features, and tradeoffs across public sources, then returns cited ranked Best Match recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
