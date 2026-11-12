import Link from "next/link";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import { ADMIN_PAGES } from "@/config/admin";

export const metadata: Metadata = { title: "StoneCraft Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdmin();
  return (
    <div className="min-h-screen bg-cream">
      {ok && <nav className="border-b border-cream-dark bg-white"><div className="container-sc flex flex-wrap gap-1 py-2 text-sm">
        {[...Object.values(ADMIN_PAGES).slice(0, 1).map((p) => [p.label, p.href, p.status]), ["Ops view", "/admin/dashboard?view=ops", "operational"], ...Object.values(ADMIN_PAGES).slice(1).map((p) => [p.label, p.href, p.status])].map(([l, h, st]) => <Link key={h} href={h} className="rounded px-3 py-1.5 hover:bg-cream">{l}{st === "prototype" && <span className="ml-1.5 rounded bg-bronze-pale px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bronze">Prototype</span>}</Link>)}
      </div></nav>}
      <div className="container-sc py-8">{children}</div>
    </div>
  );
}
