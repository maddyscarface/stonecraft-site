import { Checklist, FinalCta, Heading, PageHero, Section } from "@/components/blocks";
import { founder } from "@/config/gallery";
import { site } from "@/config/site";
import { markets } from "@/config/markets";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "About StoneCraft — Independent Tile, Grout & Stone Restoration", description: "StoneCraft is an independently owned restoration company serving Greater Boston and Southeast Florida. Restoration-first, honest about when replacement is needed.", path: "/about" });

export default function Page() {
  return (
    <>
      <PageHero eyebrow="About" title="Not a Franchise. Not a Cleaning Company. A Restoration Specialist." sub={site.supporting} />
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div><Heading eyebrow="Why we exist" title="Too many good surfaces get torn out" /><p className="leading-relaxed">Tile, grout and stone usually fail at the surface long before they fail structurally. Yet the default answer is often a remodel. StoneCraft exists to give owners, renters and facility teams a real alternative—restore what can be restored, and say plainly when something needs replacing.</p><p className="mt-4 leading-relaxed">{founder.bio}</p><p className="mt-4 font-semibold">{founder.name}, {founder.role}</p></div>
          <div className="space-y-4">
            {[["Honesty", "If a surface can't be restored, we'll tell you before you spend anything."], ["Craftsmanship", "Every job treated as if it were in our own home or building."], ["Transparency", "Written scope and price before work; photos before and after."], ["Respect for renters", "Renters deserve good bathrooms too—with landlord approval done properly."]].map(([t, b]) => <div key={t} className="rounded-lg bg-white p-5 shadow-card"><h3 className="font-serif text-xl">{t}</h3><p className="mt-1 text-sm">{b}</p></div>)}
          </div>
        </div>
      </Section>
      <Section tone="hunter"><Heading light eyebrow="Markets" title="Where we operate" /><div className="grid gap-5 md:grid-cols-2">{markets.map((m) => <div key={m.id} className="rounded-lg bg-hunter-mid p-6"><p className="font-serif text-2xl">{m.brandName}</p><p className="mt-2 text-sage">{m.serviceAreaLabel}</p>{m.status === "pre-launch" && <p className="mt-2 text-sm text-linen">{m.statusNote}</p>}</div>)}</div><p className="mt-6 text-sm text-sage">{site.independenceStatement} We're a service-area business and don't operate public storefronts.</p></Section>
      <Section><Heading title="How we work" /><Checklist items={["Photo assessment before any visit", "Written scope and price before anything is booked", "Surface-appropriate products — never acid on natural stone", "Before and after photos on every job", "Walkthrough before we leave"]} /></Section>
      <FinalCta />
    </>
  );
}
