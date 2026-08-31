import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ReviewRadar — Evidence-first product research",
    template: "%s | ReviewRadar",
  },
  description:
    "ReviewRadar finds distinct products that match your requirements, with trustworthy product links and current prices when available.",
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
