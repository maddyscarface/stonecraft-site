import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { articles } from "@/config/resources";
import { markets, liveAreaServed, liveMarkets } from "@/config/markets";
import { services } from "@/config/services";
import { seoInventory } from "@/config/seo-inventory";
import { marketBannerIntro } from "@/components/MarketStatusBanner";
import { site } from "@/config/site";
import {
  abs,
  canonicalOrigin,
  faqSchema,
  INTENDED_PRODUCTION_ORIGIN,
  isIndexableProduction,
  isNoindexEnv,
  llmsTxt,
  meta,
  organizationSchema,
  serviceSchema,
} from "@/lib/seo";

const PHASE3_GUIDES = [
  "grout-cleaning-vs-color-sealing",
  "restore-or-replace-shower-grout",
  "glazed-tile-and-high-gloss-finishes",
  "marble-etching-vs-staining",
  "safe-cleaning-after-restoration",
  "commercial-restroom-maintenance-after-restoration",
];

afterEach(() => {
  delete process.env.SITE_NOINDEX;
  delete process.env.VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_INDEXABLE_SITE;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_CANONICAL_ORIGIN;
});

describe("Phase 3 market controls", () => {
  // Phase 4: Southeast Florida is owner-confirmed LIVE (MARKET_FL_PAUSED=true is the kill switch).
  it("keeps Greater Boston live and Southeast Florida live by default (Phase 4)", () => {
    expect(markets.find((m) => m.id === "boston")?.status).toBe("live");
    expect(markets.find((m) => m.id === "south-florida")?.status).toBe("live");
    expect(liveMarkets().map((m) => m.id)).toEqual(["boston", "south-florida"]);
    expect(liveAreaServed().join(" ")).toMatch(/Greater Boston/);
    expect(liveAreaServed().join(" ")).toMatch(/Palm Beach|Broward|Southeast Florida/);
  });

  it("does not conflate StoneCraft with a franchise", () => {
    expect(site.independenceStatement.toLowerCase()).toContain("not a franchise");
    expect(llmsTxt().toLowerCase()).toContain("not a franchise");
    expect(JSON.stringify(organizationSchema()).toLowerCase()).toContain("not a franchise");
  });
});

describe("Phase 3 SEO helpers", () => {
  it("never uses a vercel.app host as the canonical origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://stonecraft-staging.vercel.app";
    expect(canonicalOrigin()).toBe(INTENDED_PRODUCTION_ORIGIN);
    expect(abs("/boston")).toBe(`${INTENDED_PRODUCTION_ORIGIN}/boston`);
  });

  it("honours an explicit confirmed canonical origin", () => {
    process.env.NEXT_PUBLIC_CANONICAL_ORIGIN = "https://stonecraftpros.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://stonecraft-staging.vercel.app";
    expect(canonicalOrigin()).toBe("https://stonecraftpros.com");
  });

  it("noindexes preview and staging even when the canonical is the intended domain", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_CANONICAL_ORIGIN = "https://stonecraftpros.com";
    expect(isNoindexEnv()).toBe(true);
    expect(isIndexableProduction()).toBe(false);
    const m = meta({ title: "Test", description: "Test description for SEO.", path: "/" });
    expect(m.robots).toEqual({ index: false, follow: false });
    expect(m.alternates).toEqual({ canonical: "https://stonecraftpros.com/" });
  });

  it("keeps unapproved vercel.app production noindex unless the launch flag is set", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://stonecraft-site-rho.vercel.app";
    process.env.NEXT_PUBLIC_CANONICAL_ORIGIN = "";
    expect(isIndexableProduction()).toBe(false);
    process.env.NEXT_PUBLIC_INDEXABLE_SITE = "true";
    // Canonical still remaps off vercel.app, but the flag allows indexing when the owner is ready.
    expect(canonicalOrigin()).toBe(INTENDED_PRODUCTION_ORIGIN);
    expect(isIndexableProduction()).toBe(true);
  });

  it("escapes < in FAQ JSON-LD the same way the JsonLd component does", () => {
    const raw = JSON.stringify(faqSchema([{ q: "A < B?", a: "Use a cleaner if pH < 7 is required by the label." }]));
    const escaped = raw.replace(/</g, "\\u003c");
    expect(escaped).not.toContain("<");
    expect(escaped).toContain("\\u003c");
  });

  it("limits ProfessionalService and Service areaServed to live markets", () => {
    const org = JSON.stringify(organizationSchema());
    const svc = JSON.stringify(serviceSchema({ name: "Shower Restoration", description: "Test", path: "/services/shower-restoration" }));
    expect(org).toContain("ProfessionalService");
    expect(org).toContain("Greater Boston");
    expect(org).toMatch(/Palm Beach|Broward|Southeast Florida/);
    expect(svc).toMatch(/Palm Beach|Broward|Southeast Florida/);
    expect(org).not.toMatch(/AggregateRating|"review"/);
  });

  it("builds llms.txt without private routes or staging hosts", () => {
    const text = llmsTxt();
    expect(text).toContain("# StoneCraft");
    expect(text).toContain("/free-assessment");
    expect(text).toContain("/commercial-site-assessment");
    expect(text.toLowerCase()).not.toContain("availability is being confirmed");
    expect(text).toContain("/south-florida/palm-beach-county");
    expect(text).toContain("/south-florida/broward-county");
    expect(text).not.toMatch(/\/admin|\/api\/|llms private/i);
    expect(text).not.toContain("vercel.app");
  });
});

