"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, btn, Card, chip, H, small, Stat, Table, Td, when, type Api } from "./ui";

const useLoad = (api: Api, path: string) => {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api(path); if (r.ok) { setD(r.j); setErr(""); } else setErr(r.j.error || "Failed"); }, [api, path]);
  useEffect(() => { load(); }, [load]);
  return { d, err, load };
};
const Err = ({ e }: { e: string }) => (e ? <p className="text-sm text-red-700" role="alert">{e}</p> : null);

export function CrmPanel({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const { d, err, load } = useLoad(api, "/crm"); const [msg, setMsg] = useState("");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  const tone = (s: string) => (s === "done" ? "ok" : s === "dead" ? "bad" : s === "blocked" ? "warn" : "muted") as any;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat label="Pending" value={d.stats.pending} /><Stat label="Blocked (not configured)" value={d.stats.blocked} /><Stat label="Dead letter" value={d.stats.dead} /><Stat label="Done" value={d.stats.done} /><Stat label="Total" value={d.stats.total} /></div>
      <Card title="Durable CRM outbox">
        <p className="text-sm text-sage-ink">Every failed GoHighLevel write is stored here and retried with backoff (1m → 6h, 6 attempts) before moving to the dead-letter queue. Submitted leads are never discarded when GHL is down.</p>
        {can("crm.replay") && <button className={`${btn} mt-3`} onClick={async () => { const r = await api("/crm", { method: "POST", body: JSON.stringify({ action: "run" }) }); setMsg(r.ok ? `Processed ${r.j.processed} · done ${r.j.done} · failed ${r.j.failed}` : `⚠ ${r.j.error}`); load(); }}>Run worker now</button>}
        {msg && <p className="mt-2 text-sm font-semibold text-basalt" role="status">{msg}</p>}
        <div className="mt-3"><Table head={["Kind", "Ref", "Status", "Attempts", "Next try", "Last error", ""]} empty={!d.jobs.length}>
          {d.jobs.map((j: any) => <tr key={j.id}><Td>{j.kind}</Td><Td className="font-mono text-xs">{j.ref.slice(0, 12)}</Td><Td><Badge tone={tone(j.status)}>{j.status}</Badge></Td><Td>{j.attempts}/{j.maxAttempts}</Td><Td>{j.status === "done" ? "—" : when(new Date(j.nextAttemptAt).toISOString())}</Td><Td className="max-w-xs break-words text-xs text-sage-ink">{j.lastError || "—"}</Td>
            <Td>{can("crm.replay") && (j.status === "dead" || j.status === "blocked") && <button className={chip} onClick={async () => { await api("/crm", { method: "POST", body: JSON.stringify({ action: "replay", id: j.id }) }); load(); }}>Replay</button>}</Td></tr>)}
        </Table></div>
      </Card>
    </div>
  );
}

