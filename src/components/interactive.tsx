"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Home, KeyRound, Landmark, Layers, Minus, Plus } from "lucide-react";
import { splitCost } from "@/lib/pricing/engine";
import { track } from "@/lib/tracking/client";

/* ───────── Before / after slider ───────── */

function TilePattern({ dirty }: { dirty: boolean }) {
  const grout = dirty ? "#57514a" : "#e6e1d8";
  const tile = dirty ? "#d2cabc" : "#f7f5f0";
  const cells = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
    const stain = dirty && (x * 7 + y * 3) % 5 === 0;
    cells.push(<rect key={`${x}-${y}`} x={x * 50 + 2} y={y * 50 + 2} width={46} height={46} rx={2} fill={stain ? "#bdb3a2" : tile} />);
  }
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="400" height="300" fill={grout} />
      {cells}
      {dirty && <path d="M0 260 Q100 240 200 262 T400 255 L400 300 L0 300Z" fill="#8c7f63" opacity=".35" />}
    </svg>
  );
}

export function BeforeAfter({ before, after, alt, illustration }: { before?: string; after?: string; alt?: string; illustration?: boolean }) {
  const [pos, setPos] = useState(50);
  return (
    <figure className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-lg shadow-premium">
      <div className="absolute inset-0">{after ? <img src={after} alt={`${alt ?? ""} — after`} className="h-full w-full object-cover" /> : <TilePattern dirty={false} />}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>{before ? <img src={before} alt={`${alt ?? ""} — before`} className="h-full w-full object-cover" /> : <TilePattern dirty />}</div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}><div className="h-full w-0.5 -translate-x-1/2 bg-linen" /><div className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-hunter bg-linen" /></div>
      <span className="absolute bottom-3 left-3 rounded bg-hunter px-2 py-1 text-xs font-semibold text-white">Before</span>
      <span className="absolute bottom-3 right-3 rounded bg-linen px-2 py-1 text-xs font-semibold text-hunter">After</span>
      {illustration && <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-hunter">Illustration — not a customer project</span>}
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare before and after" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </figure>
  );
}

/* ───────── Roommate calculator ───────── */

export function RoommateCalculator({ defaultPrice = 1500, compact }: { defaultPrice?: number; compact?: boolean }) {
  const [price, setPrice] = useState(defaultPrice);
  const [n, setN] = useState(3);
  const split = useMemo(() => splitCost(price || 0, n), [price, n]);
  const fmt = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: v % 1 ? 2 : 0 });
  const uneven = new Set(split.shares).size > 1;
  return (
    <div className="rounded-lg bg-hunter p-6 text-white shadow-premium md:p-8" data-testid="roommate-calculator">
      <h3 className="font-serif text-2xl">Split it with your roommates</h3>
      {!compact && <p className="mt-1 text-sm text-sage">Enter the price from your written quote and how many people are paying.</p>}
      <label className="mt-5 block text-sm text-linen" htmlFor="rc-price">Project price</label>
      <div className="mt-1 flex items-center rounded border border-hunter-light bg-hunter-mid px-3">
        <span className="text-linen">$</span>
        <input id="rc-price" inputMode="decimal" className="w-full bg-transparent px-2 py-3 text-lg text-white outline-none" value={price || ""} onChange={(e) => { const v = Number(e.target.value.replace(/[^\d.]/g, "")); setPrice(Number.isFinite(v) ? Math.min(v, 100000) : 0); }} />
      </div>
      <p className="mt-5 text-sm text-linen" id="rc-n-label">People paying</p>
      <div className="mt-2 flex items-center gap-3" role="group" aria-labelledby="rc-n-label">
        <button type="button" aria-label="Fewer people" className="grid h-10 w-10 place-items-center rounded border border-linen" onClick={() => setN(Math.max(1, n - 1))}><Minus size={16} /></button>
        <span className="w-10 text-center font-serif text-3xl" aria-live="polite">{n}</span>
        <button type="button" aria-label="More people" className="grid h-10 w-10 place-items-center rounded border border-linen" onClick={() => setN(Math.min(8, n + 1))}><Plus size={16} /></button>
      </div>
      <div className="mt-6 rounded bg-hunter-mid p-4">
        <p className="text-sm text-sage">Each person pays</p>
        <p className="font-serif text-4xl text-linen" data-testid="rc-share">{fmt(split.perPerson)}</p>
        {uneven && <p className="mt-1 text-xs text-sage">Shares differ by a cent so they add up exactly: {split.shares.map(fmt).join(" · ")}</p>}
      </div>
      <p className="mt-4 text-xs text-sage">Splitting the cost doesn't replace written landlord approval—we need that before any work is booked.</p>
      <Link href="/free-assessment?type=renter" onClick={() => track("cta_click", { location: "roommate_calc", people: n })} className="btn btn-linen mt-5 w-full">Get a Written Quote</Link>
    </div>
  );
}

/* ───────── "I need restoration for" selector ───────── */

