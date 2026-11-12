import { Camera, Clock, Mail, ShieldCheck, Users } from "lucide-react";
import { LeadForm } from "@/components/LeadForm";
import { TrackView } from "@/components/TrackView";
import { Photo } from "@/components/Photo";
import { cityByZip } from "@/config/cities";
import { CONTACT_EMAIL } from "@/config/markets";
import { site } from "@/config/site";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Free Photo Assessment — Tile, Grout & Stone | StoneCraft", description: "Send 3–4 photos of your tile, grout, shower or stone. We'll tell you what's possible and what it costs. No obligation.", path: "/free-assessment" });

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const type = q.type === "renter" || q.type === "landlord" || q.type === "homeowner" ? q.type : undefined;
  const zip = q.zip && /^\d{5}$/.test(q.zip) ? q.zip : undefined;
  return (
    <>
      <TrackView event="view_assessment" meta="ViewContent" params={{ content_name: "Free Assessment" }} />
      <section className="relative isolate overflow-hidden bg-basalt text-white">
        <div className="absolute inset-0 -z-10 opacity-[0.14] mix-blend-luminosity"><Photo k="texture-marble-veined" priority sizes="100vw" /></div>
        <div className="container-sc py-16 md:py-20">
          <p className="eyebrow mb-6 text-bronze-light"><span className="rule-bronze" />Free photo assessment</p>
          <h1 className="max-w-4xl font-serif text-[40px] leading-[1.04] text-bone md:text-[58px]">See what your surfaces could look like — before you commit to anything.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-bone/75">Send 3–4 photos. We&apos;ll review them and tell you honestly what&apos;s possible and what it costs. {site.responsePromise}</p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-bone/80"><span className="flex items-center gap-2"><Clock size={15} className="text-bronze-light" />Same-business-day reply</span><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-bronze-light" />Photos seen only by our team</span><span className="flex items-center gap-2"><Users size={15} className="text-bronze-light" />Homeowners, renters &amp; landlords</span></div>
        </div>
      </section>
      <section className="bg-cream py-14 md:py-20">
        <div className="container-sc grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div>
            <LeadForm variant={type === "renter" ? "renter" : type === "landlord" ? "landlord" : "residential"} customerType={type} zip={zip} town={zip ? cityByZip(zip)?.name : undefined} program={q.program} sourcePage="/free-assessment" />
            <p className="mt-6 text-center text-sm">Managing a commercial facility? <a className="underline underline-offset-4" href="/commercial-site-assessment">Request a commercial site assessment</a>.</p>
          </div>
          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="relative aspect-[4/3] overflow-hidden"><Photo k="shower-marble-glass" sizes="(min-width:1024px) 35vw, 100vw" note /></div>
            <div className="bg-white p-7 shadow-card">
              <p className="eyebrow text-bronze">What happens next</p>
              <ol className="mt-5 space-y-4 text-sm">
                {["We look at every photo — grout, caulk, sealant, tile and substrate.", "You get an honest read: restore, repair, or (if it's the right answer) replace.", "If restoration fits, you receive a written scope and price. Nothing is booked until you approve."].map((t, i) => (
                  <li key={t} className="flex gap-4"><span className="font-serif text-2xl leading-none text-bronze">{i + 1}</span><span className="leading-relaxed text-basalt/80">{t}</span></li>
                ))}
              </ol>
            </div>
            <div className="border border-cream-dark p-6 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Camera size={16} className="text-bronze" />Photo tips</p>
              <p className="mt-2 leading-relaxed text-basalt/70">One wide shot of the whole area, then close-ups of the worst grout, caulk or stone. Daylight or the room lights on — no flash.</p>
              <p className="mt-4 flex items-center gap-2 text-basalt/70"><Mail size={15} className="text-bronze" />Prefer email? <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
