"use client";
import { useCallback } from "react";

export const chip = "min-h-11 shrink-0 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm hover:border-basalt disabled:opacity-40";
export const small = "field !min-h-11 !py-2 text-sm";
export const btn = "btn btn-hunter !min-h-11 !px-4 !py-2 text-sm";
export const H = ({ children }: { children: React.ReactNode }) => <p className="text-xs font-semibold uppercase tracking-wider text-bronze">{children}</p>;
export const Card = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`min-w-0 rounded-2xl border border-cream-dark bg-white p-4 sm:p-5 ${className}`}>{title && <h2 className="mb-3 font-serif text-xl text-basalt">{title}</h2>}{children}</section>
);
export const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="rounded-xl border border-cream-dark bg-bone/60 p-3"><p className="text-xs uppercase tracking-wider text-sage-ink">{label}</p><p className="mt-1 text-2xl font-semibold text-basalt">{value}</p>{hint && <p className="mt-0.5 text-xs text-sage-ink">{hint}</p>}</div>
);
export const Badge = ({ tone = "muted", children }: { tone?: "ok" | "warn" | "bad" | "muted"; children: React.ReactNode }) => {
  const t = { ok: "bg-basalt/10 text-basalt", warn: "bg-bronze-pale text-bronze", bad: "bg-[#a2402b]/10 text-[#a2402b]", muted: "bg-bone-2 text-sage-ink" }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
};
export const Table = ({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) => (
  <div className="-mx-4 overflow-x-auto sm:mx-0"><table className="w-full min-w-[560px] text-left text-sm">
    <thead className="bg-bone-2 text-xs uppercase tracking-wider text-sage-ink"><tr>{head.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
    <tbody>{children}{empty && <tr><td colSpan={head.length} className="p-6 text-sage-ink">Nothing yet.</td></tr>}</tbody>
  </table></div>
);
export const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <td className={`border-t border-cream-dark p-3 align-top ${className}`}>{children}</td>;
export const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export type Api = (path: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; j: any }>;
export function useApi(onUnauthorised: () => void): Api {
  return useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(`/api/admin/ops${path}`, { ...init, credentials: "same-origin", headers: { ...(init?.headers || {}), ...(init?.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) onUnauthorised();
    return { ok: r.ok && j.ok !== false, status: r.status, j };
  }, [onUnauthorised]);
}