const AUDIENCES = [
  { id: "home", label: "My Home", href: "/residential", Icon: Home },
  { id: "apartment", label: "My Apartment", href: "/renters", Icon: Building2 },
  { id: "rental", label: "My Rental Property", href: "/landlords", Icon: KeyRound },
  { id: "facility", label: "My Commercial Facility", href: "/commercial", Icon: Landmark },
  { id: "multiple", label: "Multiple Properties", href: "/commercial/property-management", Icon: Layers },
];

export function AudienceSelector() {
  return (
    <div className="border-b border-cream-dark bg-cream">
      <div className="container-sc flex flex-col gap-5 py-8 lg:flex-row lg:items-center lg:gap-10">
        <p className="shrink-0 font-serif text-[26px] leading-none text-basalt">I need restoration for</p>
        <div className="grid flex-1 grid-cols-2 gap-px bg-cream-dark md:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
          {AUDIENCES.map(({ id, label, href, Icon }) => (
            <Link key={id} href={href} onClick={() => track("audience_select", { audience: id })}
              className="group flex items-center gap-3 bg-cream px-4 py-4 text-[13px] font-semibold text-basalt transition hover:bg-basalt hover:text-bone">
              <Icon size={18} strokeWidth={1.5} className="shrink-0 text-bronze transition group-hover:text-bronze-light" />{label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Interactive service selector ───────── */

const SURFACES = [
  { id: "shower", label: "Shower" },
  { id: "floor", label: "Tile floor" },
  { id: "stone", label: "Marble / stone" },
  { id: "counter", label: "Countertop" },
];
const PROBLEMS: Record<string, { id: string; label: string; service: string; why: string }[]> = {
  shower: [
    { id: "dark", label: "Dark or stained grout", service: "shower-restoration", why: "Deep cleaning plus colour sealing usually restores an even grout colour." },
    { id: "caulk", label: "Cracked or mouldy caulk", service: "regrouting-caulking", why: "Old caulk must come out completely and be replaced on a dry joint." },
    { id: "film", label: "Film that won't clean off", service: "shower-restoration", why: "Soap-scum and mineral film need surface-appropriate removers and agitation." },
    { id: "loose", label: "Loose tiles or soft walls", service: "", why: "That's usually a substrate or water problem. Send photos—we'll tell you honestly if it needs a contractor rather than restoration." },
  ],
  floor: [
    { id: "dirty", label: "Grout looks dirty", service: "tile-grout-restoration", why: "Agitation and extraction remove embedded soil that mopping spreads around." },
    { id: "uneven", label: "Uneven grout colour", service: "grout-color-sealing", why: "Colour sealing gives a uniform colour and a protective coating." },
    { id: "cracked", label: "Cracked or missing grout", service: "regrouting-caulking", why: "Failed grout lines are cut out and replaced." },
  ],
  stone: [
    { id: "dull", label: "Dull or etched", service: "marble-stone-restoration", why: "Honing and polishing remove etching and restore the finish." },
    { id: "stained", label: "Stained", service: "marble-stone-restoration", why: "Stone-safe cleaning and poulticing can lift many stains; sealing helps prevent new ones." },
  ],
  counter: [
    { id: "absorbs", label: "Darkens when wet", service: "countertop-sealing", why: "The sealer has worn through; cleaning and resealing restores protection." },
    { id: "etched", label: "Etched rings", service: "marble-stone-restoration", why: "Etching on marble needs honing and polishing." },
  ],
};

export function ServiceSelector() {
  const [surface, setSurface] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const result = surface && problem ? PROBLEMS[surface].find((p) => p.id === problem) : null;
  return (
    <div className="bg-white p-6 shadow-card md:p-9">
      <p className="eyebrow text-bronze">1. What surface?</p>
      <div className="mt-2 flex flex-wrap gap-2">{SURFACES.map((s) => <button key={s.id} type="button" aria-pressed={surface === s.id} onClick={() => { setSurface(s.id); setProblem(null); }} className={`mt-1 border px-4 py-2.5 text-sm ${surface === s.id ? "border-basalt bg-basalt text-bone" : "border-basalt/20 hover:border-basalt"}`}>{s.label}</button>)}</div>
      {surface && <>
        <p className="eyebrow mt-7 text-bronze">2. What's the problem?</p>
        <div className="mt-2 flex flex-wrap gap-2">{PROBLEMS[surface].map((p) => <button key={p.id} type="button" aria-pressed={problem === p.id} onClick={() => { setProblem(p.id); track("service_selector", { surface, problem: p.id }); }} className={`mt-1 border px-4 py-2.5 text-sm ${problem === p.id ? "border-basalt bg-basalt text-bone" : "border-basalt/20 hover:border-basalt"}`}>{p.label}</button>)}</div>
      </>}
      {result && (
        <div className="mt-7 border-l-2 border-bronze bg-cream p-5" aria-live="polite">
          <p className="text-sm">{result.why}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.service && <Link className="btn btn-outline !min-h-10 text-sm" href={`/services/${result.service}`}>About this service</Link>}
            <Link className="btn btn-hunter !min-h-10 text-sm" href={`/free-assessment?surface=${surface}`}>Send photos for an assessment</Link>
          </div>
        </div>
      )}
    </div>
  );
}
