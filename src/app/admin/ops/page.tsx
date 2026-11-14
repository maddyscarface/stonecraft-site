import type { Metadata } from "next";
import { OpsConsole } from "@/components/ops/OpsConsole";
import { opsEnabled } from "@/lib/ops/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations", robots: { index: false, follow: false } };

export default function AdminOpsPage() {
  if (!opsEnabled()) {
    return (
      <main className="container-sc flex min-h-screen max-w-lg flex-col justify-center py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze">StoneCraft admin</p>
        <h1 className="mt-2 font-serif text-3xl text-basalt">Admin is locked on this deployment</h1>
        <p className="mt-3 text-sage-ink">No staff identity is configured. Set <code className="rounded bg-white px-1.5 py-0.5">ADMIN_TOKEN</code> (owner) and optionally <code className="rounded bg-white px-1.5 py-0.5">OPS_STAFF_JSON</code> (role-based staff, token hashes only) as server-only environment variables.</p>
      </main>
    );
  }
  return <OpsConsole />;
}
