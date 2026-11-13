import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tracking } from "@/components/Tracking";
import { MarketProvider } from "@/components/MarketContext";
import { MarketStatusBanner } from "@/components/MarketStatusBanner";
import { JsonLd } from "@/components/blocks";
import { nav } from "@/config/site";
import { markets } from "@/config/markets";
import { canonicalOrigin, isNoindexEnv, organizationSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin()),
  title: { default: "Tile & Grout Restoration in Boston | StoneCraft", template: "%s" },
  description: "Restore showers, tile, grout and natural stone in Greater Boston. Submit photos for a restoration assessment.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  robots: isNoindexEnv() ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#25292B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pub = markets.map((m) => ({
    id: m.id,
    slug: m.slug,
    shortName: m.shortName,
    name: m.name,
    phoneE164: m.phoneE164,
    phoneDisplay: m.phoneDisplay,
    email: m.email,
    status: m.status,
    statusNote: m.statusNote,
  }));
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-linen focus:p-2">Skip to content</a>
        <MarketProvider>
          <Tracking />
          <Header nav={nav} markets={pub} />
          <MarketStatusBanner markets={pub} />
          <main id="main">{children}</main>
          <Footer />
        </MarketProvider>
      </body>
    </html>
  );
}
