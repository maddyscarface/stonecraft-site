"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { services as SERVICES, surfaces as SURFACES, units as UNITS } from "@/lib/estimator/rates";
import { Badge, btn, Card, chip, H, small, Stat, Table, Td, when, type Api } from "./ui";

const outcomeLabel: Record<string, string> = { ready_for_remote_quote: "Ready for remote quote", targeted_follow_up: "Targeted follow-up", live_video_walkthrough: "Live video walkthrough", site_check: "Site check" };
const openParam = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("open"));
const Msg = ({ m }: { m: string }) => (m ? <p className={`text-sm font-semibold ${m.startsWith("⚠") ? "text-red-700" : "text-basalt"}`} role="status">{m}</p> : null);

/* ── Walkthroughs ────────────────────────────────────────────────────────── */
export function WalkthroughsPanel({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const [list, setList] = useState<any[]>([]); const [sel, setSel] = useState<any>(null); const [msg, setMsg] = useState(""); const [link, setLink] = useState("");
  const [form, setForm] = useState({ workType: "shower", firstName: "", email: "", zip: "", market: "", units: "imperial", leadId: "" });
  const load = useCallback(async () => { const r = await api("/walkthroughs"); if (r.ok) setList(r.j.walkthroughs); }, [api]);
  const open = useCallback(async (id: string) => { const r = await api(`/walkthroughs/${id}`); if (r.ok) setSel(r.j.walkthrough); else setMsg(`⚠ ${r.j.error}`); }, [api]);
  useEffect(() => { load(); const o = openParam(); if (o) open(o); }, [load, open]);
  const act = async (body: any) => { const r = await api(`/walkthroughs/${sel.id}`, { method: "POST", body: JSON.stringify(body) }); setMsg(r.ok ? (r.j.note || "Saved") : `⚠ ${r.j.error}`); if (r.ok && r.j.inviteLink) setLink(r.j.inviteLink); await open(sel.id); load(); return r; };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <div className="space-y-6">
        {can("walkthrough.invite") && <Card title="New guided walkthrough link">
          <form className="grid gap-2 sm:grid-cols-2" data-testid="wt-create" onSubmit={async (e) => { e.preventDefault(); setLink(""); const r = await api("/walkthroughs", { method: "POST", body: JSON.stringify({ workType: form.workType, firstName: form.firstName, email: form.email || undefined, zip: form.zip || undefined, market: form.market || undefined, units: form.units, leadId: form.leadId || undefined }) }); setMsg(r.ok ? r.j.note : `⚠ ${r.j.error}`); if (r.ok) { setLink(r.j.inviteLink); load(); } }}>
            <select aria-label="Work type" className={small} value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value })}>{["shower", "floor", "stone", "commercial"].map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <input aria-label="Customer first name" className={small} placeholder="Customer first name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input aria-label="Customer email" type="email" className={small} placeholder="Email (optional, for CRM tagging)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input aria-label="ZIP" inputMode="numeric" className={small} placeholder="ZIP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            <select aria-label="Market" className={small} value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}><option value="">Market from ZIP</option><option value="boston">Greater Boston</option><option value="south-florida">Southeast Florida</option></select>
            <select aria-label="Units" className={small} value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })}><option value="imperial">ft / in</option><option value="metric">metric</option></select>
            <input aria-label="Linked lead id" className={`${small} sm:col-span-2`} placeholder="Linked lead id (optional)" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} />
            <button className={`${btn} sm:col-span-2`}>Create link</button>
          </form>
          {link && <div className="mt-3 rounded-lg border border-bronze/50 bg-bronze-pale p-3 text-sm"><p className="font-semibold">Copy and send this yourself — shown once, never sent by the system:</p><input readOnly aria-label="Invite link" data-testid="wt-invite-link" className={`${small} mt-2 w-full font-mono text-xs`} value={link} onFocus={(e) => e.target.select()} /></div>}
        </Card>}
        <Card title="Walkthroughs">
          <Msg m={msg} />
          <Table head={["Ref", "Work", "Market", "Status", "Media", "Flags", "Outcome"]} empty={!list.length}>
            {list.map((w) => <tr key={w.id} className="cursor-pointer hover:bg-bone-2/60" onClick={() => open(w.id)}><Td className="font-semibold text-basalt">{w.reference}{w.sandbox && <span className="ml-1 text-xs text-bronze">TEST</span>}</Td><Td>{w.workType}</Td><Td>{w.market}{w.county ? ` · ${w.county}` : ""}</Td><Td>{w.status.replace(/_/g, " ")}</Td><Td>{w.media}</Td><Td>{w.escalations.length ? <Badge tone="bad">{w.escalations.length}</Badge> : "—"}</Td><Td>{w.outcome ? outcomeLabel[w.outcome] : w.suggestedOutcome ? <span className="text-sage-ink">suggested: {outcomeLabel[w.suggestedOutcome]}</span> : "—"}</Td></tr>)}
          </Table>
        </Card>
      </div>
      <Card title={sel ? `${sel.reference} · ${sel.workType} · ${sel.firstName}` : "Walkthrough"}>
        {!sel ? <p className="text-sm text-sage-ink">Select a walkthrough to review photos, measurements, escalations and set the outcome.</p> : (
          <div className="space-y-5 text-sm" data-testid="wt-detail">
            <div className="flex flex-wrap gap-2"><Badge>{sel.status.replace(/_/g, " ")}</Badge><Badge tone={sel.inviteRevoked ? "bad" : "muted"}>{sel.inviteRevoked ? "link revoked" : `link expires ${when(sel.inviteExpiresAt)}`}</Badge>{sel.escalations.map((e: string) => <Badge key={e} tone="bad">escalate: {e.replace(/_/g, " ")}</Badge>)}</div>
            <div className="rounded-lg bg-bone/70 p-3"><H>Suggested outcome (internal)</H><p className="mt-1 font-semibold">{outcomeLabel[sel.suggestion.outcome]}</p><ul className="mt-1 list-disc pl-5 text-xs text-sage-ink">{sel.suggestion.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul>
              {can("walkthrough.write") && <div className="mt-2 flex flex-wrap gap-2">{Object.entries(outcomeLabel).map(([k, l]) => <button key={k} className={`${chip} ${sel.outcome === k ? "!border-basalt !bg-basalt text-bone" : ""}`} onClick={() => act({ action: "set_outcome", outcome: k })}>{l}</button>)}</div>}
            </div>
            {!!sel.gaps.length && <div><H>Gaps</H><ul className="mt-1 list-disc pl-5">{sel.gaps.map((g: any) => <li key={g.stepKey + g.issue}>{g.stepKey}: {g.issue}</li>)}</ul></div>}
            <div><H>Steps, answers & measurements</H>
              <div className="mt-2 space-y-2">{Object.keys({ ...sel.steps, ...sel.measurements }).sort().map((k) => (
                <div key={k} className="rounded-lg border border-cream-dark p-2"><p className="font-semibold">{k}{sel.steps[k]?.completedAt ? " ✓" : ""}</p>
                  {sel.steps[k] && <p className="text-xs text-sage-ink">{Object.entries(sel.steps[k].answers).map(([q, a]) => `${q}: ${Array.isArray(a) ? a.join(", ") : a}`).join(" · ") || "no answers"}</p>}
                  {(sel.measurements[k] || []).map((m: any) => <p key={m.fieldId} className="text-xs">{m.fieldId}: <b>{m.display}</b>{m.uncertain && " (estimate)"}{m.unknown && " (unknown)"}</p>)}
                  <div className="mt-1 flex flex-wrap gap-2">{(sel.media.filter((x: any) => x.stepKey === k && x.url)).map((x: any) => x.kind === "photo" ? <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer"><img src={x.url} alt={`${k} photo`} className="h-20 w-20 object-cover" /></a> : <a key={x.id} className={chip} href={x.url} target="_blank" rel="noopener noreferrer">video</a>)}</div>
                </div>))}</div>
              <p className="mt-1 text-xs text-sage-ink">Measurement history: {sel.measurementHistory.length} version(s). Customer-entered values are kept; staff corrections add a new version with a reason. Measurements are never priced automatically.</p>
            </div>
            {can("walkthrough.write") && <form className="space-y-2" data-testid="wt-correction" onSubmit={async (e) => { e.preventDefault(); const f = e.currentTarget; const keys = (f.elements.namedItem("k") as HTMLInputElement).value.split(/[\s,]+/).filter(Boolean); const note = (f.elements.namedItem("n") as HTMLInputElement).value; await act({ action: "request_correction", stepKeys: keys, note }); }}>
              <H>Ask the customer for corrections</H>
              <input name="k" aria-label="Steps to correct" className={small} placeholder="Step keys, e.g. wall#2, grout" /><input name="n" aria-label="Note to customer" className={small} placeholder="What should they retake or re-measure?" /><button className={chip}>Request correction</button>
            </form>}
            {can("walkthrough.write") && <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); const f = e.currentTarget; const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value; await act({ action: "staff_measurement", stepKey: g("sk"), reason: g("re"), units: "imperial", measurements: [{ fieldId: g("fi"), kind: "length", a: Number(g("ft")) || 0, b: Number(g("in")) || 0 }] }); }}>
              <H>Staff measurement correction (ft / in)</H>
              <input name="sk" aria-label="Step key" className={small} placeholder="step key" /><input name="fi" aria-label="Field id" className={small} placeholder="field id" /><input name="ft" aria-label="Feet" inputMode="decimal" className={small} placeholder="ft" /><input name="in" aria-label="Inches" inputMode="decimal" className={small} placeholder="in" /><input name="re" aria-label="Reason" className={small} placeholder="reason (required)" /><button className={chip}>Save version</button>
            </form>}
            {can("walkthrough.invite") && <div className="flex flex-wrap gap-2"><button className={chip} onClick={() => act({ action: "reissue_invite" })}>Reissue link</button><button className={chip} onClick={() => act({ action: "revoke_invite" })}>Revoke link</button>{can("walkthrough.write") && <button className={chip} onClick={() => act({ action: "close" })}>Close</button>}</div>}
            {link && <input readOnly aria-label="New invite link" className={`${small} w-full font-mono text-xs`} value={link} />}
            {can("walkthrough.write") && <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const i = e.currentTarget.elements.namedItem("t") as HTMLInputElement; if (i.value.trim()) await act({ action: "note", text: i.value }); i.value = ""; }}><input name="t" aria-label="Internal note" className={small} placeholder="Internal note (never shown to the customer)" /><button className={chip}>Add</button></form>}
            <ul className="space-y-1">{sel.internalNotes.map((n: any) => <li key={n.at} className="rounded bg-bone/70 p-2 text-xs">{n.by} · {when(n.at)} — {n.text}</li>)}</ul>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Estimator (private; owner approves) ─────────────────────────────────── */
