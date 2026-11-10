import { PricingViewBeacon } from "@/components/estimate/PricingViewBeacon";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, ClipboardCheck, MessageCircle, Sparkles, CalendarCheck, ShieldCheck } from "lucide-react";
import type { FAQ } from "@/config/services";
import { services, publicPriceRanges } from "@/config/services";
import { verifiedTrust, site } from "@/config/site";
import { segments } from "@/config/segments";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Section({ tone = "cream", children, className = "", id }: { tone?: "cream" | "hunter" | "linen" | "white"; children: React.ReactNode; className?: string; id?: string }) {
  const bg = { cream: "bg-cream text-hunter", hunter: "bg-hunter text-white", linen: "bg-linen text-hunter", white: "bg-white text-hunter" }[tone];
  return <section id={id} className={`${bg} py-16 md:py-20 ${className}`}><div className="container-sc">{children}</div></section>;
}

export function Heading({ eyebrow, title, sub, light, center }: { eyebrow?: string; title: string; sub?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={`mb-10 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={`eyebrow mb-3 ${light ? "text-linen" : "text-patina"}`}>{eyebrow}</p>}
      <h2 className={`font-serif text-3xl leading-tight md:text-4xl ${light ? "text-white" : "text-hunter"}`}>{title}</h2>
      {sub && <p className={`mt-4 text-lg ${light ? "text-sage" : "text-hunter/75"}`}>{sub}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, primary, secondary, children, note }: { eyebrow?: string; title: string; sub?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string }; children?: React.ReactNode; note?: string }) {
  return (
    <section className="bg-hunter text-white">
      <div className="container-sc grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-20">
        <div>
          {eyebrow && <p className="eyebrow mb-4 text-linen">{eyebrow}</p>}
          <h1 className="font-serif text-4xl leading-[1.1] md:text-[52px]">{title}</h1>
          {sub && <p className="mt-5 max-w-2xl text-lg text-sage">{sub}</p>}
          {(primary || secondary) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {primary && <Link href={primary.href} className="btn btn-linen">{primary.label}</Link>}
              {secondary && <Link href={secondary.href} className="btn btn-ghost">{secondary.label}</Link>}
            </div>
          )}
          {note && <p className="mt-5 max-w-xl rounded border border-amber/40 bg-hunter-mid p-3 text-sm text-linen">{note}</p>}
        </div>
        {children && <div>{children}</div>}
      </div>
    </section>
  );
}

export function TrustBar() {
  const items = verifiedTrust();
  return (
    <div className="bg-linen">
      <div className="container-sc flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-5 text-sm font-medium text-hunter">
        {items.map((t) => <span key={t.id} className="flex items-center gap-2"><CheckCircle2 size={16} />{t.label}</span>)}
      </div>
    </div>
  );
}

export function ServiceGrid({ filter, light }: { filter?: "residential" | "commercial"; light?: boolean }) {
  const list = services.filter((s) => !filter || s.category === "both" || s.category === filter);
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((s) => (
        <Link key={s.slug} href={`/services/${s.slug}`} className={`group rounded-lg border p-6 transition hover:-translate-y-0.5 ${light ? "border-hunter-light bg-hunter-mid hover:border-linen" : "border-cream-dark bg-white shadow-card hover:border-hunter"}`}>
          <h3 className={`font-serif text-xl ${light ? "text-white" : "text-hunter"}`}>{s.name}</h3>
          <p className={`mt-2 text-sm ${light ? "text-sage" : "text-hunter/70"}`}>{s.short}</p>
          <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${light ? "text-linen" : "text-patina"}`}>Learn more <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span>
        </Link>
      ))}
    </div>
  );
}

