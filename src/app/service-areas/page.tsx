import Link from "next/link";
import { FinalCta, Heading, PageHero, Section } from "@/components/blocks";
import { markets } from "@/config/markets";
import { cities } from "@/config/cities";
import { meta } from "@/lib/seo";

export const metadata = meta({ title: "Service Areas — Greater Boston & Southeast Florida | StoneCraft", description: "Towns and cities StoneCraft serves for tile, grout and stone restoration in Greater Boston and Southeast Florida.", path: "/service-areas" });

export default function Page() {
  return (
    <>
      <PageHero image="boston-back-bay-brownstone" eyebrow="Service areas" title="Where We Work" sub="We're a service-area business: we come to you. Appointments are grouped by area so our team spends time on your project, not in traffic." />
      {markets.map((m) => (
        <Section key={m.id} tone={m.id === "boston" ? "cream" : "white"}>
          <Heading eyebrow={m.brandName} title={m.name} sub={m.status === "pre-launch" ? m.statusNote : m.serviceAreaLabel} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {m.zones.filter((z) => z.active).map((z) => (
              <div key={z.id} className="rounded-lg bg-white p-5 shadow-card">
                <p className="font-semibold" style={{ color: z.color }}>{z.name}</p>
                <ul className="mt-2 space-y-1 text-sm">{cities.filter((c) => z.citySlugs.includes(c.slug)).map((c) => <li key={c.slug}>{c.tier === "core" ? <Link className="underline-offset-2 hover:underline" href={`/${m.slug}/${c.slug}`}>{c.name}</Link> : c.name}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm">Don't see your town? <Link className="underline" href="/free-assessment">Send your ZIP code</Link> and we'll confirm.</p>
        </Section>
      ))}
      <FinalCta />
    </>
  );
}
