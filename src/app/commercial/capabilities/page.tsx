import { meta } from "@/lib/seo";
import { PrintButton } from "@/components/PrintButton";
import { markets } from "@/config/markets";
import { Wordmark } from "@/components/Header";
import { capabilities } from "@/config/capabilities";

export const metadata = meta({ title: "Commercial Capabilities Statement | StoneCraft", description: "StoneCraft commercial tile, grout and stone restoration capabilities: services, sectors, scoping, phasing and documentation.", path: "/commercial/capabilities" });

export default function Page() {
  return (
    <div className="bg-cream py-10 print:bg-white print:py-0">
      <div className="container-sc max-w-4xl">
        <div className="no-print mb-6 flex justify-end gap-3"><a className="btn btn-outline !min-h-10 text-sm" href="/downloads/stonecraft-commercial-capabilities.pdf" download>Download PDF</a><PrintButton /></div>
        <article className="overflow-hidden rounded-lg bg-white shadow-card print:shadow-none">
          <header className="flex items-center justify-between bg-hunter px-8 py-6 text-white"><Wordmark /><h1 className="eyebrow text-linen">Commercial Capabilities Statement</h1></header>
          <div className="grid gap-8 p-8 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6 text-sm leading-relaxed">
              <section><h2 className="font-serif text-xl">Overview</h2><p className="mt-2">{capabilities.overview}</p></section>
              <section><h2 className="font-serif text-xl">Core services</h2><ul className="mt-2 list-disc pl-5">{capabilities.services.map((s) => <li key={s}>{s}</li>)}</ul></section>
              <section><h2 className="font-serif text-xl">How we work</h2><ol className="mt-2 list-decimal pl-5">{capabilities.method.map((s) => <li key={s}>{s}</li>)}</ol></section>
              <section><h2 className="font-serif text-xl">Differentiators</h2><ul className="mt-2 list-disc pl-5">{capabilities.differentiators.map((s) => <li key={s}>{s}</li>)}</ul></section>
            </div>
            <aside className="space-y-6 text-sm">
              <section className="rounded bg-cream p-4"><h3 className="font-semibold">Sectors</h3><ul className="mt-2 space-y-1">{capabilities.sectors.map((s) => <li key={s}>{s}</li>)}</ul></section>
              <section className="rounded bg-cream p-4"><h3 className="font-semibold">Company data</h3><dl className="mt-2 space-y-1">{capabilities.companyData.map(([k, v]) => <div key={k}><dt className="text-xs text-hunter/60">{k}</dt><dd>{v}</dd></div>)}</dl></section>
              <section className="rounded bg-cream p-4"><h3 className="font-semibold">Contact</h3>{markets.map((m) => <p key={m.id} className="mt-2"><strong>{m.brandName}</strong><br />{m.phoneDisplay}<br />{m.email}</p>)}</section>
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
}