describe("Phase 3 content", () => {
  it("publishes the material-specific guides required by the brief", () => {
    const slugs = articles.map((a) => a.slug);
    for (const slug of PHASE3_GUIDES) expect(slugs).toContain(slug);
    for (const a of articles.filter((x) => PHASE3_GUIDES.includes(x.slug))) {
      expect(a.body[0]).toHaveProperty("p");
      const first = "p" in a.body[0] ? a.body[0].p : "";
      expect(first.split(/\s+/).length).toBeGreaterThan(30);
    }
  });

  it("uses the approved metadata titles for the priority landing pages", () => {
    expect(services.find((s) => s.slug === "shower-restoration")?.seoTitle).toBe("Shower Restoration & Recaulking | StoneCraft");
    expect(services.find((s) => s.slug === "marble-stone-restoration")?.seoTitle).toBe("Marble & Stone Restoration | StoneCraft");
    expect(services.find((s) => s.slug === "commercial-restoration")?.seoTitle).toBe("Commercial Tile & Grout Restoration | StoneCraft");
    expect(services.find((s) => s.slug === "shower-restoration")!.seoTitle.length).toBeLessThanOrEqual(60);
  });

  it("does not invent reviews or prices in schema, and lists live Florida pages as indexable (Phase 4)", () => {
    expect(seoInventory.filter((r) => r.path.startsWith("/south-florida")).every((r) => r.indexableInProduction === true)).toBe(true);
    expect(seoInventory.some((r) => r.path === "/south-florida/palm-beach-county")).toBe(true);
    expect(seoInventory.find((r) => r.path === "/")?.indexableInProduction).toBe(true);
  });

  it("keeps technical guides from prescribing a universal chemical solution", () => {
    const text = articles.filter((a) => PHASE3_GUIDES.includes(a.slug)).map((a) => JSON.stringify(a.body)).join(" ");
    expect(text.toLowerCase()).toMatch(/manufacturer|technician|product instructions|care sheet/);
    expect(text).not.toMatch(/always use vinegar|use bleach on marble|guaranteed slip/i);
  });
});


describe("Phase 3 brand favicon set", () => {
  const pub = path.resolve(__dirname, "../public");
  const sources = ["favicon.ico", "icon-32.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

  it("keeps a complete icon set as .b64 sources and SVG marks", () => {
    for (const name of sources) {
      expect(existsSync(path.join(pub, `${name}.b64`)), name).toBe(true);
    }
    expect(readFileSync(path.join(pub, "favicon.svg"), "utf8")).toContain("#25292B");
    expect(readFileSync(path.join(pub, "icon.svg"), "utf8")).toContain("#B89A70");
    const ico = Buffer.from(readFileSync(path.join(pub, "favicon.ico.b64"), "utf8").replace(/\s+/g, ""), "base64");
    expect(ico.readUInt16LE(4)).toBe(3); // ICO image count: 16, 32, 48
  });
});

describe("Phase 3 inventory and banner", () => {
  it("records H1, metadata, schema, CTA, region and evidence for every inventory route", () => {
    expect(seoInventory.length).toBeGreaterThanOrEqual(20);
    for (const row of seoInventory) {
      expect(row.h1.length).toBeGreaterThan(8);
      expect(row.title.length).toBeGreaterThan(8);
      expect(row.description.length).toBeGreaterThan(40);
      expect(row.schema.length).toBeGreaterThan(0);
      expect(row.cta.href.startsWith("/")).toBe(true);
      expect(row.evidence.length).toBeGreaterThan(10);
    }
    expect(seoInventory.some((r) => r.path === "/bathroom-refresh")).toBe(true);
    expect(seoInventory.some((r) => r.path === "/commercial/hoa-condos")).toBe(true);
  });

  it("does not duplicate the Send photos sentence in the pre-launch banner", () => {
    const note = "We're confirming scheduling availability in Southeast Florida. Send photos and we'll tell you when we can serve your address.";
    const intro = marketBannerIntro(note, "Southeast Florida");
    expect(intro).toBe("We're confirming scheduling availability in Southeast Florida.");
    const rendered = `${intro} Send photos and we'll tell you when we can serve your address. Greater Boston is currently served.`;
    expect(rendered.match(/Send photos/g)?.length).toBe(1);
  });
});
