"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Badge, btn, Card, chip, H, small, Stat, Table, Td, useApi, when, type Api } from "./ui";
import { AuditPanel, CrmPanel, DataMoonPanel, HealthPanel, ReportsPanel, StaffPanel, SuppressionsPanel } from "./OpsPanels";
import { ArPanel, AreasPanel, EstimatorPanel, WalkthroughsPanel } from "./OpsPhase4Panels";

const Logo = () => <span className="font-serif text-2xl tracking-wide text-basalt">StoneCraft</span>;

type Me = { actor: { id: string; name: string; role: string; roleLabel: string }; permissions: string[]; brand: string; sandbox: boolean };
const TABS = [
  ["overview", "Overview", "records.read"], ["records", "Records", "records.read"], ["projects", "Projects", "projects.read"],
  ["walkthroughs", "Walkthroughs", "walkthrough.read"], ["estimator", "Estimator (private)", "estimator.read"], ["areas", "Service areas", "areas.read"], ["crm", "CRM outbox", "crm.read"], ["datamoon", "DataMoon", "datamoon.read"],
  ["suppressions", "Opt-outs", "suppressions.read"], ["reports", "Reports", "reports.read"], ["staff", "Staff & roles", "staff.read"],
  ["ar", "AR (disabled)", "ar.read"], ["health", "Integrations", "health.read"], ["audit", "Audit log", "audit.read"],
] as const;
type Tab = (typeof TABS)[number][0];

export function OpsConsole() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [token, setToken] = useState(""); const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const onUnauth = useCallback(() => setMe(null), []);
  const api = useApi(onUnauth);
  const can = (p: string) => !!me?.permissions.includes(p);

  const loadMe = useCallback(async () => { const r = await api("/session"); setMe(r.ok ? r.j : null); setChecked(true); }, [api]);
  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t && TABS.some((x) => x[0] === t)) setTab(t as Tab); }, []);
  const go = (t: Tab) => { setTab(t); const u = new URL(window.location.href); u.searchParams.set("tab", t); window.history.replaceState(null, "", u); };

  if (!checked) return <main className="container-sc py-20 text-sage-ink">Loading…</main>;
  if (!me) {
    return (
      <main className="container-sc flex min-h-screen max-w-md flex-col justify-center py-16">
        <Logo />
        <h1 className="mt-8 font-serif text-3xl text-basalt">StoneCraft operations</h1>
        <p className="mt-2 text-sm text-sage-ink">Staff only. Access is role-based and every action is audited.</p>
        <form className="mt-6 space-y-3" onSubmit={async (e) => { e.preventDefault(); setMsg(""); const r = await api("/session", { method: "POST", body: JSON.stringify({ token }) }); setToken(""); if (r.ok) loadMe(); else setMsg(r.j.error || "Sign-in failed"); }}>
          <label htmlFor="ops-token" className="label">Staff token</label>
          <input id="ops-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="field" required minLength={16} />
          <button className="btn btn-hunter w-full">Sign in</button>
          {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
        </form>
      </main>
    );
  }

  const visible = TABS.filter(([, , p]) => can(p));
  return (
    <main className="container-sc py-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><Logo /><span className="rounded-full bg-basalt px-3 py-1 text-xs font-semibold text-bronze-light">Operations · {me.actor.roleLabel}</span>{me.sandbox && <Badge tone="warn">Staging / sandbox data</Badge>}</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center text-sage-ink">{me.actor.name}</span>
          <button className={chip} onClick={async () => { await api("/session", { method: "DELETE" }); setMe(null); }}>Sign out</button>
        </div>
      </header>
      <nav aria-label="Admin sections" className="-mx-4 mt-5 overflow-x-auto px-4"><div className="flex gap-2 pb-1" role="tablist">
        {visible.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={`${chip} ${tab === k ? "!border-basalt !bg-basalt text-bone" : ""}`} onClick={() => go(k)}>{label}</button>)}
      </div></nav>
      <div className="mt-6">
        {tab === "overview" && <Overview api={api} can={can} go={go} />}
        {tab === "records" && <Records api={api} can={can} />}
        {tab === "projects" && <Projects api={api} can={can} />}
        {tab === "walkthroughs" && <WalkthroughsPanel api={api} can={can} />}
        {tab === "estimator" && <EstimatorPanel api={api} can={can} role={me.actor.role} />}
        {tab === "areas" && <AreasPanel api={api} can={can} />}
        {tab === "ar" && <ArPanel api={api} />}
        {tab === "crm" && <CrmPanel api={api} can={can} />}
        {tab === "datamoon" && <DataMoonPanel api={api} can={can} role={me.actor.role} />}
        {tab === "suppressions" && <SuppressionsPanel api={api} can={can} />}
        {tab === "reports" && <ReportsPanel api={api} />}
        {tab === "staff" && <StaffPanel api={api} can={can} me={me.actor.id} />}
        {tab === "health" && <HealthPanel api={api} />}
        {tab === "audit" && <AuditPanel api={api} />}
      </div>
    </main>
  );
}

