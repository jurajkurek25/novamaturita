import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaMaturita – Príprava na ústnu maturitu",
  description: "AI simulácia ústnej maturity zo slovenčiny, angličtiny a odborných predmetov.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="antialiased">{children}</body>
    </html>
  );
}
