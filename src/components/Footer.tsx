import Link from "next/link";
import { Wordmark } from "./Header";
import { markets } from "@/config/markets";
import { services } from "@/config/services";
import { site } from "@/config/site";
import { PrivacyChoicesLink } from "./Tracking";

export function Footer() {
  return (
    <footer className="no-print bg-hunter pb-20 text-mist md:pb-0">
      <div className="container-sc grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Wordmark />
          <p className="mt-3 text-sm">{site.supporting}</p>
          <p className="mt-3 text-xs text-sage">{site.independenceStatement}</p>
        </div>
        <div>
          <h3 className="eyebrow mb-3 text-linen">Services</h3>
          <ul className="space-y-2 text-sm">{services.map((s) => <li key={s.slug}><Link className="hover:text-linen" href={`/services/${s.slug}`}>{s.name}</Link></li>)}</ul>
        </div>
        <div>
          <h3 className="eyebrow mb-3 text-linen">Company</h3>
          <ul className="space-y-2 text-sm">
            {[["Residential", "/residential"], ["Renters", "/renters"], ["Landlords", "/landlords"], ["Commercial", "/commercial"], ["Gallery", "/gallery"], ["Process", "/process"], ["About", "/about"], ["Service Areas", "/service-areas"], ["Resources", "/resources"], ["Contact", "/contact"]].map(([l, h]) => <li key={h}><Link className="hover:text-linen" href={h}>{l}</Link></li>)}
          </ul>
        </div>
        <div className="space-y-5 text-sm">
          {markets.map((m) => (
            <div key={m.id}>
              <h3 className="eyebrow mb-2 text-linen">{m.brandName}</h3>
              <p><a className="hover:text-linen" href={`tel:${m.phoneE164}`}>{m.phoneDisplay}</a></p>
              <p><a className="hover:text-linen" href={`mailto:${m.email}`}>{m.email}</a></p>
              <p className="text-sage">{m.serviceAreaLabel}</p>
              <p className="text-sage">{m.hours}</p>
            </div>
          ))}
          <Link href="/free-assessment" className="btn btn-linen !min-h-10 text-sm">Get Free Assessment</Link>
        </div>
      </div>
      <div className="bg-[#142c20] text-xs text-sage">
        <div className="container-sc flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} StoneCraft. All rights reserved. {site.independenceStatement}</span>
          <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><PrivacyChoicesLink /></span>
        </div>
      </div>
    </footer>
  );
}
