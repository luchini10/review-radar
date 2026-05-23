import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewRadar",
  description: "Evidence-first product research for better buying decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
