import { PricingViewBeacon } from "@/components/estimate/PricingViewBeacon";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, ClipboardCheck, MessageCircle, Sparkles, CalendarCheck, ShieldCheck } from "lucide-react";
import type { FAQ } from "@/config/services";
import { services, publicPriceRanges } from "@/config/services";
import { verifiedTrust, site } from "@/config/site";
import { segments } from "@/config/segments";
import { segmentImage, serviceImage, type PhotoKey } from "@/config/photos";
import { Photo } from "./Photo";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Section({ tone = "cream", children, className = "", id }: { tone?: "cream" | "hunter" | "linen" | "white"; children: React.ReactNode; className?: string; id?: string }) {
  const bg = { cream: "bg-cream text-hunter", hunter: "bg-basalt text-white", linen: "bg-bone-2 text-hunter", white: "bg-white text-hunter" }[tone];
  return <section id={id} className={`${bg} scroll-mt-24 py-20 md:py-28 ${className}`}><div className="container-sc">{children}</div></section>;
}

export function Heading({ eyebrow, title, sub, light, center }: { eyebrow?: string; title: string; sub?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={`mb-12 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={`eyebrow mb-5 ${light ? "text-bronze-light" : "text-bronze"}`}>{!center && <span className="rule-bronze" />}{eyebrow}</p>}
      <h2 className={`font-serif text-[34px] leading-[1.08] md:text-[48px] ${light ? "text-bone" : "text-basalt"}`}>{title}</h2>
      {sub && <p className={`mt-5 text-[17px] leading-relaxed ${light ? "text-sage" : "text-basalt/70"}`}>{sub}</p>}
    </div>
  );
}

/**
 * Page hero. With `image` it becomes a full-bleed photographic hero; without, a basalt field
 * with a faint honed-marble texture so every route shares the same material language.
 */
export function PageHero({ eyebrow, title, sub, primary, secondary, children, note, image }: { eyebrow?: string; title: string; sub?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string }; children?: React.ReactNode; note?: string; image?: PhotoKey }) {
  return (
    <section className="relative isolate overflow-hidden bg-basalt text-white">
      {image ? (
        <div className="absolute inset-0 -z-10"><Photo k={image} priority sizes="100vw" /><div className="photo-shade-side absolute inset-0" /><div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-basalt/70 to-transparent" /></div>
      ) : (
        <div className="absolute inset-0 -z-10 opacity-[0.13] mix-blend-luminosity"><Photo k="texture-marble-veined" sizes="100vw" /></div>
      )}
      <div className={`container-sc grid gap-12 md:items-center ${children ? "md:grid-cols-[1.25fr_1fr]" : ""} ${image ? "py-24 md:py-32" : "py-20 md:py-24"}`}>
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow mb-6 text-bronze-light"><span className="rule-bronze" />{eyebrow}</p>}
          <h1 className="font-serif text-[42px] leading-[1.03] text-bone md:text-[64px]">{title}</h1>
          {sub && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-bone/75">{sub}</p>}
          {(primary || secondary) && (
            <div className="mt-10 flex flex-wrap gap-3">
              {primary && <Link href={primary.href} className="btn btn-linen">{primary.label} <ArrowRight size={15} /></Link>}
              {secondary && <Link href={secondary.href} className="btn btn-ghost">{secondary.label}</Link>}
            </div>
          )}
          {note && <p className="mt-6 max-w-xl border-l-2 border-bronze-light bg-white/5 p-4 text-sm text-bone/85">{note}</p>}
        </div>
        {children && <div>{children}</div>}
      </div>
      {image && <span className="stock-note absolute bottom-3 right-4">Illustrative photo</span>}
    </section>
  );
}

export function TrustBar() {
  const items = verifiedTrust();
  return (
    <div className="border-y border-cream-dark bg-white">
      <div className="container-sc grid grid-cols-2 divide-cream-dark md:grid-cols-4 md:divide-x">
        {items.map((t, i) => (
          <div key={t.id} className="px-2 py-7 md:px-6">
            <p className="font-serif text-2xl text-bronze">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-2 text-sm font-semibold text-basalt">{t.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-basalt/60">{t.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceGrid({ filter, light }: { filter?: "residential" | "commercial"; light?: boolean }) {
  const list = services.filter((s) => !filter || s.category === "both" || s.category === filter);
  return (
    <div className="grid gap-px overflow-hidden border border-cream-dark bg-cream-dark sm:grid-cols-2 lg:grid-cols-4">
      {list.map((s) => (
        <Link key={s.slug} href={`/services/${s.slug}`} className={`group relative flex min-h-[340px] flex-col justify-end overflow-hidden ${light ? "bg-basalt-2" : "bg-basalt"}`}>
          <div className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]"><Photo k={serviceImage[s.slug] ?? "texture-marble-white"} sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" /></div>
          <div className="photo-shade absolute inset-0" />
          <div className="relative p-6">
            <h3 className="font-serif text-[26px] leading-tight text-bone">{s.name}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-bone/75">{s.short}</p>
            <span className="link-arrow mt-4 text-bronze-light">Explore <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </div>
        </Link>
      ))}
      {list.length % 4 !== 0 && (
        <Link href="/free-assessment" className="group flex min-h-[340px] flex-col justify-between bg-bone-2 p-7">
          <p className="eyebrow text-bronze">Not sure which?</p>
          <div>
            <p className="font-serif text-[28px] leading-tight text-basalt">Send three or four photos. We&apos;ll tell you what the surface actually needs.</p>
            <span className="link-arrow mt-5 text-basalt">Free photo assessment <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
          </div>
        </Link>
      )}
    </div>
  );
}

export function SegmentGrid({ ids }: { ids: string[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {ids.map((id) => segments.find((s) => s.id === id)).filter(Boolean).map((s) => (
        <Link key={s!.id} href={s!.path} className="group flex flex-col bg-white shadow-card transition hover:shadow-premium">
          <div className="relative aspect-[4/3] overflow-hidden"><div className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]"><Photo k={segmentImage[s!.id] ?? "texture-marble-white"} sizes="(min-width:768px) 33vw, 100vw" /></div></div>
          <div className="flex flex-1 flex-col p-7">
            <p className="eyebrow text-bronze">{s!.label}</p>
            <h3 className="mt-3 font-serif text-[26px] leading-tight">{s!.h1}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-basalt/70">{s!.sub}</p>
            <span className="link-arrow mt-6 text-basalt">{s!.primaryCta.label.split(" — ")[0]} <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
          </div>
        </Link>
      ))}
      {ids.length % 3 === 2 && (
        <Link href="/commercial-site-assessment?program=multi-property" className="group flex flex-col justify-between bg-basalt p-8 text-bone shadow-card transition hover:shadow-premium">
          <div>
            <p className="eyebrow text-bronze-light">Another facility type?</p>
            <h3 className="mt-4 font-serif text-[28px] leading-tight">Offices, retail, fitness, residential towers—if it&apos;s tile, grout or stone, we&apos;ll scope it.</h3>
            <p className="mt-4 text-sm leading-relaxed text-bone/70">Tell us what you manage. We&apos;ll come back with a site walk and a written, phased scope.</p>
          </div>
          <span className="link-arrow mt-8 text-bronze-light">Request a site assessment <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
        </Link>
      )}
    </div>
  );
}

export function ProcessSteps({ steps, light }: { steps?: string[]; light?: boolean }) {
  const icons = [Camera, MessageCircle, CalendarCheck, Sparkles];
  const list = steps ?? ["Send 3–4 photos of the surfaces", "We review and reply with an honest assessment", "Approve a written scope and price, then pick a date", "We restore, walk it through with you, and leave care instructions"];
  return (
    <ol className={`grid border-t md:grid-cols-4 ${light ? "border-white/15" : "border-basalt/15"}`}>
      {list.map((s, i) => { const Icon = icons[i % icons.length]; return (
        <li key={s} className={`relative border-b py-8 pr-6 md:border-b-0 md:border-r md:pl-6 md:first:pl-0 md:last:border-r-0 ${light ? "border-white/15" : "border-basalt/15"}`}>
          <div className="flex items-center justify-between">
            <span className={`font-serif text-5xl ${light ? "text-bronze-light" : "text-bronze"}`}>{String(i + 1).padStart(2, "0")}</span>
            <Icon className={light ? "text-bone/50" : "text-basalt/40"} size={20} strokeWidth={1.5} />
          </div>
          <p className={`mt-5 text-[15px] font-medium leading-relaxed ${light ? "text-bone" : "text-basalt"}`}>{s}</p>
        </li>
      ); })}
    </ol>
  );
}

export function Faq({ items, light }: { items: FAQ[]; light?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl border-t border-basalt/15">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-basalt/15 py-6">
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-[22px] leading-snug ${light ? "text-hunter" : ""}`}>{f.q}<span className="grid h-8 w-8 shrink-0 place-items-center border border-basalt/20 font-sans text-lg text-bronze transition group-open:rotate-45">+</span></summary>
          <p className="mt-4 max-w-2xl leading-relaxed text-basalt/75">{f.a}</p>
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
      <table className="w-full min-w-[640px] border-collapse bg-white text-left text-sm shadow-card">
        <thead className="bg-basalt text-bone"><tr><th className="p-5"> </th><th className="p-5 font-serif text-2xl font-medium text-bronze-light">Restoration</th><th className="p-5 font-serif text-2xl font-medium">Replacement</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} className="border-t border-cream-dark"><th className="p-5 font-semibold">{r[0]}</th><td className="p-5 leading-relaxed">{r[1]}</td><td className="p-5 leading-relaxed text-basalt/65">{r[2]}</td></tr>)}</tbody>
      </table>
      <p className="mt-4 text-xs text-basalt/60">Every surface is different. We can't promise that a project avoids replacement or finishes in one visit until we've seen it.</p>
    </div>
  );
}