const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export function EstimatorPanel({ api, can, role }: { api: Api; can: (p: string) => boolean; role: string }) {
  const [list, setList] = useState<any[]>([]); const [sel, setSel] = useState<any>(null); const [msg, setMsg] = useState("");
  const [region, setRegion] = useState("boston"); const [book, setBook] = useState<any>(null);
  const [nf, setNf] = useState({ region: "boston", customerName: "", walkthroughId: "" });
  const load = useCallback(async () => { const r = await api("/estimator/proposals"); if (r.ok) setList(r.j.proposals); }, [api]);
  const loadBook = useCallback(async () => { if (!can("estimator.rates_read")) return; const r = await api(`/estimator/rates?region=${region}`); if (r.ok) setBook(r.j); }, [api, can, region]);
  const open = useCallback(async (id: string) => { const r = await api(`/estimator/proposals/${id}`); if (r.ok) setSel(r.j.proposal); }, [api]);
  useEffect(() => { load(); const o = openParam(); if (o) open(o); }, [load, open]);
  useEffect(() => { loadBook(); }, [loadBook]);
  const act = async (body: any) => { const r = await api(`/estimator/proposals/${sel.id}`, { method: "POST", body: JSON.stringify({ expectedRevision: sel.revision, ...body }) }); setMsg(r.ok ? (r.j.note || "Saved") : `⚠ ${r.j.error}`); if (r.ok) setSel(r.j.proposal); else if (r.status === 409) open(sel.id); load(); return r; };
  const owner = role === "owner";
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-dashed border-bronze/50 bg-bronze-pale px-4 py-3 text-sm">Private estimator. Prices are entered manually by StoneCraft — nothing is guessed, and rate books ship blank. Customers never see this screen, any calculation or any draft. Only the owner can approve, export DOCX/PDF and record that a proposal was sent <b>outside</b> this system. Nothing is ever sent automatically.</p>
      <Msg m={msg} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          {can("estimator.write") && <Card title="New proposal draft">
            <form className="grid gap-2 sm:grid-cols-2" data-testid="est-create" onSubmit={async (e) => { e.preventDefault(); const r = await api("/estimator/proposals", { method: "POST", body: JSON.stringify({ region: nf.region, customerName: nf.customerName, walkthroughId: nf.walkthroughId || undefined }) }); setMsg(r.ok ? "Draft created" : `⚠ ${r.j.error}`); if (r.ok) { load(); setSel(r.j.proposal); } }}>
              <select aria-label="Region" className={small} value={nf.region} onChange={(e) => setNf({ ...nf, region: e.target.value })}><option value="boston">Greater Boston</option><option value="south-florida">Southeast Florida</option></select>
              <input aria-label="Customer name" className={small} placeholder="Customer name" required value={nf.customerName} onChange={(e) => setNf({ ...nf, customerName: e.target.value })} />
              <input aria-label="Walkthrough id" className={`${small} sm:col-span-2`} placeholder="Walkthrough id (optional)" value={nf.walkthroughId} onChange={(e) => setNf({ ...nf, walkthroughId: e.target.value })} />
              <button className={`${btn} sm:col-span-2`}>Create draft</button>
            </form>
          </Card>}
          <Card title="Proposals">
            <Table head={["Ref", "Customer", "Region", "Status", "Rev", "Total"]} empty={!list.length}>
              {list.map((p) => <tr key={p.id} className="cursor-pointer hover:bg-bone-2/60" onClick={() => open(p.id)}><Td className="font-semibold text-basalt">{p.reference}</Td><Td>{p.customerName}</Td><Td>{p.region}</Td><Td>{p.status.replace(/_/g, " ")}</Td><Td>{p.revision}</Td><Td>{"total" in p ? (p.complete ? money(p.total) : <span className="text-sage-ink">incomplete</span>) : "—"}</Td></tr>)}
            </Table>
          </Card>
          {book && <Card title="Owner rate book">
            <div className="flex flex-wrap items-center gap-2"><select aria-label="Rate region" className={small} value={region} onChange={(e) => setRegion(e.target.value)}><option value="boston">Greater Boston</option><option value="south-florida">Southeast Florida</option></select><span className="text-xs text-sage-ink">v{book.book.version} · {book.book.entries.filter((e: any) => e.rate !== null).length} rate(s) set · {book.note}</span></div>
            {owner ? <form className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="rate-form" onSubmit={async (e) => { e.preventDefault(); const f = e.currentTarget; const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value; const rate = g("rate"); const r = await api("/estimator/rates", { method: "PUT", body: JSON.stringify({ region, expectedVersion: book.book.version, entries: [{ service: g("svc"), surface: g("srf"), rate: rate === "" ? null : Number(rate), minCharge: g("min") === "" ? null : Number(g("min")) }] }) }); setMsg(r.ok ? "Rate saved (owner)" : `⚠ ${r.j.error}`); loadBook(); }}>
              <select name="svc" aria-label="Service" className={small}>{book.services.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              <select name="srf" aria-label="Surface" className={small}>{book.surfaces.map((s: string) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
              <input name="min" aria-label="Minimum charge (USD)" inputMode="decimal" className={small} placeholder="Min charge USD (optional)" />
              <input name="rate" aria-label="Rate (USD)" inputMode="decimal" className={small} placeholder="Rate USD (blank = clear)" />
              <button className={`${chip} sm:col-span-2`}>Save rate</button>
            </form> : <p className="mt-2 text-xs text-sage-ink">Read-only. Only the owner edits rates.</p>}
            <ul className="mt-3 space-y-1 text-xs">{book.book.entries.filter((e: any) => e.rate !== null).map((e: any) => <li key={e.service + e.surface}>{e.service} · {e.surface}: {money(e.rate)} / {e.unit}{e.minCharge !== null ? ` (min ${money(e.minCharge)})` : ""}</li>)}{!book.book.entries.some((e: any) => e.rate !== null) && <li className="text-sage-ink">No rates set — every line must be priced manually.</li>}</ul>
          </Card>}
        </div>
        <Card title={sel ? `${sel.reference} · ${sel.customerName} · rev ${sel.revision}` : "Proposal"}>
          {!sel ? <p className="text-sm text-sage-ink">Select or create a proposal.</p> : <ProposalEditor sel={sel} act={act} api={api} can={can} owner={owner} setMsg={setMsg} />}
        </Card>
      </div>
    </div>
  );
}

function ProposalEditor({ sel, act, api, can, owner, setMsg }: { sel: any; act: (b: any) => Promise<any>; api: Api; can: (p: string) => boolean; owner: boolean; setMsg: (m: string) => void }) {
  const [lines, setLines] = useState<any[]>(sel.lines); const [scope, setScope] = useState(sel.scopeNotes); const [excl, setExcl] = useState(sel.exclusions);
  useEffect(() => { setLines(sel.lines); setScope(sel.scopeNotes); setExcl(sel.exclusions); }, [sel]);
  const editable = can("estimator.write") && !["sent_externally", "void"].includes(sel.status);
  const upd = (i: number, k: string, v: any) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="space-y-4 text-sm" data-testid="proposal-editor">
      <div className="flex flex-wrap gap-2"><Badge tone={sel.status === "approved" || sel.status === "exported" ? "ok" : sel.status === "sent_externally" ? "ok" : "muted"}>{sel.status.replace(/_/g, " ")}</Badge>{sel.approval && <Badge tone="ok">approved rev {sel.approval.revision} by {sel.approval.by}</Badge>}<Badge tone={sel.complete ? "ok" : "warn"}>{sel.complete ? `total ${money(sel.total)}` : "incomplete pricing — no total"}</Badge></div>
      <div className="-mx-4 overflow-x-auto sm:mx-0"><table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-bone-2 text-xs uppercase tracking-wider text-sage-ink"><tr>{["Description", "Service", "Surface", "Qty", "Unit", "Unit price (USD)", "Line"].map((h) => <th key={h} className="p-2">{h}</th>)}<th /></tr></thead>
        <tbody>{lines.map((l, i) => <tr key={l.id ?? i}>
          <td className="p-1"><input aria-label="Description" disabled={!editable} className={small} value={l.description} onChange={(e) => upd(i, "description", e.target.value)} /></td>
          <td className="p-1"><select aria-label="Service" disabled={!editable} className={small} value={l.service ?? ""} onChange={(e) => upd(i, "service", e.target.value || undefined)}><option value="">—</option>{SERVICES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></td>
          <td className="p-1"><select aria-label="Surface" disabled={!editable} className={small} value={l.surface ?? ""} onChange={(e) => upd(i, "surface", e.target.value || undefined)}><option value="">—</option>{SURFACES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}</select></td>
          <td className="p-1"><input aria-label="Quantity" disabled={!editable} inputMode="decimal" className={`${small} w-20`} value={l.quantity ?? ""} onChange={(e) => upd(i, "quantity", e.target.value === "" ? null : Number(e.target.value))} /></td>
          <td className="p-1"><select aria-label="Unit" disabled={!editable} className={small} value={l.unit} onChange={(e) => upd(i, "unit", e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></td>
          <td className="p-1"><input aria-label="Unit price" disabled={!editable} inputMode="decimal" className={`${small} w-28`} placeholder="blank" value={l.unitPrice ?? ""} onChange={(e) => upd(i, "unitPrice", e.target.value === "" ? null : Number(e.target.value))} /></td>
          <td className="p-2">{l.quantity != null && l.unitPrice != null ? money(Math.round(l.quantity * l.unitPrice * 100) / 100) : "—"}</td>
          <td className="p-1">{editable && <button className={chip} aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>}</td></tr>)}</tbody>
      </table></div>
      {editable && <div className="flex flex-wrap gap-2"><button className={chip} onClick={() => setLines([...lines, { description: "", quantity: null, unit: "sqft", unitPrice: null }])}>Add line</button><button className={chip} onClick={() => act({ action: "fill_from_rate_book" })}>Fill blank prices from owner rate book</button></div>}
      <label className="label" htmlFor="pscope">Scope notes</label><textarea id="pscope" disabled={!editable} className="field min-h-20 text-sm" value={scope} onChange={(e) => setScope(e.target.value)} />
      <label className="label" htmlFor="pexcl">Exclusions</label><textarea id="pexcl" disabled={!editable} className="field min-h-16 text-sm" value={excl} onChange={(e) => setExcl(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {editable && <button className={btn} data-testid="proposal-save" onClick={() => act({ action: "edit", lines, scopeNotes: scope, exclusions: excl })}>Save (new revision)</button>}
        {editable && sel.status === "draft" && <button className={chip} onClick={() => act({ action: "submit" })}>Submit for owner approval</button>}
        {owner && sel.status === "pending_approval" && <button className={chip} data-testid="proposal-approve" onClick={() => act({ action: "approve" })}>Approve rev {sel.revision}</button>}
        {owner && ["approved", "exported"].includes(sel.status) && <><button className={chip} onClick={() => act({ action: "export", format: "docx" })}>Export DOCX (private)</button><button className={chip} onClick={() => act({ action: "export", format: "pdf" })}>Export PDF (private)</button></>}
        {owner && sel.status === "exported" && <button className={chip} onClick={async () => { const ch = prompt("How did you send it? (email / in_person / other)", "email"); if (ch) await act({ action: "mark_sent_externally", channel: ch }); }}>Mark sent externally</button>}
      </div>
      {!!sel.exports.length && <div><H>Private exports</H><ul className="mt-1 space-y-1">{sel.exports.map((e: any) => <li key={e.at}>{e.format.toUpperCase()} · rev {e.revision} · {when(e.at)} {owner && <button className="underline" onClick={async () => { const r = await api(`/estimator/proposals/${sel.id}?export=${e.revision}.${e.format}`); if (r.ok) window.open(r.j.url, "_blank", "noopener"); else setMsg(`⚠ ${r.j.error}`); }}>download</button>}</li>)}</ul></div>}
      {sel.sentExternally && <p className="text-xs text-sage-ink">Recorded as sent externally via {sel.sentExternally.channel} by {sel.sentExternally.by} on {when(sel.sentExternally.at)}. The system did not send it.</p>}
      <div><H>History</H><ul className="mt-1 space-y-0.5 text-xs text-sage-ink">{sel.history.map((h: any, i: number) => <li key={i}>rev {h.revision} · {h.action} · {h.by} · {when(h.at)}</li>)}</ul></div>
    </div>
  );
}

/* ── Service areas ───────────────────────────────────────────────────────── */
export function AreasPanel({ api, can }: { api: Api; can: (p: string) => boolean }) {
  const [d, setD] = useState<any>(null); const [zip, setZip] = useState(""); const [msg, setMsg] = useState("");
  const load = useCallback(async (z = "") => { const r = await api(`/areas${z ? `?zip=${z}` : ""}`); if (r.ok) setD(r.j); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="text-sage-ink">Loading…</p>;
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-dashed border-bronze/50 bg-bronze-pale px-4 py-3 text-sm"><b>Owner decision:</b> {d.ownerDecision}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Counties" value={d.counties.length} /><Stat label="City entries" value={d.cities.length} /><Stat label="Owner-confirmed cities" value={d.cities.filter((c: any) => c.ownerConfirmed).length} /><Stat label="ZIP overrides" value={Object.keys(d.overrides).length} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Southeast Florida cities (from config)">
          <Table head={["City", "County", "Page", "Confirmed", "ZIPs", "Note"]}>
            {d.cities.map((c: any) => <tr key={c.slug}><Td className="font-semibold">{c.name}</Td><Td>{c.county}</Td><Td>{c.page ? <a className="underline" href={`/south-florida/${c.slug}`}>/{c.slug}</a> : "—"}</Td><Td>{c.ownerConfirmed ? <Badge tone="ok">confirmed</Badge> : <Badge tone="warn">pending owner</Badge>}</Td><Td className="max-w-[14rem] break-words text-xs">{c.zips.join(", ")}</Td><Td className="text-xs text-sage-ink">{c.adminNote || ""}</Td></tr>)}
          </Table>
        </Card>
        <Card title="ZIP routing check & overrides">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(zip); }}><input aria-label="ZIP to check" inputMode="numeric" className={small} placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} /><button className={chip}>Check</button></form>
          {d.lookup && <p className="mt-2" data-testid="zip-lookup">{d.lookup.zip} → market <b>{d.lookup.market ?? "out of area"}</b>{d.lookup.market === "south-florida" && <> · county <b>{d.lookup.county ?? "unconfirmed"}</b></>}{d.lookup.override && <> · override <Badge tone="warn">{d.lookup.override}</Badge></>}</p>}
          {can("areas.write") && <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); const c = (e.currentTarget.elements.namedItem("c") as HTMLSelectElement).value; const r = await api("/areas", { method: "POST", body: JSON.stringify({ zip, county: c }) }); setMsg(r.ok ? "Override saved (owner)" : `⚠ ${r.j.error}`); load(zip); }}>
            <select name="c" aria-label="Route ZIP to" className={small}><option value="palm-beach">Palm Beach</option><option value="broward">Broward</option><option value="none">Outside both counties</option><option value="clear">Clear override</option></select><button className={chip}>Save override for {zip || "ZIP"}</button>
          </form>}
          <Msg m={msg} />
          <ul className="mt-3 space-y-1 text-xs">{Object.entries(d.overrides).map(([z, c]: any) => <li key={z}>{z} → {c}</li>)}</ul>
          <p className="mt-3 text-xs text-sage-ink">Counties: {d.counties.map((c: any) => `${c.name} (ZIP3 ${c.zip3.join("/")})`).join(" · ")}</p>
        </Card>
      </div>
    </div>
  );
}

/* ── AR (contracts only) ─────────────────────────────────────────────────── */
export function ArPanel({ api }: { api: Api }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { (async () => { const r = await api("/ar"); if (r.ok) setD(r.j); })(); }, [api]);
  if (!d) return <p className="text-sage-ink">Loading…</p>;
  return (
    <Card title="Native AR / 3D capture adapters">
      <p className="mb-3 text-sm text-sage-ink">{d.note}</p>
      <Table head={["Provider", "Kind", "Platforms", "Would return", "Flag", "Status", "Fallback"]}>
        {d.providers.map((p: any) => <tr key={p.provider}><Td className="font-semibold">{p.label}</Td><Td>{p.kind.replace(/_/g, " ")}</Td><Td>{p.platforms.join(", ")}</Td><Td className="text-xs">{p.outputs.join(", ").replace(/_/g, " ")}</Td><Td className="font-mono text-xs">{p.flag}</Td><Td><Badge tone="muted">{p.status}</Badge></Td><Td>{p.fallback.replace(/_/g, " ")}</Td></tr>)}
      </Table>
    </Card>
  );
}
export { Fragment };
