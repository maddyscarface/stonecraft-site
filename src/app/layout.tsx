import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tracking } from "@/components/Tracking";
import { MarketProvider } from "@/components/MarketContext";
import { nav, site } from "@/config/site";
import { markets } from "@/config/markets";
import { services } from "@/config/services";


export const metadata: Metadata = {
  metadataBase: new URL(site.primaryDomain),
  title: { default: "StoneCraft — Tile, Grout & Stone Restoration", template: "%s" },
  description: site.supporting,
  icons: { icon: "/favicon.svg" },
  ...(process.env.SITE_NOINDEX === "true" || process.env.VERCEL_ENV === "preview" ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#191917", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navWithServices = nav.map((n) => n.label === "Services" ? { ...n, children: services.map((s) => ({ label: s.name, href: `/services/${s.slug}` })) } : n);
  const pub = markets.map((m) => ({ id: m.id, shortName: m.shortName, phoneE164: m.phoneE164, phoneDisplay: m.phoneDisplay, email: m.email }));
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:bg-linen focus:p-2">Skip to content</a>
        <MarketProvider>
          <Tracking />
          <Header nav={navWithServices} markets={pub} />
          <main id="main">{children}</main>
          <Footer />
        </MarketProvider>
      </body>
    </html>
  );
}