export function PriceGuide({ show }: { show: boolean }) {
  if (!show) return <p className="border border-cream-dark bg-white p-6 text-sm">Pricing is set after we review your photos. You'll receive a written scope and price before anything is booked.</p>;
  return (
    <div id="price-guide" className="scroll-mt-24 self-start border-t-2 border-bronze bg-white p-7 shadow-card">
      <PricingViewBeacon where="price-guide" />
      <h3 className="font-serif text-2xl">What Greater Boston projects typically cost</h3>
      <dl className="mt-5 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">{Object.values(publicPriceRanges).map((r) => <div key={r.label} className="flex justify-between gap-3 border-b border-cream-dark py-2.5"><dt>{r.label}</dt><dd className="font-semibold">{r.range}</dd></div>)}</dl>
      <p className="mt-4 text-xs text-basalt/60">Guidance only. Actual pricing depends on size, condition and access; your assessment includes a written quote.</p>
    </div>
  );
}

export function FinalCta({ title = "Ready to see what's possible?", sub, commercial }: { title?: string; sub?: string; commercial?: boolean }) {
  return (
    <section className="relative isolate overflow-hidden bg-basalt py-24 text-white md:py-32">
      <div className="absolute inset-0 -z-10"><Photo k={commercial ? "hotel-lobby" : "shower-marble-glass"} sizes="100vw" /><div className="absolute inset-0 bg-basalt/75" /></div>
      <div className="container-sc">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-bronze-light">Free photo assessment</p>
          <h2 className="mt-5 font-serif text-4xl leading-[1.05] text-bone md:text-[56px]">{title}</h2>
          <p className="mt-5 text-bone/75">{sub ?? `No obligation. ${site.responsePromise}`}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {commercial
              ? <><Link href="/commercial-site-assessment" className="btn btn-linen">Request a Commercial Site Assessment</Link><Link href="/commercial-site-assessment?program=multi-property" className="btn btn-ghost">Discuss a Multi-Property Program</Link></>
              : <><Link href="/free-assessment" className="btn btn-linen">Send Photos — Get a Free Assessment</Link><Link href="/commercial" className="btn btn-ghost">Commercial Property Services</Link></>}
          </div>
        </div>
      </div>
      <span className="stock-note absolute bottom-3 right-4">Illustrative photo</span>
    </section>
  );
}

export function CredentialNote() {
  return <p className="flex items-start gap-2 text-xs text-basalt/60"><ShieldCheck size={14} className="mt-0.5 shrink-0" />Certificates of insurance and registration details are provided during vendor onboarding or on request.</p>;
}

export function Checklist({ items, light }: { items: string[]; light?: boolean }) {
  return <ul className="space-y-3">{items.map((i) => <li key={i} className={`flex gap-3 leading-relaxed ${light ? "text-bone/90" : ""}`}><ClipboardCheck size={18} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${light ? "text-bronze-light" : "text-bronze"}`} />{i}</li>)}</ul>;
}

/** Split editorial block: photo on one side, copy on the other. */
export function Editorial({ image, reverse, children, tall }: { image: PhotoKey; reverse?: boolean; children: React.ReactNode; tall?: boolean }) {
  return (
    <div className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div className={`relative overflow-hidden ${tall ? "aspect-[4/5]" : "aspect-[5/4]"}`}><Photo k={image} sizes="(min-width:768px) 50vw, 100vw" note /></div>
      <div>{children}</div>
    </div>
  );
}
