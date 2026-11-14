import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminStatus } from "@/components/admin/StatusBadge";
import { listRange, kvConfigured } from "@/lib/store";
import { markets } from "@/config/markets";

type Rec = { id: string; at: string; variant: string; customerType: string; market: string | null; zone: string | null; city: string | null; pipeline: string; score: number; tier: string; photos: number; source: string; medium?: string; campaign?: string; segment?: string; surfaces?: string[]; ghl?: { mode?: string; error?: string } };
type Conv = { eventId: string; stage: string; event: string; market?: string; value: number; at: string };

function count<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = key(r) ?? "—"; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Table({ title, rows }: { title: string; rows: [string, number | string][] }) {
  return <div className="rounded-lg bg-white p-5 shadow-card"><h3 className="mb-3 font-semibold">{title}</h3>{rows.length ? <table className="w-full text-sm"><tbody>{rows.slice(0, 12).map(([k, v]) => <tr key={k} className="border-t border-cream-dark"><td className="py-1.5 pr-3 [overflow-wrap:anywhere]">{k}</td><td className="py-1.5 text-right font-semibold tabular-nums">{v}</td></tr>)}</tbody></table> : <p className="text-sm text-hunter/60">No data yet.</p>}</div>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <div className="rounded-lg bg-white p-5 shadow-card"><p className="eyebrow text-patina">{label}</p><p className="mt-1 font-serif text-3xl tabular-nums">{value}</p>{sub && <p className="text-xs text-hunter/60">{sub}</p>}</div>;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; market?: string; days?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const q = await searchParams;
  const days = Number(q.days ?? 30);
  const since = Date.now() - days * 86_400_000;
  const all = (await listRange<Rec>("leads", 0, 4999)).filter((r) => Date.parse(r.at) >= since && (!q.market || r.market === q.market));
  const conv = (await listRange<Conv>("conversions", 0, 4999)).filter((r) => Date.parse(r.at) >= since && (!q.market || r.market === q.market));
  const qualified = all.filter((r) => r.tier !== "cold").length;
  const booked = conv.filter((c) => c.event === "appointment_booked").length;
  const won = conv.filter((c) => c.event === "job_won");
  const wonValue = won.reduce((s, c) => s + (c.value || 0), 0);
  const commercial = all.filter((r) => r.pipeline !== "residential");
  const ops = q.view === "ops";
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-serif text-3xl">{ops ? "Operations" : "Executive"} dashboard</h1><AdminStatus page="dashboard" /><p className="text-sm text-hunter/60">Last {days} days · {q.market ?? "all markets"} · storage: {kvConfigured ? "Upstash" : "in-memory (dev)"}</p></div>
        <form className="flex gap-2 text-sm"><input type="hidden" name="view" value={q.view ?? ""} />
          <select name="market" defaultValue={q.market ?? ""} className="field !w-auto !py-1.5"><option value="">All markets</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.shortName}</option>)}</select>
          <select name="days" defaultValue={String(days)} className="field !w-auto !py-1.5">{[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d} days</option>)}</select>
          <button className="btn btn-outline !min-h-9 text-sm">Apply</button>
          <a className="btn btn-outline !min-h-9 text-sm" href={`/api/admin/export${q.market ? `?market=${q.market}` : ""}`}>Google Ads CSV</a></form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Leads" value={all.length} sub={`${all.filter((r) => r.photos > 0).length} with photos`} />
        <Stat label="Qualified (hot+warm)" value={qualified} sub={all.length ? `${Math.round((qualified / all.length) * 100)}% of leads` : ""} />
        <Stat label="Estimates / site walks booked" value={booked} sub={all.length ? `${Math.round((booked / all.length) * 100)}% lead→booked` : "from CRM webhook"} />
        <Stat label="Jobs / contracts won" value={won.length} sub={won.length ? `avg ${money(wonValue / won.length)}` : ""} />
        <Stat label="Won revenue" value={money(wonValue)} sub="attributed via CRM stage events" />
      </div>
      {ops ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Table title="By zone" rows={count(all, (r) => r.zone ?? "Unzoned / out of area")} />
          <Table title="By tier" rows={count(all, (r) => r.tier)} />
          <Table title="By form" rows={count(all, (r) => r.variant)} />
          <div className="rounded-lg bg-white p-5 shadow-card lg:col-span-3"><h3 className="mb-3 font-semibold">Recent leads</h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="text-left text-xs text-hunter/60"><tr><th>When</th><th>Type</th><th>City</th><th>Zone</th><th>Tier</th><th>Photos</th><th>Source</th><th>CRM</th></tr></thead>
            <tbody>{all.slice(0, 50).map((r) => <tr key={r.id} className="border-t border-cream-dark"><td className="py-1.5">{new Date(r.at).toLocaleString("en-US", { timeZone: "America/New_York" })}</td><td>{r.customerType}{r.segment ? ` · ${r.segment}` : ""}</td><td>{r.city}</td><td>{r.zone ?? "—"}</td><td>{r.tier} ({r.score})</td><td>{r.photos}</td><td>{r.source}</td><td className={r.ghl?.error ? "text-red-700" : ""}>{r.ghl?.error ? "error" : r.ghl?.mode}</td></tr>)}</tbody></table></div>
          </div>
          <div className="rounded-lg border border-dashed border-patina bg-white p-5 text-sm lg:col-span-3"><p className="font-semibold">Technician utilisation · gross margin · territory profitability</p><p className="mt-1 text-hunter/70">Populated from SmartOps jobs, work orders and payments once connected (docs/09 §Data contract). Not estimated from lead data.</p></div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Table title="Leads by market" rows={count(all, (r) => markets.find((m) => m.id === r.market)?.shortName ?? "Out of area")} />
          <Table title="Leads by city" rows={count(all, (r) => r.city)} />
          <Table title="Leads by source" rows={count(all, (r) => `${r.source}${r.medium ? ` / ${r.medium}` : ""}`)} />
          <Table title="Leads by campaign" rows={count(all, (r) => r.campaign)} />
          <Table title="Leads by service interest" rows={count(all.flatMap((r) => (r.surfaces?.length ? r.surfaces : ["unspecified"]).map((s) => ({ s }))), (x) => x.s)} />
          <Table title="Commercial pipeline (inbound)" rows={[["Commercial / PM leads", commercial.length], ...count(commercial, (r) => r.segment ?? r.pipeline)]} />
          <Table title="Conversion events" rows={count(conv, (c) => c.event)} />
          <Table title="Won value by market" rows={markets.map((m) => [m.shortName, money(won.filter((c) => c.market === m.id).reduce((s, c) => s + c.value, 0))] as [string, string])} />
          <Table title="Repeat business" rows={[["Requires SmartOps customer history", "—"]]} />
        </div>
      )}
    </div>
  );
}
