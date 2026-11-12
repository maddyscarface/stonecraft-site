import { Checklist, CredentialNote, Faq, FinalCta, Heading, JsonLd, PageHero, ProcessSteps, Section } from "./blocks";
import { segmentImage } from "@/config/photos";
import { LeadForm } from "./LeadForm";
import { TrackView } from "./TrackView";
import type { Segment } from "@/config/segments";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

export function SegmentPage({ s, children, formFirst }: { s: Segment; children?: React.ReactNode; formFirst?: boolean }) {
  const commercial = s.formVariant === "commercial";
  return (
    <>
      <JsonLd data={faqSchema(s.faq)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, ...(s.path.startsWith("/commercial/") ? [{ name: "Commercial", path: "/commercial" }] : []), { name: s.label, path: s.path }])} />
      <TrackView event="view_segment" params={{ segment: s.id }} />
      <PageHero image={segmentImage[s.id]} eyebrow={s.eyebrow} title={s.h1} sub={s.sub} primary={{ label: s.primaryCta.label, href: "#get-started" }} secondary={s.secondaryCta}>
        <div className="border border-white/15 bg-basalt/70 p-7 backdrop-blur-sm">
          <p className="eyebrow mb-3 text-linen">Sound familiar?</p>
          <Checklist light items={s.pains} />
        </div>
      </PageHero>

      {formFirst && <Section id="get-started"><div className="mx-auto max-w-3xl"><LeadForm variant={s.formVariant} customerType={s.formVariant === "commercial" ? undefined : (s.customerType as "homeowner" | "renter" | "landlord")} segment={commercial ? s.id : undefined} sourcePage={s.path} /></div></Section>}

      <Section tone={formFirst ? "white" : "cream"}>
        <Heading eyebrow="What we offer" title={commercial ? "Programs built around your operations" : "What we can do"} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {s.offers.map((o, i) => <div key={o.title} className="border-t border-basalt/20 pt-6"><p className="font-serif text-3xl text-bronze">{String(i + 1).padStart(2, "0")}</p><h3 className="mt-3 font-serif text-[26px] leading-tight">{o.title}</h3><p className="mt-3 text-sm leading-relaxed text-basalt/70">{o.body}</p></div>)}
        </div>
      </Section>

      {children}

      <Section tone="hunter">
        <Heading light eyebrow="How it works" title={commercial ? "From assessment to documented completion" : "Simple, honest, no pressure"} />
        <ProcessSteps light steps={s.howWeWork} />
      </Section>

      {!formFirst && (
        <Section id="get-started">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <Heading eyebrow="Get started" title={commercial ? "Request an assessment" : "Send photos for a free assessment"} sub={commercial ? "Tell us about the facility. We'll follow up to schedule a site walk." : "It takes about two minutes. We'll reply with an honest assessment."} />
              {commercial && <CredentialNote />}
            </div>
            <LeadForm variant={s.formVariant} customerType={commercial ? undefined : (s.customerType as "homeowner" | "renter" | "landlord")} segment={commercial ? (s.id === "commercial" ? undefined : s.id) : undefined} sourcePage={s.path} />
          </div>
        </Section>
      )}

      <Section tone="white">
        <Heading center eyebrow="Questions" title="Frequently asked" />
        <Faq items={s.faq} />
      </Section>
      <FinalCta commercial={commercial} />
    </>
  );
}
