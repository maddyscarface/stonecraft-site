import { ADMIN_PAGES } from "@/config/admin";

/** Visible operational/prototype label for each /admin page (Build 04 §5). */
export function AdminStatus({ page }: { page: keyof typeof ADMIN_PAGES }) {
  const p = ADMIN_PAGES[page];
  const proto = p.status === "prototype";
  return (
    <p data-testid="admin-status" data-status={p.status} className={`flex flex-wrap items-center gap-2 rounded border p-3 text-sm ${proto ? "border-bronze-light/60 bg-bronze-pale" : "border-slate/40 bg-white"}`}>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${proto ? "bg-basalt text-bronze-light" : "bg-slate text-white"}`}>{proto ? "Prototype" : "Operational"}</span>
      <span>{p.note}</span>
    </p>
  );
}
