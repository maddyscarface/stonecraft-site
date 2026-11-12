import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "./Header";
import { markets } from "@/config/markets";
import { serviceNav, site } from "@/config/site";
import { PrivacyChoicesLink } from "./Tracking";

export function Footer() {
  const email = markets[0].email;
  return (
    <footer className="no-print bg-basalt pb-20 text-sage md:pb-0">
      <div className="border-b border-white/10">
        <div className="container-sc flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <p className="max-w-2xl font-serif text-3xl leading-tight text-bone md:text-4xl">Restore what can be restored. <em className="text-bronze-light">Say plainly</em> when it can&apos;t.</p>
          <Link href="/free-assessment" className="btn btn-linen shrink-0">Start with photos <ArrowRight size={15} /></Link>
        </div>
      </div>
      <div className="container-sc grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">{site.supporting}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-bronze-light">{site.independenceStatement}</p>
        </div>
        <div>
          <h3 className="eyebrow mb-4 text-bone">Services</h3>
          <ul className="space-y-2.5 text-sm">{serviceNav.map((s) => <li key={s.href}><Link className="hover:text-bone" href={s.href}>{s.label}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4 text-bone">Company</h3>
          <ul className="space-y-2.5 text-sm">
            {[["Residential", "/residential"], ["Renters", "/renters"], ["Landlords", "/landlords"], ["Commercial", "/commercial"], ["Gallery", "/gallery"], ["Process", "/process"], ["About", "/about"], ["Service Areas", "/service-areas"], ["Resources", "/resources"], ["Contact", "/contact"]].map(([l, h]) => <li key={h}><Link className="hover:text-bone" href={h}>{l}</Link></li>)}
          </ul>
        </div>
        <div className="space-y-6 text-sm">
          <div>
            <h3 className="eyebrow mb-3 text-bone">Contact</h3>
            <p><a className="text-bone underline decoration-bronze/60 underline-offset-4 hover:decoration-bronze-light" href={`mailto:${email}`}>{email}</a></p>
          </div>
          {markets.map((m) => (
            <div key={m.id}>
              <h3 className="eyebrow mb-2 text-bronze-light">{m.brandName}</h3>
              {m.phoneE164 && m.phoneDisplay && <p><a className="hover:text-bone" href={`tel:${m.phoneE164}`}>{m.phoneDisplay}</a></p>}
              <p>{m.serviceAreaLabel}</p>
              <p className="text-sage/80">{m.hours}</p>
              {m.status === "pre-launch" && <p className="mt-1 text-xs text-bronze-light">Scheduling availability being confirmed</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 text-xs text-sage/80">
        <div className="container-sc flex flex-col gap-2 py-5 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} StoneCraft. All rights reserved. Photography on this site is licensed stock and illustrative only — not StoneCraft projects.</span>
          <span className="flex gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><PrivacyChoicesLink /></span>
        </div>
      </div>
    </footer>
  );
}
