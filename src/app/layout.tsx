import type { Metadata } from "next";
import {
  Fraunces,
  Geist_Mono,
  Inter,
  Noto_Nastaliq_Urdu,
} from "next/font/google";

import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Variable font: the weight axis (covers the 600/700 we use) comes with
// `axes` — Next forbids combining `axes` with a fixed weight list.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// DESIGN.md: Urdu is never rendered in Inter. Nastaliq is a calligraphic
// script whose glyphs stack diagonally, so it clips at normal line heights —
// the `font-urdu` utility in globals.css carries the 1.9 leading with it.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "600"],
  variable: "--font-noto-nastaliq",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SehatBook — Healthcare, one click away",
    template: "%s — SehatBook",
  },
  description:
    "Find trusted, verified doctors across Pakistan and book appointments online.",
  // No og:title/og:description here on purpose: Next fills those from each
  // page's own resolved title and description, so pinning them at the root
  // would stamp the landing's copy onto every doctor profile.
  openGraph: {
    siteName: "SehatBook",
    type: "website",
    locale: "en_PK",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Next 16 stopped overriding scroll-behavior on navigation; without this
    // attribute the scroll-smooth in globals.css animates every route change.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} ${notoNastaliqUrdu.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
