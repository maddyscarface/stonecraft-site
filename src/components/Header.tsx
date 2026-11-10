"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, Phone, X, Camera } from "lucide-react";
import { useMarket } from "./MarketContext";
import { track } from "@/lib/tracking/client";

export type PublicMarket = { id: "boston" | "south-florida"; shortName: string; phoneE164: string; phoneDisplay: string };
type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

export function Wordmark({ light = true, suffix }: { light?: boolean; suffix?: string }) {
  return (
    <span className="whitespace-nowrap font-serif text-xl font-semibold tracking-tight md:text-2xl">
      <span className={light ? "text-white" : "text-hunter"}>Stone</span><span className="text-linen">Craft</span>
      {suffix && <span className={`ml-2 align-middle font-sans text-[10px] font-semibold uppercase tracking-[0.18em] ${light ? "text-sage" : "text-patina"}`}>{suffix}</span>}
    </span>
  );
}

export function Header({ nav, markets }: { nav: NavItem[]; markets: PublicMarket[] }) {
  const { market, setMarket } = useMarket();
  const [open, setOpen] = useState(false);
  const m = markets.find((x) => x.id === market) ?? markets[0];
  const callClick = () => track("phone_click", { market: m.id, location: "header" }, { name: "Contact" });

  return (
    <>
      <div className="no-print bg-hunter-mid text-center text-xs text-linen">
        <div className="container-sc flex items-center justify-between gap-3 py-2">
          <span className="hidden sm:inline">Free photo assessment — we tell you honestly what your surfaces need.</span>
          <div className="flex items-center gap-1" role="group" aria-label="Choose your area">
            {markets.map((x) => (
              <button key={x.id} onClick={() => setMarket(x.id)} aria-pressed={x.id === market}
                className={`rounded-full px-3 py-0.5 ${x.id === market ? "bg-linen text-hunter" : "text-linen hover:text-white"}`}>{x.shortName}</button>
            ))}
          </div>
        </div>
      </div>
      <header className="no-print sticky top-0 z-40 bg-hunter text-white shadow-[0_1px_0_#2A5040]">
        <div className="container-sc flex h-16 items-center justify-between gap-4 md:h-[72px]">
          <Link href="/" aria-label="StoneCraft home"><Wordmark suffix={m.id === "boston" ? "Boston" : "SE Florida"} /></Link>
          <nav className="hidden items-center lg:flex" aria-label="Main">
            {nav.map((item) => item.children?.length ? (
              <div key={item.label} className="group relative">
                <Link href={item.href} className="flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-2 text-sm text-cream hover:text-linen">{item.label}<ChevronDown size={14} /></Link>
                <div className="invisible absolute left-0 top-full min-w-56 rounded-md border border-hunter-light bg-hunter-mid p-2 opacity-0 shadow-premium transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {item.children.map((c) => <Link key={c.href} href={c.href} className="block rounded px-3 py-2 text-sm text-cream hover:bg-hunter-light hover:text-linen">{c.label}</Link>)}
                </div>
              </div>
            ) : <Link key={item.label} href={item.href} className="whitespace-nowrap rounded px-2.5 py-2 text-sm text-cream hover:text-linen">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <a href={`tel:${m.phoneE164}`} onClick={callClick} className="hidden items-center gap-2 whitespace-nowrap text-sm text-linen hover:text-white xl:flex"><Phone size={16} />{m.phoneDisplay}</a>
            <Link href="/free-assessment" className="btn btn-linen hidden !min-h-10 whitespace-nowrap text-sm sm:inline-flex" onClick={() => track("cta_click", { location: "header" })}>Free Assessment</Link>
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="text-linen" /></button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-hunter p-6 text-white lg:hidden" role="dialog" aria-modal="true">
          <div className="mb-6 flex items-center justify-between"><Wordmark /><button onClick={() => setOpen(false)} aria-label="Close menu"><X className="text-linen" /></button></div>
          <a href={`tel:${m.phoneE164}`} onClick={callClick} className="mb-6 flex items-center gap-2 text-lg text-linen"><Phone size={18} />{m.phoneDisplay}</a>
          {nav.map((item) => (
            <div key={item.label} className="border-b border-hunter-light py-3">
              <Link href={item.href} onClick={() => setOpen(false)} className="block font-serif text-xl">{item.label}</Link>
              {item.children?.map((c) => <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block py-1.5 pl-3 text-sm text-mist">{c.label}</Link>)}
            </div>
          ))}
          <Link href="/free-assessment" onClick={() => setOpen(false)} className="btn btn-linen mt-6 w-full">Send Photos — Free Assessment</Link>
        </div>
      )}

      <div className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-hunter-light bg-hunter md:hidden">
        <a href={`tel:${m.phoneE164}`} onClick={() => track("phone_click", { location: "mobile_bar" }, { name: "Contact" })} className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-linen"><Phone size={16} />Call / Text</a>
        <Link href="/free-assessment" onClick={() => track("cta_click", { location: "mobile_bar" })} className="flex items-center justify-center gap-2 bg-linen py-3.5 text-sm font-semibold text-hunter"><Camera size={16} />Send Photos</Link>
      </div>
    </>
  );
}
