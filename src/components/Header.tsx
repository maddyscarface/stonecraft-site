"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, Mail, Menu, Phone, X, Camera } from "lucide-react";
import { useMarket } from "./MarketContext";
import { Monogram } from "./Photo";
import { track } from "@/lib/tracking/client";

/** Phone fields are null until a real number is configured; all phone UI is hidden while null. */
export type PublicMarket = { id: "boston" | "south-florida"; shortName: string; phoneE164: string | null; phoneDisplay: string | null; email: string };
type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export function Wordmark({ light = true, suffix }: { light?: boolean; suffix?: string }) {
  return (
    <span className="flex items-center gap-3 whitespace-nowrap">
      <Monogram light={light} size={26} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif text-[22px] font-semibold uppercase tracking-[0.2em] md:text-[24px] ${light ? "text-bone" : "text-basalt"}`}>Stonecraft</span>
        {suffix && <span className={`mt-1 font-sans text-[9px] font-bold uppercase tracking-[0.34em] ${light ? "text-bronze-light" : "text-bronze"}`}>{suffix}</span>}
      </span>
    </span>
  );
}

export function Header({ nav, markets }: { nav: NavItem[]; markets: PublicMarket[] }) {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  const m = markets.find((x) => x.id === market) ?? markets[0];
  const callClick = (location: string) => track("phone_click", { market: m.id, location }, { name: "Contact" });
  const mailClick = (location: string) => track("email_click", { market: m.id, location }, { name: "Contact" });

  return (
    <>
      <div className="no-print border-b border-white/10 bg-basalt text-[11px] text-sage">
        <div className="container-sc flex items-center justify-between gap-3 py-2">
          <span className="hidden tracking-wide sm:inline">Tile, grout, marble &amp; natural stone restoration — free photo assessment</span>
          <div className="flex items-center gap-4">
            <a href={`mailto:${m.email}`} onClick={() => mailClick("utility_bar")} className="hidden items-center gap-1.5 hover:text-bone md:flex"><Mail size={13} />{m.email}</a>
            {m.phoneE164 && m.phoneDisplay && <a href={`tel:${m.phoneE164}`} onClick={() => callClick("utility_bar")} className="hidden items-center gap-1.5 hover:text-bone md:flex"><Phone size={13} />{m.phoneDisplay}</a>}
            <div className="flex items-center border border-white/15" role="group" aria-label="Choose your area">
              {markets.map((x) => (
                <button key={x.id} onClick={() => setMarket(x.id)} aria-pressed={x.id === market}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition ${x.id === market ? "bg-bronze-light text-basalt" : "text-sage hover:text-bone"}`}>{x.shortName}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-basalt/95 text-white backdrop-blur supports-[backdrop-filter]:bg-basalt/85">
        <div className="container-sc flex h-[68px] items-center justify-between gap-6 md:h-[78px]">
          <Link href="/" aria-label="StoneCraft home"><Wordmark suffix={m.id === "boston" ? "Greater Boston" : "Southeast Florida"} /></Link>
          <nav className="hidden items-center lg:flex" aria-label="Main">
            {nav.map((item) => item.children?.length ? (
              <div key={item.label} className="group relative">
                <Link href={item.href} className="flex items-center gap-1 whitespace-nowrap px-3 py-2 text-[13px] font-medium tracking-wide text-bone/85 hover:text-bronze-light">{item.label}<ChevronDown size={13} className="opacity-60" /></Link>
                <div className="invisible absolute left-0 top-full min-w-60 border border-white/10 bg-basalt-2 p-2 opacity-0 shadow-premium transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {item.children.map((c) => <Link key={c.href} href={c.href} className="block px-3 py-2 text-[13px] text-bone/85 hover:bg-white/5 hover:text-bronze-light">{c.label}</Link>)}
                </div>
              </div>
            ) : <Link key={item.label} href={item.href} className="whitespace-nowrap px-3 py-2 text-[13px] font-medium tracking-wide text-bone/85 hover:text-bronze-light">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/free-assessment" className="btn btn-linen hidden !min-h-11 whitespace-nowrap !px-5 sm:inline-flex" onClick={() => track("cta_click", { location: "header" })}>Free Assessment <ArrowRight size={15} /></Link>
            <button className="p-1 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="text-bone" /></button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-basalt p-6 text-white lg:hidden" role="dialog" aria-modal="true">
          <div className="mb-8 flex items-center justify-between"><Wordmark /><button onClick={() => setOpen(false)} aria-label="Close menu"><X className="text-bone" /></button></div>
          {nav.map((item) => (
            <div key={item.label} className="border-b border-white/10 py-3">
              <Link href={item.href} onClick={() => setOpen(false)} className="block font-serif text-2xl">{item.label}</Link>
              {item.children?.map((c) => <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block py-1.5 pl-3 text-sm text-sage">{c.label}</Link>)}
            </div>
          ))}
          <div className="mt-6 space-y-3 text-sm text-sage">
            <a href={`mailto:${m.email}`} onClick={() => mailClick("mobile_menu")} className="flex items-center gap-2"><Mail size={16} />{m.email}</a>
            {m.phoneE164 && m.phoneDisplay && <a href={`tel:${m.phoneE164}`} onClick={() => callClick("mobile_menu")} className="flex items-center gap-2"><Phone size={16} />{m.phoneDisplay}</a>}
          </div>
          <Link href="/free-assessment" onClick={() => setOpen(false)} className="btn btn-linen mt-6 w-full">Send Photos — Free Assessment</Link>
        </div>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-white/10 bg-basalt md:hidden">
        {m.phoneE164
          ? <a href={`tel:${m.phoneE164}`} onClick={() => callClick("mobile_bar")} className="flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-bone"><Phone size={15} />Call</a>
          : <a href={`mailto:${m.email}`} onClick={() => mailClick("mobile_bar")} className="flex items-center justify-center gap-2 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-bone"><Mail size={15} />Email us</a>}
        <Link href="/free-assessment" onClick={() => track("cta_click", { location: "mobile_bar" })} className="flex items-center justify-center gap-2 bg-bronze-light py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-basalt"><Camera size={15} />Send Photos</Link>
      </div>
    </>
  );
}