export function SegmentGrid({ ids }: { ids: string[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {ids.map((id) => segments.find((s) => s.id === id)).filter(Boolean).map((s) => (
        <Link key={s!.id} href={s!.path} className="group flex flex-col rounded-lg border border-cream-dark bg-white p-6 shadow-card transition hover:border-hunter">
          <p className="eyebrow text-patina">{s!.label}</p>
          <h3 className="mt-2 font-serif text-xl leading-snug">{s!.h1}</h3>
          <p className="mt-3 flex-1 text-sm text-hunter/70">{s!.sub}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-patina">{s!.primaryCta.label.split(" — ")[0]} <ArrowRight size={14} /></span>
        </Link>
      ))}
    </div>
  );
}

export function ProcessSteps({ steps, light }: { steps?: string[]; light?: boolean }) {
  const icons = [Camera, MessageCircle, CalendarCheck, Sparkles];
  const list = steps ?? ["Send 3–4 photos of the surfaces", "We review and reply with an honest assessment", "Approve a written scope and price, then pick a date", "We restore, walk it through with you, and leave care instructions"];
  return (
    <ol className="grid gap-6 md:grid-cols-4">
      {list.map((s, i) => { const Icon = icons[i % icons.length]; return (
        <li key={s} className={`rounded-lg p-6 ${light ? "bg-hunter-mid" : "bg-white shadow-card"}`}>
          <span className="font-serif text-4xl text-linen">{String(i + 1).padStart(2, "0")}</span>
          <Icon className={`mt-3 ${light ? "text-linen" : "text-hunter"}`} size={22} />
          <p className={`mt-3 text-sm font-medium ${light ? "text-cream" : "text-hunter"}`}>{s}</p>
        </li>
      ); })}
    </ol>
  );
}

export function Faq({ items, light }: { items: FAQ[]; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-cream-dark rounded-lg border border-cream-dark bg-white">
      {items.map((f) => (
        <details key={f.q} className="group p-5">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 font-semibold ${light ? "text-hunter" : ""}`}>{f.q}<span className="text-patina transition group-open:rotate-45">+</span></summary>
          <p className="mt-3 text-hunter/80">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function RestoreVsReplace() {
  const rows = [
    ["Typical disruption", "Hours to a couple of days; no demolition", "Days to weeks; demolition, debris and trades"],
    ["When it's right", "Tile and substrate are sound; the problem is grout, caulk, film, etching or sealant", "Tile is loose or cracked across large areas, walls are soft, or there's water damage"],
    ["What you keep", "Existing tile, stone and layout", "Nothing — new materials and layout"],
    ["How we decide", "Photos first, then inspection", "If replacement is the right answer, we say so"],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-lg bg-white text-left text-sm shadow-card">
        <thead className="bg-hunter text-linen"><tr><th className="p-4"> </th><th className="p-4 font-serif text-lg">Restoration</th><th className="p-4 font-serif text-lg">Replacement</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} className="border-t border-cream-dark"><th className="p-4 font-semibold">{r[0]}</th><td className="p-4">{r[1]}</td><td className="p-4 text-hunter/70">{r[2]}</td></tr>)}</tbody>
      </table>
      <p className="mt-3 text-xs text-hunter/60">Every surface is different. We can't promise that a project avoids replacement or finishes in one visit until we've seen it.</p>
    </div>
  );
}

export function PriceGuide({ show }: { show: boolean }) {
  if (!show) return <p className="rounded-lg border border-cream-dark bg-white p-5 text-sm">Pricing is set after we review your photos. You'll receive a written scope and price before anything is booked.</p>;
  return (
    <div id="price-guide" className="scroll-mt-24 rounded-lg border border-hunter bg-white p-6">
      <PricingViewBeacon where="price-guide" />
      <h3 className="font-serif text-xl">What Greater Boston projects typically cost</h3>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.values(publicPriceRanges).map((r) => <div key={r.label} className="flex justify-between gap-3 border-b border-cream-dark py-2"><dt>{r.label}</dt><dd className="font-semibold">{r.range}</dd></div>)}</dl>
      <p className="mt-3 text-xs text-hunter/60">Guidance only. Actual pricing depends on size, condition and access; your assessment includes a written quote.</p>
    </div>
  );
}

export function FinalCta({ title = "Ready to see what's possible?", sub, commercial }: { title?: string; sub?: string; commercial?: boolean }) {
  return (
    <Section tone="hunter">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl md:text-4xl">{title}</h2>
        <p className="mt-4 text-sage">{sub ?? `Free photo assessment. No obligation. ${site.responsePromise}`}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {commercial
            ? <><Link href="/commercial-site-assessment" className="btn btn-linen">Request a Commercial Site Assessment</Link><Link href="/commercial-site-assessment?program=multi-property" className="btn btn-ghost">Discuss a Multi-Property Program</Link></>
            : <><Link href="/free-assessment" className="btn btn-linen">Send Photos — Get a Free Assessment</Link><Link href="/commercial" className="btn btn-ghost">Commercial Property Services</Link></>}
        </div>
      </div>
    </Section>
  );
}

export function CredentialNote() {
  return <p className="flex items-start gap-2 text-xs text-hunter/60"><ShieldCheck size={14} className="mt-0.5 shrink-0" />Certificates of insurance and registration details are provided during vendor onboarding or on request.</p>;
}

export function Checklist({ items, light }: { items: string[]; light?: boolean }) {
  return <ul className="space-y-2">{items.map((i) => <li key={i} className={`flex gap-2 ${light ? "text-cream" : ""}`}><ClipboardCheck size={18} className={`mt-0.5 shrink-0 ${light ? "text-linen" : "text-patina"}`} />{i}</li>)}</ul>;
}