const emptyRecipe = { name: "", persona: "residential_homeowner", kind: "b2c", api: "main_audience", market: "boston", states: "ma", feedId: "", lookbackDays: 14, maxRecords: 250, purpose: "", legalBasis: "", cta: "", ghl: false };
export function DataMoonPanel({ api, can, role }: { api: Api; can: (p: string) => boolean; role: string }) {
  const { d, err, load } = useLoad(api, "/datamoon");
  const [msg, setMsg] = useState(""); const [issues, setIssues] = useState<string[]>([]);
  const [topicQ, setTopicQ] = useState({ kind: "b2c", q: "" }); const [topics, setTopics] = useState<any>(null);
  const [picked, setPicked] = useState<any[]>([]); const [form, setForm] = useState<any>(emptyRecipe);
  const [imp, setImp] = useState({ recipeId: "", csv: "" });
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  const act = async (id: string, action: string) => { const r = await api(`/datamoon/recipes/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }); setMsg(r.ok ? `${action.replace(/_/g, " ")}: ok${r.j.result?.synthetic ? " (synthetic)" : ""}${r.j.result?.total_records !== undefined ? ` · ${r.j.result.total_records} records (est.)` : ""}` : `⚠ ${r.j.error}`); setIssues(r.j.issues || []); load(); };
  const st = d.status;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-bronze/50 bg-bronze-pale px-4 py-3 text-sm">
        <p className="font-semibold text-basalt">DataMoon: {st.label}. Main API <b>{st.main}</b> · Intent API <b>{st.intent}</b> · Webhook <b>{st.webhook}</b> · Activation <b>{st.activation}</b> · GHL sync <b>{st.ghlSync}</b></p>
        <p className="mt-1">Two markets only: Greater Boston (MA) and Southeast Florida (FL — Palm Beach and Broward). Every recipe is locked to one market and its own GHL destination. No ethnicity, religion, nationality, age, health, wealth or income targeting. Prospects are third-party data, kept apart from first-party leads, and never auto-enrolled in SMS or email. All DataMoon assumptions are UNVERIFIED until the owner buys access and checks the docs.</p>
        {d.fixtureLabel && <p className="mt-1"><Badge tone="warn">{d.fixtureLabel}</Badge></p>}
      </div>
      {can("datamoon.recipe_write") && <Card title="Start from a template (Boston / Southeast Florida)">
        <div className="flex flex-wrap gap-2">{[["boston-b2c-bath-refresh", "Boston · homeowners (B2C)"], ["boston-b2b-facilities", "Boston · facilities (B2B)"], ["fl-b2c-condo-stone", "SE Florida · condo owners (B2C)"], ["fl-b2b-hoa-hospitality", "SE Florida · HOA & hospitality (B2B)"]].map(([k, l]) => <button key={k} className={chip} data-testid={`dm-template-${k}`} onClick={async () => { const r = await api("/datamoon/templates", { method: "POST", body: JSON.stringify({ key: k }) }); setMsg(r.ok ? `Draft recipe created from template (synthetic fixture topics): ${r.j.recipe.name}` : `⚠ ${r.j.error}`); setIssues(r.ok ? r.j.recipe.issues : r.j.issues || []); load(); }}>{l}</button>)}</div>
        <p className="mt-2 text-xs text-sage-ink">Templates use synthetic fixture topic ids. Re-confirm real topic ids through discovery once DataMoon access exists.</p>
      </Card>}
      {msg && <p className="text-sm font-semibold text-basalt" role="status">{msg}</p>}
      {!!issues.length && <ul className="list-disc rounded-xl bg-[#a2402b]/5 p-3 pl-8 text-sm text-[#a2402b]">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Credits remaining" value={d.credits?.remaining ?? "—"} hint={d.credits?.synthetic ? "synthetic" : d.credits ? "org pool" : "not connected"} />
        <Stat label="Record ceiling / run" value={st.recordCeiling || "not set"} /><Stat label="Monthly budget" value={st.monthlyBudget || "not set"} /><Stat label="Vendor prospects" value={d.contacts.total} hint={`retention ${st.retentionDays} days`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Topic discovery">
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await api(`/datamoon/topics?kind=${topicQ.kind}&q=${encodeURIComponent(topicQ.q)}`); setTopics(r.j); }}>
            <select aria-label="Topic kind" className={small} value={topicQ.kind} onChange={(e) => setTopicQ({ ...topicQ, kind: e.target.value })}><option value="b2c">B2C</option><option value="b2b">B2B</option></select>
            <input aria-label="Keywords" className={small} placeholder="e.g. tile, flooring, facilities" value={topicQ.q} onChange={(e) => setTopicQ({ ...topicQ, q: e.target.value })} /><button className={chip}>Search</button>
          </form>
          {topics && <><p className="mt-2 text-xs text-sage-ink">Source: {topics.source}{topics.label ? ` · ${topics.label}` : ""}</p>
            <ul className="mt-2 space-y-1 text-sm">{topics.topics.map((t: any) => <li key={t.id} className="flex items-center justify-between gap-2"><span>{t.name} <span className="text-xs text-sage-ink">({String(t.id)})</span></span>
              {can("datamoon.recipe_write") && <button className={chip} disabled={picked.length >= 5 || picked.some((p) => p.id === t.id)} onClick={async () => { const r = await api("/datamoon/topics", { method: "POST", body: JSON.stringify({ kind: t.kind, id: t.id, name: t.name, synthetic: !!t.synthetic }) }); if (r.ok) setPicked([...picked, r.j.topic]); }}>Confirm & add</button>}</li>)}</ul></>}
          <p className="mt-3 text-xs text-sage-ink">Topic ids are saved only from discovery results, with a review timestamp. Max 5 per audience.</p>
        </Card>
        {can("datamoon.recipe_write") && <Card title="New audience recipe">
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const body = { name: form.name, persona: form.persona, kind: form.kind, api: form.api, market: form.market, states: form.states.split(/[\s,]+/).filter(Boolean).map((s: string) => s.toLowerCase()), topics: picked.map((p) => ({ kind: p.kind, id: p.id, name: p.name, confirmedAt: p.confirmedAt, synthetic: p.synthetic })), feedId: form.feedId || undefined, lookbackDays: Number(form.lookbackDays), maxRecords: Number(form.maxRecords), purpose: form.purpose, legalBasis: form.legalBasis, cta: form.cta || undefined, destinations: form.ghl ? ["admin_review_only", form.market === "boston" ? "ghl_stonecraft_boston" : "ghl_stonecraft_fl"] : ["admin_review_only"] };
            const r = await api("/datamoon/recipes", { method: "POST", body: JSON.stringify(body) }); setMsg(r.ok ? "Recipe saved as draft" : `⚠ ${r.j.error}`); setIssues(r.ok ? r.j.recipe.issues : r.j.issues || []); if (r.ok) { setForm(emptyRecipe); setPicked([]); load(); } }}>
            <input aria-label="Recipe name" className={`${small} sm:col-span-2`} placeholder="Recipe name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select aria-label="Persona" className={small} value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })}>{["residential_homeowner", "residential_condo_owner", "landlord_small_portfolio", "commercial_facilities", "property_management", "hospitality_hoa"].map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}</select>
            <select aria-label="Market" className={small} value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value, states: e.target.value === "boston" ? "ma" : "fl" })}><option value="boston">Greater Boston (MA)</option><option value="south-florida">Southeast Florida (FL)</option></select>
            <select aria-label="API" className={small} value={form.api} onChange={(e) => setForm({ ...form, api: e.target.value })}><option value="intent_feed">Intent API feed export</option><option value="main_audience">Main API audience build</option></select>
            <select aria-label="Kind" className={small} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="b2c">B2C</option><option value="b2b">B2B</option></select>
            <select aria-label="Feed" className={small} value={form.feedId} onChange={(e) => setForm({ ...form, feedId: e.target.value })}><option value="">Feed (intent only)</option>{d.feeds.map((f: any) => <option key={f.id} value={f.id}>{f.description}</option>)}</select>
            <input aria-label="US states" className={small} placeholder="US states, e.g. ny, tx (blank = all US)" value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} />
            <label className="text-xs text-sage-ink">Lookback days (max 14)<input type="number" min={1} max={14} className={small} value={form.lookbackDays} onChange={(e) => setForm({ ...form, lookbackDays: e.target.value })} /></label>
            <label className="text-xs text-sage-ink">Max records<input type="number" min={1} className={small} value={form.maxRecords} onChange={(e) => setForm({ ...form, maxRecords: e.target.value })} /></label>
            <input aria-label="Purpose" className={`${small} sm:col-span-2`} placeholder="Purpose (e.g. invite to the Readiness Review guide via opt-in landing page)" required value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            <input aria-label="Legal basis" className={`${small} sm:col-span-2`} placeholder="Consent / legal basis (to be reviewed by counsel)" required value={form.legalBasis} onChange={(e) => setForm({ ...form, legalBasis: e.target.value })} />
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-5 w-5" checked={form.ghl} onChange={(e) => setForm({ ...form, ghl: e.target.checked })} />Allow sync to this market's StoneCraft GHL location after owner approval (tagged no-auto-outreach)</label>
            <p className="text-xs text-sage-ink sm:col-span-2">Topics: {picked.map((p) => p.name).join(", ") || "none confirmed yet"}</p>
            <button className={`${btn} sm:col-span-2`}>Save draft recipe</button>
          </form>
        </Card>}
      </div>
      <Card title="Audience recipes">
        <Table head={["Recipe", "Persona", "API", "Status", "Max / credits", "Approvals", "Last run", "Actions"]} empty={!d.recipes.length}>
          {d.recipes.map((r: any) => <tr key={r.id}><Td className="font-semibold text-basalt">{r.name}{r.synthetic && <> <Badge tone="warn">synthetic</Badge></>}</Td><Td>{r.persona.replace(/_/g, " ")}</Td><Td>{r.api.replace("_", " ")}</Td><Td>{r.status}</Td><Td>{r.maxRecords} / ~{r.estimatedCredits}</Td>
            <Td className="text-xs">{r.exportApproval ? `export ✓ ${r.exportApproval.by}` : "export —"}<br />{r.crmSyncApproval ? `CRM ✓ ${r.crmSyncApproval.by}` : "CRM —"}</Td><Td>{when(r.lastRunAt)}</Td>
            <Td><div className="flex flex-wrap gap-1">
              {can("datamoon.recipe_write") && <><button className={chip} onClick={() => act(r.id, "preview")}>Preview</button>{r.status === "draft" && <button className={chip} onClick={() => act(r.id, "submit")}>Submit</button>}</>}
              {role === "owner" && <>{r.status === "submitted" && <button className={chip} onClick={() => act(r.id, "approve")}>Approve</button>}{r.status === "approved" && !r.exportApproval && <button className={chip} onClick={() => act(r.id, "approve_export")}>Approve export</button>}{r.exportApproval && !r.crmSyncApproval && <button className={chip} onClick={() => act(r.id, "approve_crm_sync")}>Approve CRM sync</button>}{r.exportApproval && <button className={chip} onClick={() => act(r.id, "run")}>Run</button>}</>}
              {can("datamoon.recipe_write") && r.status !== "retired" && <button className={chip} onClick={() => act(r.id, "pause")}>Pause</button>}
            </div></Td></tr>)}
        </Table>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {can("datamoon.import") && <Card title="Import (dry run first)">
          <select aria-label="Recipe for import" className={small} value={imp.recipeId} onChange={(e) => setImp({ ...imp, recipeId: e.target.value })}><option value="">Choose recipe…</option>{d.recipes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <textarea aria-label="CSV" className="field mt-2 min-h-24 font-mono text-xs" placeholder="Paste DataMoon export CSV (contact_id, first_name, last_name, personal_emails, personal_state, contact_country …)" value={imp.csv} onChange={(e) => setImp({ ...imp, csv: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-2">
            {[["CSV dry run", { source: "csv", dryRun: true }], ["Import CSV", { source: "csv", dryRun: false }], ["Synthetic fixture dry run", { source: "fixture", dryRun: true }], ["Import synthetic fixture", { source: "fixture", dryRun: false }]].map(([label, o]: any) => <button key={label} className={chip} onClick={async () => { const r = await api("/datamoon/imports", { method: "POST", body: JSON.stringify({ recipeId: imp.recipeId, csv: imp.csv, ...o }) }); setMsg(r.ok ? `${label}: accepted ${r.j.summary.accepted} · rejected ${r.j.summary.rejected} · duplicates ${r.j.summary.duplicates} · suppressed ${r.j.summary.suppressed}` : `⚠ ${r.j.error}`); load(); }}>{label}</button>)}
          </div>
        </Card>}
        <Card title="Import & webhook log">
          <H>Imports</H>
          <ul className="mt-1 space-y-1 text-sm">{d.imports.slice(0, 8).map((i: any) => <li key={i.id}>{when(i.at)} · {i.dryRun ? "dry run" : "import"} · ✓{i.accepted} ✗{i.rejected} dup {i.duplicates} supp {i.suppressed}{i.synthetic && " · synthetic"}</li>)}{!d.imports.length && <li className="text-sage-ink">None</li>}</ul>
          <H>Webhook events</H>
          <ul className="mt-1 space-y-1 text-sm">{d.events.slice(0, 8).map((e: any) => <li key={e.id + e.receivedAt}>{when(e.receivedAt)} · {e.status} · {e.exportId?.slice(0, 8) || "—"}</li>)}{!d.events.length && <li className="text-sage-ink">None (webhook {st.webhook})</li>}</ul>
        </Card>
      </div>
      <Card title={`Vendor prospects (${d.contacts.total}) — third-party, not leads`}>
        <Table head={["Contact id", "Email", "State", "Status", "Imported", "Expires", ""]} empty={!d.contacts.sample.length}>
          {d.contacts.sample.map((c: any) => <tr key={c.id}><Td className="font-mono text-xs">{c.contactId}</Td><Td>{c.email || "—"}</Td><Td>{c.state?.toUpperCase() || "—"}{c.market ? ` · ${c.market}` : ""}</Td><Td>{c.status}{c.synthetic && " · synthetic"}</Td><Td>{when(c.importedAt)}</Td><Td>{when(c.expiresAt)}</Td>
            <Td><div className="flex gap-1">{can("datamoon.sync_crm") && <button className={chip} onClick={async () => { const r = await api("/datamoon/contacts", { method: "POST", body: JSON.stringify({ action: "sync", ids: [c.id] }) }); setMsg(r.ok ? `Queued ${r.j.queued} for GHL (runs only if approved and enabled)` : `⚠ ${r.j.error}`); }}>Queue GHL</button>}{can("suppressions.write") && <button className={chip} onClick={async () => { if (confirm("Delete this prospect and suppress future imports?")) { await api("/datamoon/contacts", { method: "POST", body: JSON.stringify({ action: "delete", ids: [c.id] }) }); load(); } }}>Delete</button>}</div></Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}

export function SuppressionsPanel({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const { d, err, load } = useLoad(api, "/suppressions"); const [f, setF] = useState({ email: "", reason: "opt_out", note: "" }); const [msg, setMsg] = useState("");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      {can("suppressions.write") && <Card title="Add opt-out / suppression">
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const r = await api("/suppressions", { method: "POST", body: JSON.stringify({ email: f.email.includes("@") ? f.email : undefined, contactId: f.email.startsWith("id_") ? f.email : undefined, reason: f.reason, note: f.note || undefined }) }); setMsg(r.ok ? "Suppressed" : `⚠ ${r.j.error}`); if (r.ok) { setF({ ...f, email: "", note: "" }); load(); } }}>
          <input aria-label="Email or DataMoon contact id" className={small} placeholder="Email or DataMoon contact id (id_…)" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <select aria-label="Reason" className={small} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{["opt_out", "privacy_request", "do_not_contact", "bounced", "existing_customer", "manual"].map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}</select>
          <input aria-label="Note" className={small} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className={btn}>Suppress</button>{msg && <p className="text-sm font-semibold text-basalt" role="status">{msg}</p>}
          <p className="text-xs text-sage-ink">Emails are stored as SHA-256 hashes. Suppressed people are dropped from every DataMoon import and blocked from CRM sync.</p>
        </form>
      </Card>}
      <Card title={`Suppression ledger (${d.suppressions.length})`}>
        <Table head={["Who", "Kind", "Reason", "By", "When", ""]} empty={!d.suppressions.length}>
          {d.suppressions.map((s: any) => <tr key={s.key}><Td>{s.emailMasked || s.key}</Td><Td>{s.kind}</Td><Td>{s.reason}</Td><Td>{s.by}</Td><Td>{when(s.at)}</Td><Td>{can("suppressions.write") && <button className={chip} onClick={async () => { if (confirm("Remove this suppression?")) { await api(`/suppressions/${s.key}`, { method: "DELETE" }); load(); } }}>Remove</button>}</Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}

const Bars = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data).filter(([k]) => k !== "_").sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...entries.map(([, v]) => v));
  return <ul className="space-y-1.5 text-sm">{entries.map(([k, v]) => <li key={k}><div className="flex justify-between"><span>{k.replace(/_/g, " ")}</span><span className="font-semibold">{v}</span></div><div className="h-2 rounded bg-bone-2"><div className="h-2 rounded bg-basalt" style={{ width: `${(v / max) * 100}%` }} /></div></li>)}{!entries.length && <li className="text-sage-ink">No data</li>}</ul>;
};
export function ReportsPanel({ api }: { api: Api }) {
  const { d, err } = useLoad(api, "/reports");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  const r = d.report;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="All records" value={r.totals.records} /><Stat label="First-party" value={r.totals.firstParty} /><Stat label="Vendor prospects" value={r.totals.vendorProspects} />{r.proposals.approvedValueUsd ? <Stat label="Approved proposals (live, owner)" value={`$${r.proposals.approvedValueUsd.live.toLocaleString()}`} hint={`sandbox: $${r.proposals.approvedValueUsd.sandbox.toLocaleString()}`} /> : <Stat label="Proposals" value={Object.values(r.proposals.byStatus as Record<string, number>).reduce((a, b) => a + b, 0)} />}</div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card title="By type"><Bars data={r.byType} /></Card><Card title="By market"><Bars data={r.byMarket} /></Card><Card title="Southeast Florida by county"><Bars data={r.byCounty} /></Card><Card title="Lead tiers"><Bars data={r.leadsByTier} /></Card><Card title="By source"><Bars data={r.bySource} /></Card>
        <Card title="By month"><Bars data={r.byMonth} /></Card><Card title="Walkthroughs by status"><Bars data={r.walkthroughs.byStatus} /></Card><Card title="Walkthroughs by work type"><Bars data={r.walkthroughs.byWorkType} /></Card><Card title="Walkthrough outcomes"><Bars data={r.walkthroughs.byOutcome} /></Card><Card title="Escalations"><Bars data={r.walkthroughs.escalations} /></Card><Card title="Proposals by status"><Bars data={r.proposals.byStatus} /></Card>
      </div>
      <p className="text-xs text-sage-ink">Generated {when(r.generatedAt)}. Counts only; no personal data. {r.proposals.approvedValueUsd?.note}</p>
    </div>
  );
}

export function StaffPanel({ api, can, me }: { api: Api; can: (p: string) => boolean; me: string }) {
  const { d, err, load } = useLoad(api, "/staff");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  return (
    <div className="space-y-6">
      <Card title="Staff">
        <p className="mb-3 text-sm text-sage-ink">Staff are defined in server-only environment variables (token hashes only). Disabling revokes active sessions immediately.</p>
        <Table head={["Id", "Name", "Role", "Brands", "Source", "Status", ""]}>
          {d.staff.map((s: any) => <tr key={s.id}><Td className="font-mono text-xs">{s.id}</Td><Td>{s.name}</Td><Td>{s.roleLabel}</Td><Td>{s.brands.join(", ")}</Td><Td>{s.source}</Td><Td>{s.disabled ? <Badge tone="bad">disabled</Badge> : <Badge tone="ok">active</Badge>}</Td>
            <Td>{can("staff.write") && s.id !== me && <button className={chip} onClick={async () => { await api("/staff", { method: "PATCH", body: JSON.stringify({ id: s.id, disabled: !s.disabled }) }); load(); }}>{s.disabled ? "Enable" : "Disable"}</button>}</Td></tr>)}
        </Table>
      </Card>
      <Card title="Role permissions (deny by default)">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{d.roles.map((r: any) => <div key={r.role} className="rounded-xl border border-cream-dark p-3"><p className="font-semibold text-basalt">{r.label}</p><p className="mt-1 text-xs leading-relaxed text-sage-ink">{r.permissions.join(" · ")}</p></div>)}</div>
      </Card>
    </div>
  );
}

export function HealthPanel({ api }: { api: Api }) {
  const { d, err, load } = useLoad(api, "/health");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  const h = d.health;
  const Row = ({ k, v }: { k: string; v: any }) => <div className="flex flex-wrap justify-between gap-2 border-t border-cream-dark py-2 text-sm first:border-0"><span className="text-sage-ink">{k}</span><span className="font-semibold">{typeof v === "boolean" ? (v ? "configured (unverified)" : "not configured") : String(v ?? "—")}</span></div>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-sage-ink">{h.note} <button className="underline" onClick={load}>Refresh</button></p>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Markets"><Row k="Greater Boston" v={h.markets.boston} /><Row k="Southeast Florida" v={h.markets.southFlorida} /><Row k="FL kill switch" v={h.markets.flKillSwitch} /></Card>
        <Card title="Storage"><Row k="Records (KV)" v={h.storage.kv} /><Row k="Private files" v={h.storage.privateFiles} /></Card>
        <Card title="CRM"><Row k="GoHighLevel" v={h.crm.ghl} /><Row k="Boston location id" v={h.crm.bostonLocation} /><Row k="FL location id" v={h.crm.flLocation} /></Card>
        <Card title="Tracking"><Row k="Meta CAPI" v={h.tracking.metaCapi} /><Row k="GA4 MP" v={h.tracking.ga4Mp} /><Row k="Pixels consent-gated" v={h.tracking.pixelsConsentGated ? "yes" : "no"} /></Card>
        <Card title="Walkthrough & AR"><Row k="Guided walkthrough" v={h.walkthrough.enabled ? "on" : "off"} /><Row k="Self-start after form" v={h.walkthrough.selfStart ? "on" : "off"} />{h.ar.map((a: any) => <Row key={a.provider} k={`AR · ${a.provider}`} v={a.status} />)}</Card>
        <Card title="DataMoon"><Row k="Status" v={h.datamoon.label} /><Row k="Main API" v={h.datamoon.main} /><Row k="Intent API" v={h.datamoon.intent} /><Row k="Webhook" v={h.datamoon.webhook} /><Row k="Provider" v={h.datamoon.provider} /><Row k="Credits" v={h.datamoon.credits ? `${h.datamoon.credits.remaining ?? "uncapped"}${h.datamoon.credits.synthetic ? " (synthetic)" : ""}` : "—"} /></Card>
        <Card title="Outbox & admin"><Row k="Pending / dead" v={`${h.outbox.pending} / ${h.outbox.dead}`} /><Row k="Worker" v={h.outbox.worker} /><Row k="Staff identities" v={h.admin.staff} /><Row k="Session cookie" v={h.admin.sessionCookie} /></Card>
      </div>
      {!!h.outbox.lastErrors.length && <Card title="Recent integration errors"><ul className="space-y-1 text-sm">{h.outbox.lastErrors.map((e: any) => <li key={e.id}>{e.kind} · {e.status} · {e.attempts} attempt(s) · <span className="text-sage-ink">{e.error}</span></li>)}</ul></Card>}
    </div>
  );
}

export function AuditPanel({ api }: { api: Api }) {
  const { d, err } = useLoad(api, "/audit"); const [q, setQ] = useState("");
  if (!d) return <><Err e={err} /><p className="text-sage-ink">Loading…</p></>;
  const rows = d.entries.filter((e: any) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()));
  return (
    <Card title="Audit log">
      <p className="mb-3 text-sm">Chain integrity: {d.chain.ok ? <Badge tone="ok">verified</Badge> : <Badge tone="bad">broken at {d.chain.brokenAt}</Badge>} <span className="text-sage-ink">· append-only, hash-chained; the Phase 2/3 admin keeps its own access log.</span></p>
      <input aria-label="Filter audit" className={small} placeholder="Filter (actor, action, id…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3"><Table head={["When", "Actor", "Role", "Action", "Target", "Detail"]} empty={!rows.length}>
        {rows.map((e: any) => <tr key={e.id}><Td>{when(e.at)}</Td><Td>{e.actor}</Td><Td>{e.role}</Td><Td className="font-semibold">{e.action}</Td><Td className="font-mono text-xs">{e.target ? `${e.target.type}:${String(e.target.id).slice(0, 8)}` : "—"}</Td><Td className="max-w-xs break-words text-xs text-sage-ink">{e.detail ? JSON.stringify(e.detail) : ""}</Td></tr>)}
      </Table></div>
    </Card>
  );
}