function Overview({ api, can, go }: { api: Api; can: (p: string) => boolean; go: (t: Tab) => void }) {
  const [d, setD] = useState<any>(null); const [h, setH] = useState<any>(null);
  useEffect(() => { (async () => { const r = await api("/records?limit=500"); if (r.ok) setD(r.j); if (can("health.read")) { const x = await api("/health"); if (x.ok) setH(x.j.health); } })(); }, [api, can]);
  if (!d) return <p className="text-sage-ink">Loading…</p>;
  const n = (t: string) => d.rows.filter((r: any) => r.type === t).length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Site leads" value={n("lead")} /><Stat label="Walkthroughs" value={n("walkthrough")} /><Stat label="Proposals" value={n("proposal")} hint="private" />
        <Stat label="SE Florida leads" value={d.rows.filter((r: any) => r.type === "lead" && r.market === "south-florida").length} /><Stat label="Projects" value={n("project")} /><Stat label="Vendor prospects" value={n("vendor_prospect")} hint="DataMoon · separate" />
      </div>
      {h && (
        <Card title="System status">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Storage: <b>{h.storage.kv}</b></p><p>Documents: <b>{h.storage.documents}</b></p><p>GHL: <b>{h.crm.ghl}</b></p><p>DataMoon: <b>{h.datamoon.label}</b></p>
            <p>Outbox pending: <b>{h.outbox.pending}</b> · dead: <b>{h.outbox.dead}</b></p><p>Worker: <b>{h.outbox.worker}</b></p>
          </div>
          <button className={`${chip} mt-3`} onClick={() => go("health")}>Open integration health</button>
        </Card>
      )}
      <Card title="Newest records">
        <Table head={["Ref", "Type", "Status", "Market", "Source", "Created"]} empty={!d.rows.length}>
          {d.rows.slice(0, 8).map((r: any) => <tr key={r.type + r.id}><Td className="font-semibold text-basalt">{r.reference}</Td><Td>{r.type.replace("_", " ")}</Td><Td>{r.status}</Td><Td>{r.market}{r.county ? ` · ${r.county}` : ""}</Td><Td>{r.source}</Td><Td>{when(r.createdAt)}</Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}

function Records({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const [f, setF] = useState({ q: "", type: "", status: "", market: "", county: "", source: "", from: "", to: "", firstParty: "" });
  const [d, setD] = useState<any>(null); const [sel, setSel] = useState<any>(null);
  const qs = () => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const search = useCallback(async () => { const r = await api(`/records?${qs()}`); if (r.ok) setD(r.j); }, [api, f]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <label className="sr-only" htmlFor="rq">Search</label><input id="rq" className={`${small} sm:col-span-2`} placeholder={can("records.read_pii") ? "Reference, name, email, status…" : "Reference, id or status…"} value={f.q} onChange={set("q")} />
          <select aria-label="Type" className={small} value={f.type} onChange={set("type")}><option value="">All types</option>{["lead", "walkthrough", "proposal", "project", "vendor_prospect"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
          <select aria-label="Market" className={small} value={f.market} onChange={set("market")}><option value="">All markets</option><option value="boston">Greater Boston</option><option value="south-florida">Southeast Florida</option><option value="unknown">Unknown / out of area</option></select>
          <select aria-label="County" className={small} value={f.county} onChange={set("county")}><option value="">All FL counties</option><option value="palm-beach">Palm Beach</option><option value="broward">Broward</option><option value="unconfirmed">Unconfirmed</option></select>
          <input aria-label="Status" className={small} placeholder="Status" value={f.status} onChange={set("status")} />
          <input aria-label="Source" className={small} placeholder="Source (utm)" value={f.source} onChange={set("source")} />
          <input aria-label="From date" type="date" className={small} value={f.from} onChange={set("from")} />
          <input aria-label="To date" type="date" className={small} value={f.to} onChange={set("to")} />
          <select aria-label="Origin" className={small} value={f.firstParty} onChange={set("firstParty")}><option value="">First-party + vendor</option><option value="1">First-party only</option><option value="0">Vendor prospects only</option></select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className={btn}>Search</button>{can("records.export") && <a className={chip} href={`/api/admin/ops/records?${qs()}&format=csv`}>Export CSV (permitted fields)</a>}</div>
        </form>
        {d && <p className="mt-3 text-xs text-sage-ink">{d.total} result(s){!d.pii && " · contact details masked for your role"}</p>}
        <div className="mt-3"><Table head={["Ref", "Type", "Name", "Status", "Market", "Source", "Created"]} empty={!!d && !d.rows.length}>
          {d?.rows.map((r: any) => (
            <tr key={r.type + r.id} className="cursor-pointer hover:bg-bone-2/60" onClick={async () => { const x = await api(`/records/${r.type}/${r.id}`); if (x.ok) setSel(x.j); }}>
              <Td className="font-semibold text-basalt">{r.reference}{r.sandbox && <span className="ml-1 text-xs text-bronze">TEST</span>}</Td><Td>{r.type.replace("_", " ")}{!r.firstParty && <> <Badge tone="warn">vendor</Badge></>}</Td><Td>{r.name || "—"}</Td><Td>{r.status}</Td><Td>{r.market}</Td><Td>{r.source}</Td><Td>{when(r.createdAt)}</Td>
            </tr>))}
        </Table></div>
      </Card>
      <Card title="Record">
        {!sel ? <p className="text-sm text-sage-ink">Select a record to see its lineage, CRM state and linked projects.</p> : (
          <div className="space-y-3 text-sm">
            <p className="font-serif text-2xl text-basalt">{sel.record.reference}</p>
            <p><Badge tone={sel.record.firstParty ? "ok" : "warn"}>{sel.record.firstParty ? "First-party" : "DataMoon vendor prospect — third-party, not a lead"}</Badge></p>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
              {[["Type", sel.record.type], ["Status", sel.record.status], ["Detail", sel.record.secondary], ["Name", sel.record.name], ["Email", sel.record.email], ["Market", sel.record.market], ["County", sel.record.county], ["Source", sel.record.source], ["CRM", sel.record.crm || "—"], ["Created", when(sel.record.createdAt)]].map(([k, v]) => <Fragment key={k}><dt className="text-sage-ink">{k}</dt><dd className="break-words">{v || "—"}</dd></Fragment>)}
            </dl>
            {sel.deepLink && <a className={chip} href={sel.deepLink} onClick={(e) => { e.preventDefault(); const [t] = sel.deepLink.slice(1).split(":"); const u = new URL(window.location.href); u.searchParams.set("tab", t); u.searchParams.set("open", sel.record.id); window.location.href = u.toString(); }}>Open in {sel.record.type === "walkthrough" ? "Walkthroughs" : "Estimator"}</a>}
            <H>Linked projects</H>
            <ul className="list-disc pl-5">{sel.linkedProjects.map((p: any) => <li key={p.id}>{p.reference} · {p.title} · {p.status}</li>)}{!sel.linkedProjects.length && <li className="list-none text-sage-ink">None</li>}</ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function Projects({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const [list, setList] = useState<any[]>([]); const [sel, setSel] = useState<any>(null); const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ title: "", type: "shower", market: "boston", dueDate: "", link: "", linkType: "lead" });
  const load = useCallback(async () => { const r = await api("/projects"); if (r.ok) setList(r.j.projects); }, [api]);
  const open = useCallback(async (id: string) => { const r = await api(`/projects/${id}`); if (r.ok) setSel(r.j); }, [api]);
  useEffect(() => { load(); }, [load]);
  const patch = async (body: any) => { const r = await api(`/projects/${sel.project.id}`, { method: "PATCH", body: JSON.stringify(body) }); setMsg(r.ok ? "Saved" : `⚠ ${r.j.error}`); await open(sel.project.id); load(); };
  const upload = async (file: File, category: string) => {
    setMsg("Requesting a private upload link…");
    const r = await api(`/projects/${sel.project.id}/documents`, { method: "POST", body: JSON.stringify({ category, label: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "document", contentType: file.type, size: file.size }) });
    if (!r.ok) { setMsg(`⚠ ${r.j.error}`); return; }
    const put = await fetch(r.j.upload.url, { method: "PUT", headers: r.j.upload.headers, body: file });
    if (!put.ok) { setMsg("⚠ Upload failed"); return; }
    const c = await api(`/documents/${r.j.document.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm_upload" }) });
    setMsg(c.ok ? `Uploaded to ${r.j.storage}` : `⚠ ${c.j.error}`); open(sel.project.id);
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
      <div className="space-y-6">
        {can("projects.write") && (
          <Card title="New project">
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const link = form.link.trim(); const r = await api("/projects", { method: "POST", body: JSON.stringify({ title: form.title, type: form.type, market: form.market, dueDate: form.dueDate || undefined, links: link ? [{ type: form.linkType, id: link }] : [] }) }); setMsg(r.ok ? "Project created" : `⚠ ${r.j.error}`); if (r.ok) { setForm({ ...form, title: "", link: "" }); load(); open(r.j.project.id); } }}>
              <input aria-label="Title" className={`${small} sm:col-span-2`} placeholder="Project title" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <select aria-label="Project type" className={small} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{["shower", "floor", "stone", "commercial", "bathroom_refresh", "general"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
              <select aria-label="Market" className={small} value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}><option value="boston">Greater Boston</option><option value="south-florida">Southeast Florida</option><option value="unknown">Unknown</option></select>
              <select aria-label="Linked record type" className={small} value={form.linkType} onChange={(e) => setForm({ ...form, linkType: e.target.value })}>{["lead", "walkthrough", "proposal"].map((t) => <option key={t} value={t}>link: {t}</option>)}</select>
              <input aria-label="Due date" type="date" className={small} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              <input aria-label="Linked record id" className={small} placeholder="Linked record id (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              <button className={`${btn} sm:col-span-2`}>Create project</button>
            </form>
          </Card>
        )}
        <Card title="Projects">
          <Table head={["Ref", "Title", "Type", "Status", "Due"]} empty={!list.length}>
            {list.map((p) => <tr key={p.id} className="cursor-pointer hover:bg-bone-2/60" onClick={() => open(p.id)}><Td className="font-semibold text-basalt">{p.reference}</Td><Td>{p.title}</Td><Td>{p.type.replace(/_/g, " ")}</Td><Td>{p.status.replace(/_/g, " ")}</Td><Td>{p.dueDate || "—"}</Td></tr>)}
          </Table>
        </Card>
      </div>
      <Card title={sel ? `${sel.project.reference} · ${sel.project.title}` : "Project"}>
        {msg && <p className="mb-3 text-sm font-semibold text-basalt" role="status">{msg}</p>}
        {!sel ? <p className="text-sm text-sage-ink">Select or create a project to manage tasks, notes and private documents.</p> : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <select aria-label="Status" className={small} disabled={!can("projects.write")} value={sel.project.status} onChange={(e) => patch({ action: "status", status: e.target.value })}>{["intake", "walkthrough", "estimating", "proposal_approved", "scheduled", "active", "waiting_client", "on_hold", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
              <input aria-label="Assignee" className={small} placeholder="Assignee (staff id)" defaultValue={sel.project.assignee || ""} disabled={!can("projects.write")} onBlur={(e) => e.target.value !== (sel.project.assignee || "") && patch({ action: "assign", assignee: e.target.value })} />
            </div>
            <p className="text-sage-ink">Links: {sel.project.links.map((l: any) => `${l.type}:${l.id.slice(0, 8)}`).join(", ") || "none"} · created by {sel.project.created.by} ({sel.project.created.source})</p>
            <div><H>Tasks</H>
              <ul className="mt-2 space-y-1">{sel.project.tasks.map((t: any) => <li key={t.id}><label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={t.done} disabled={!can("projects.write")} onChange={() => patch({ action: "toggle_task", taskId: t.id })} /><span className={t.done ? "line-through text-sage-ink" : ""}>{t.title}{t.due && ` · due ${t.due}`}</span></label></li>)}</ul>
              {can("projects.write") && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const i = (e.currentTarget.elements.namedItem("t") as HTMLInputElement); if (i.value.trim()) patch({ action: "add_task", title: i.value }); i.value = ""; }}><input name="t" aria-label="New task" className={small} placeholder="Add a task" /><button className={chip}>Add</button></form>}
            </div>
            <div><H>Notes (internal)</H>
              {can("projects.write") && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const i = (e.currentTarget.elements.namedItem("n") as HTMLInputElement); if (i.value.trim()) patch({ action: "note", text: i.value }); i.value = ""; }}><input name="n" aria-label="New note" className={small} placeholder="Add an internal note" /><button className={chip}>Add</button></form>}
              <ul className="mt-2 space-y-2">{sel.project.notes.map((n: any) => <li key={n.id} className="rounded-lg bg-bone/70 p-2"><p className="text-xs text-sage-ink">{n.by} · {when(n.at)}</p><p className="whitespace-pre-wrap">{n.text}</p></li>)}</ul>
            </div>
            {sel.documents && <div><H>Private documents</H>
              <p className="mt-1 text-xs text-sage-ink">Stored privately; downloads use 5-minute signed links and are audited.</p>
              <ul className="mt-2 space-y-2">{sel.documents.map((d: any) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream-dark p-2"><span>{d.label} · {d.category.replace(/_/g, " ")} · {Math.round(d.size / 1024)} KB · <Badge tone={d.status === "verified" ? "ok" : d.status === "uploaded" ? "muted" : "warn"}>{d.status}</Badge>{d.ownerApprovedForDelivery && <> <Badge tone="ok">owner-approved</Badge></>}</span>
                <span className="flex gap-2">{d.status !== "pending_upload" && <button className={chip} onClick={async () => { const r = await api(`/documents/${d.id}`); if (r.ok) window.open(r.j.url, "_blank", "noopener"); else setMsg(`⚠ ${r.j.error}`); }}>Download</button>}
                  {can("projects.write") && d.status === "uploaded" && <button className={chip} onClick={async () => { await api(`/documents/${d.id}`, { method: "PATCH", body: JSON.stringify({ action: "verify" }) }); open(sel.project.id); }}>Mark verified</button>}
                  {can("documents.delete") && <button className={chip} onClick={async () => { if (confirm("Delete this document permanently?")) { await api(`/documents/${d.id}`, { method: "DELETE" }); open(sel.project.id); } }}>Delete</button>}</span></li>)}</ul>
              {can("documents.write") && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const fEl = e.currentTarget.elements.namedItem("f") as HTMLInputElement; const c = (e.currentTarget.elements.namedItem("c") as HTMLSelectElement).value; if (fEl.files?.[0]) upload(fEl.files[0], c); }}>
                <select name="c" aria-label="Category" className={small}>{["photo", "video", "measurement_sheet", "site_check", "deliverable", "proposal_export", "building_rules", "insurance_request", "correspondence", "other"].map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}</select>
                <input name="f" aria-label="File" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime" className="text-sm" /><button className={chip}>Upload privately</button></form>}
            </div>}
          </div>
        )}
      </Card>
    </div>
  );
}
