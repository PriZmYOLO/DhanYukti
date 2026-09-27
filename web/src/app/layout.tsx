import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Mukta } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mukta = Mukta({ variable: "--font-mukta", subsets: ["devanagari", "latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "DhanYukti — धनयुक्ति",
  description: "Parivaar ka paisa saathi — your family's money companion",
  appleWebApp: { capable: true, title: "DhanYukti", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ece7fb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${jakarta.variable} ${mukta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
