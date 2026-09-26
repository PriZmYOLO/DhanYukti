import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Newsreader,
  Noto_Sans_Devanagari,
} from "next/font/google";

import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { AppHeader } from "@/components/shell/app-header";
import { MainNav } from "@/components/shell/main-nav";
import { brand } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist has no Devanagari glyphs; this keeps धनयुक्ति and Hindi text readable.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
});

// Editorial serif for headlines (the --font-serif / --font-heading token).
// Chosen because it has its own ₹ glyph; latin-ext carries U+20B9.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    template: `%s · ${brand.name}`,
    default: `${brand.name} · ${brand.tagline}`,
  },
  description: `${brand.descriptor}. ${brand.tagline}`,
  applicationName: brand.name,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <OnboardingProvider>
          <AppHeader />
          <main
            id="main"
            className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-12"
          >
            {children}
          </main>
          <MainNav variant="bottom" />
        </OnboardingProvider>
      </body>
    </html>
  );
}
