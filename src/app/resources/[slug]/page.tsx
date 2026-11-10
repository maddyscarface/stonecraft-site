import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta, JsonLd, Section } from "@/components/blocks";
import { articles, findArticle } from "@/config/resources";
import { articleSchema, breadcrumbSchema, meta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return articles.map((a) => ({ slug: a.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = findArticle((await params).slug);
  return a ? meta({ title: `${a.title} | StoneCraft`, description: a.description, path: `/resources/${a.slug}` }) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = findArticle((await params).slug);
  if (!a) notFound();
  return (
    <>
      <JsonLd data={articleSchema({ title: a.title, description: a.description, path: `/resources/${a.slug}`, date: a.date })} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }, { name: a.title, path: `/resources/${a.slug}` }])} />
      <section className="bg-hunter text-white"><div className="container-sc max-w-3xl py-14"><p className="eyebrow text-linen">{a.audience}</p><h1 className="mt-3 font-serif text-4xl leading-tight">{a.title}</h1><p className="mt-4 text-sage">{a.description}</p></div></section>
      <Section tone="white">
        <article className="prose-sc mx-auto max-w-3xl">
          {a.body.map((b, i) => "h2" in b ? <h2 key={i}>{b.h2}</h2> : "p" in b ? <p key={i}>{b.p}</p> : <ul key={i}>{b.ul.map((li) => <li key={li}>{li}</li>)}</ul>)}
          <div className="mt-10 rounded-lg bg-cream p-6"><p className="font-serif text-xl">Next step</p><Link className="btn btn-hunter mt-3" href={a.cta.href}>{a.cta.label}</Link></div>
        </article>
      </Section>
      <FinalCta />
    </>
  );
}
