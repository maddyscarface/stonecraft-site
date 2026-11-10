import Link from "next/link";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "StoneCraft Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdmin();
  return (
    <div className="min-h-screen bg-cream">
      {ok && <nav className="border-b border-cream-dark bg-white"><div className="container-sc flex flex-wrap gap-1 py-2 text-sm">
        {[["Dashboard", "/admin/dashboard"], ["Ops view", "/admin/dashboard?view=ops"], ["Scheduling", "/admin/scheduling"], ["Pricing & quotes", "/admin/pricing"], ["Work orders", "/admin/workorder"], ["Room scan (beta)", "/admin/room-scan"]].map(([l, h]) => <Link key={h} href={h} className="rounded px-3 py-1.5 hover:bg-cream">{l}</Link>)}
      </div></nav>}
      <div className="container-sc py-8">{children}</div>
    </div>
  );
}
