"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** Thank-you page offer: continue with a guided photo walkthrough (self-start, same tab, within 48h). */
export function WalkthroughCta({ commercial }: { commercial: boolean }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { try { const r = JSON.parse(sessionStorage.getItem("sc_wt_lead") || "null"); setOk(Boolean(r?.id) && Date.now() - r.at < 48 * 3600_000); } catch {} }, []);
  if (!ok) return null;
  const types = commercial ? [["commercial", "Restrooms, lobbies & corridors"]] : [["shower", "Shower"], ["floor", "Tile floors"], ["stone", "Stone countertops"]];
  return (
    <div className="mt-6 border border-cream-dark bg-white p-5 text-left" data-testid="walkthrough-cta">
      <p className="eyebrow">Optional · about 5–10 minutes</p>
      <p className="mt-2 font-serif text-2xl">Want a faster answer? Walk us through it.</p>
      <p className="mt-2 text-sm">A guided, step-by-step photo walkthrough on your phone. Add measurements if you have a tape measure, or skip them. You can stop and come back.</p>
      <div className="mt-4 flex flex-wrap gap-2">{types.map(([t, l]) => <Link key={t} href={`/walkthrough?start=${t}`} className="btn btn-hunter">{l}</Link>)}</div>
    </div>
  );
}
