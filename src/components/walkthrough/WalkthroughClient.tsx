"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { walkthroughTemplates, parseStepKey, stepDef, type MeasureField, type Question, type WorkType } from "@/config/walkthrough-templates";
import { stepKeys } from "@/lib/walkthrough/outcome";
import { forget, pendingFor, persist, prepareImage, uploadOne, type QueueItem } from "./upload-queue";

/**
 * Customer guided walkthrough (mobile-first). Private, noindex, no prices anywhere.
 * Token: arrives in the URL fragment (#t=…), is moved to sessionStorage and removed from the address bar,
 * then sent only in the X-Walkthrough-Token header. Progress is saved on the server after every step, so the
 * customer can close the tab and resume from the same link.
 */
type PW = {
  reference: string; workType: WorkType; title: string; status: string; units: "imperial" | "metric"; firstName: string; expiresAt: string;
  repeats: Record<string, number>; steps: Record<string, { answers: Record<string, string | string[]>; completed: boolean }>;
  measurements: Record<string, { fieldId: string; kind: string; unknown: boolean; uncertain: boolean; entered: { system: string; a?: number; b?: number } }[]>;
  media: { id: string; stepKey: string; kind: "photo" | "video"; status: string }[]; corrections: { id: string; stepKeys: string[]; note: string }[]; submittedAt: string | null;
};
type MState = Record<string, { a: string; b: string; unknown: boolean; uncertain: boolean }>;
type Local = { localId: string; stepKey: string; kind: "photo" | "video"; thumb?: string; state: string; error?: string };

const TOKEN_KEY = "sc_wt_token";
const inputCls = "field !py-3 text-base";

export function WalkthroughClient() {
  const [token, setToken] = useState<string | null>(null);
  const [wt, setWt] = useState<PW | null>(null);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<"loading" | "intro" | "step" | "review" | "done" | "error">("loading");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [meas, setMeas] = useState<MState>({});
  const [locals, setLocals] = useState<Local[]>([]);
  const uploading = useRef(0);

  const call = useCallback(async (action: string, init?: { body?: unknown; method?: string }, tk = token) => {
    const r = await fetch(`/api/walkthrough/${action}`, { method: init?.method || (init?.body !== undefined ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(tk ? { "X-Walkthrough-Token": tk } : {}) }, body: init?.body !== undefined ? JSON.stringify(init.body) : undefined, cache: "no-store", referrerPolicy: "no-referrer" });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.ok !== false, status: r.status, j };
  }, [token]);
  const post = useCallback((a: string, body: unknown) => call(a, { body }), [call]);

  /* ── boot: fragment token, self-start, or resume from this tab ── */
  useEffect(() => {
    (async () => {
      let tk: string | null = null;
      const h = new URLSearchParams(window.location.hash.slice(1)).get("t");
      if (h && /^[A-Za-z0-9_-]{20,100}$/.test(h)) { tk = h; try { sessionStorage.setItem(TOKEN_KEY, h); } catch {} window.history.replaceState(null, "", window.location.pathname); }
      const start = new URLSearchParams(window.location.search).get("start");
      if (!tk && start && ["shower", "floor", "stone", "commercial"].includes(start)) {
        let lead: { id?: string } | null = null; try { lead = JSON.parse(sessionStorage.getItem("sc_wt_lead") || "null"); } catch {}
        if (lead?.id) {
          const r = await fetch("/api/walkthrough/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, workType: start }), referrerPolicy: "no-referrer" });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j.token) { tk = j.token; try { sessionStorage.setItem(TOKEN_KEY, j.token); sessionStorage.removeItem("sc_wt_lead"); } catch {} window.history.replaceState(null, "", window.location.pathname); }
          else { setErr(j.error || "We couldn't start a walkthrough."); setScreen("error"); return; }
        }
      }
      if (!tk) { try { tk = sessionStorage.getItem(TOKEN_KEY); } catch {} }
      if (!tk) { setErr("Open the walkthrough link we sent you to continue."); setScreen("error"); return; }
      setToken(tk);
      const r = await call("session", undefined, tk);
      if (!r.ok) { setErr(r.j.error || "This link is no longer valid."); setScreen("error"); return; }
      setWt(r.j.walkthrough);
      setScreen(r.j.walkthrough.status === "submitted" || r.j.walkthrough.status === "closed" ? "done" : "intro");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = wt ? walkthroughTemplates[wt.workType] : null;
  const correcting = wt?.status === "needs_correction";
  const corrKeys = useMemo(() => new Set(wt?.corrections.flatMap((c) => c.stepKeys) ?? []), [wt]);
  const keys = useMemo(() => (t && wt ? stepKeys(t, wt.repeats).filter((k) => !correcting || corrKeys.has(k)) : []), [t, wt, correcting, corrKeys]);
  const key = keys[idx];
  const def = t && key ? stepDef(t, key) : undefined;
  const units = wt?.units ?? "imperial";

  /* load the step's saved answers + measurements into the form */
  useEffect(() => {
    if (!wt || !key || !def) return;
    setAnswers(wt.steps[key]?.answers ?? {});
    const saved = wt.measurements[key] ?? [];
    const m: MState = {};
    for (const f of def.measurements) {
      const s = saved.find((x) => x.fieldId === f.id);
      const same = s && s.entered.system === units;
      m[f.id] = { a: same && s!.entered.a !== undefined ? String(s!.entered.a) : "", b: same && s!.entered.b !== undefined && s!.entered.b !== 0 ? String(s!.entered.b) : "", unknown: Boolean(s?.unknown), uncertain: Boolean(s?.uncertain) };
    }
    setMeas(m); setMsg("");
  }, [key, wt?.reference, units]); // eslint-disable-line react-hooks/exhaustive-deps

  /* resume pending uploads from IndexedDB */
  const runQueue = useCallback(async (item: QueueItem) => {
    uploading.current++;
    const set = (patch: Partial<Local>) => setLocals((ls) => ls.map((l) => (l.localId === item.localId ? { ...l, ...patch } : l)));
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await uploadOne(item, post, (p) => set({ state: p }));
      if (r.ok) { await forget(item.localId); set({ state: "done" }); break; }
      if (r.fatal || attempt === 3) { set({ state: r.fatal ? "rejected" : "failed", error: r.error }); if (r.fatal) await forget(item.localId); break; }
      set({ state: "retrying", error: r.error });
      await new Promise((res) => setTimeout(res, 1500 * 2 ** attempt));
    }
    uploading.current--;
    const s = await call("session"); if (s.ok) setWt(s.j.walkthrough);
  }, [post, call]);
  useEffect(() => {
    if (!wt || !token) return;
    (async () => {
      const pend = await pendingFor(wt.reference);
      if (!pend.length) return;
      setLocals((ls) => [...ls, ...pend.filter((p) => !ls.some((l) => l.localId === p.localId)).map((p) => ({ localId: p.localId, stepKey: p.stepKey, kind: p.kind, state: "queued" }))]);
      for (const p of pend) runQueue(p);
    })();
  }, [wt?.reference, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (files: FileList | null, kind: "photo" | "video") => {
    if (!files || !wt || !key) return;
    for (const f of Array.from(files).slice(0, 8)) {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const prepared = kind === "photo" ? await prepareImage(f) : { blob: f as Blob, type: f.type || "video/mp4" };
      const thumb = kind === "photo" ? URL.createObjectURL(prepared.blob) : undefined;
      setLocals((ls) => [...ls, { localId, stepKey: key, kind, thumb, state: "queued" }]);
      const item: QueueItem = { localId, ref: wt.reference, stepKey: key, kind, type: prepared.type, blob: prepared.blob, attempts: 0 };
      await persist(item);
      runQueue(item);
    }
  };

  const buildMeasurements = () => def!.measurements.flatMap<Record<string, unknown>>((f) => {
    const m = meas[f.id]; if (!m) return [];
    if (m.unknown) return [{ fieldId: f.id, kind: f.kind, unknown: true }];
    if (m.a === "" && m.b === "") return [];
    return [{ fieldId: f.id, kind: f.kind, a: m.a === "" ? 0 : Number(m.a), b: m.b === "" ? 0 : Number(m.b), uncertain: m.uncertain }];
  });
  const save = async (complete: boolean, extra: Record<string, unknown> = {}) => {
    if (!def || !key) return false;
    setBusy(true); setMsg("");
    const r = await post("step", { stepKey: key, answers, measurements: buildMeasurements(), complete, units, ...extra });
    setBusy(false);
    if (!r.ok) { setMsg(r.j.error || "Couldn't save. Check your connection and try again."); return false; }
    setWt(r.j.walkthrough); return true;
  };
  const next = async () => {
    const missing = def!.questions.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && !(answers[q.id] as string[]).length)));
    if (missing.length) { setMsg(`Please answer: ${missing.map((q) => q.label).join(" · ")}`); return; }
    if (await save(true)) { if (idx < keys.length - 1) { setIdx(idx + 1); window.scrollTo({ top: 0 }); } else setScreen("review"); }
  };
  const addRepeat = async () => {
    const { stepId } = parseStepKey(key!);
    const n = (wt!.repeats[stepId] ?? def!.repeat!.min) + 1;
    if (await save(true, { repeats: { [stepId]: n } })) { setIdx(idx + 1); window.scrollTo({ top: 0 }); }
  };
  const switchUnits = async (u: "imperial" | "metric") => { if (u === units || !key) return; const r = await post("step", { stepKey: key, answers, measurements: [], complete: Boolean(wt?.steps[key]?.completed), units: u }); if (r.ok) setWt(r.j.walkthrough); };
  const submit = async () => {
    if (uploading.current > 0) { setMsg("Please wait for uploads to finish."); return; }
    setBusy(true); const r = await post("submit", {}); setBusy(false);
    if (r.ok) { setScreen("done"); const s = await call("session"); if (s.ok) setWt(s.j.walkthrough); try { sessionStorage.removeItem(TOKEN_KEY); } catch {} }
    else setMsg(r.j.error || "Couldn't send. Please try again.");
  };

  if (screen === "loading") return <p className="py-20 text-center text-sage-ink" aria-live="polite">Loading your walkthrough…</p>;
  if (screen === "error") return (
    <div className="py-16 text-center" data-testid="wt-error">
      <h1 className="font-serif text-3xl">We couldn&apos;t open this walkthrough</h1>
      <p className="mt-3">{err}</p>
      <p className="mt-3 text-sm">You can also email photos to <a className="underline" href="mailto:info@stonecraftpros.com">info@stonecraftpros.com</a>.</p>
    </div>
  );
  if (!wt || !t) return null;
  if (screen === "done") return (
    <div className="py-12 text-center" data-testid="wt-done">
      <p className="eyebrow">Reference {wt.reference}</p>
      <h1 className="mt-2 font-serif text-3xl">Thanks, {wt.firstName} — we&apos;ve got it</h1>
      <p className="mt-3">A StoneCraft specialist will review your photos and measurements and get back to you by email. If we need anything else, we&apos;ll ask.</p>
    </div>
  );

  const stepMedia = (k: string) => wt.media.filter((m) => m.stepKey === k && m.status === "uploaded");
  const stepLocals = (k: string) => locals.filter((l) => l.stepKey === k && l.state !== "done");

  if (screen === "intro") return (
    <div data-testid="wt-intro">
      <p className="eyebrow">Private · StoneCraft</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl">{t.title}</h1>
      <p className="mt-3">Hi {wt.firstName}. {t.intro}</p>
      {correcting && <div className="mt-4 border-l-4 border-bronze bg-white p-4" data-testid="wt-corrections"><p className="font-semibold">We need a little more:</p><ul className="mt-1 list-disc pl-5">{wt.corrections.map((c) => <li key={c.id}>{c.note}</li>)}</ul></div>}
      <ul className="mt-5 space-y-2 text-sm">
        <li>• Your progress saves after every step — you can stop and reopen your link later.</li>
        <li>• Measurements are optional. Tick &ldquo;I don&apos;t know&rdquo; or &ldquo;Estimate&rdquo; any time.</li>
        <li>• Photos are private to StoneCraft. We remove location data from photos before storing them where possible.</li>
      </ul>
      <fieldset className="mt-5"><legend className="label">Measure in</legend><UnitToggle units={units} onChange={(u) => { setIdx(0); void post("step", { stepKey: keys[0], answers: wt.steps[keys[0]!]?.answers ?? {}, measurements: [], units: u, complete: Boolean(wt.steps[keys[0]!]?.completed) }).then((r) => r.ok && setWt(r.j.walkthrough)); }} /></fieldset>
      <button className="btn btn-hunter mt-6 w-full sm:w-auto" data-testid="wt-begin" onClick={() => { const first = keys.findIndex((k) => !wt.steps[k]?.completed); setIdx(first < 0 ? 0 : first); setScreen("step"); }}>{Object.keys(wt.steps).length ? "Continue where you left off" : "Start"}</button>
    </div>
  );

  if (screen === "review") return (
    <div data-testid="wt-review">
      <h1 className="font-serif text-3xl">Check and send</h1>
      <ul className="mt-4 divide-y divide-cream-dark border border-cream-dark bg-white">
        {keys.map((k, i) => { const d = stepDef(t, k)!; const n = parseStepKey(k).n; const photos = stepMedia(k).length; const short = photos < d.capture.photosMin;
          return <li key={k}><button className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => { setIdx(i); setScreen("step"); }}><span>{d.title}{n ? ` ${n}` : ""}</span><span className={`text-sm ${short ? "text-red-700" : "text-sage-ink"}`}>{photos} photo{photos === 1 ? "" : "s"}{short ? ` · needs ${d.capture.photosMin}` : ""}{wt.steps[k]?.completed ? " ✓" : ""}</span></button></li>; })}
      </ul>
      {msg && <p className="mt-3 text-sm text-red-700" role="alert">{msg}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button className="btn btn-outline" onClick={() => { setIdx(keys.length - 1); setScreen("step"); }}>Back</button><button className="btn btn-hunter" disabled={busy} data-testid="wt-submit" onClick={submit}>{busy ? "Sending…" : "Send to StoneCraft"}</button></div>
      <p className="mt-3 text-xs text-sage-ink">Sending doesn&apos;t book anything. We&apos;ll review and reply by email.</p>
    </div>
  );

  if (!def || !key) return null;
  const { n } = parseStepKey(key);
  const rep = def.repeat; const repCount = rep ? (wt.repeats[def.id] ?? rep.min) : 0;
  const isLastInstance = rep ? n === repCount : false;
  return (
    <div data-testid="wt-step" data-step={key}>
      <div className="flex items-center justify-between text-xs text-sage-ink"><span>Step {idx + 1} of {keys.length}</span><span>Ref {wt.reference}</span></div>
      <div className="mt-2 h-1.5 bg-cream-dark" aria-hidden><div className="h-1.5 bg-bronze" style={{ width: `${((idx + 1) / keys.length) * 100}%` }} /></div>
      <h1 className="mt-4 font-serif text-3xl">{def.title}{n ? ` ${n}` : ""}</h1>
      {correcting && wt.corrections.filter((c) => c.stepKeys.includes(key)).map((c) => <p key={c.id} className="mt-3 border-l-4 border-bronze bg-white p-3 text-sm">{c.note}</p>)}
      <p className="mt-2">{def.instructions}</p>
      {!!def.capture.tips.length && <ul className="mt-2 space-y-1 text-sm text-sage-ink">{def.capture.tips.map((x) => <li key={x}>Tip: {x}</li>)}</ul>}

      {def.capture.photosMax > 0 && <div className="mt-5">
        <p className="label">Photos {def.capture.photosMin > 0 ? `(at least ${def.capture.photosMin})` : "(optional)"}</p>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-hunter cursor-pointer"><input type="file" accept="image/*" capture="environment" className="sr-only" data-testid="wt-photo-camera" onChange={(e) => { addFiles(e.target.files, "photo"); e.target.value = ""; }} />Take photo</label>
          <label className="btn btn-outline cursor-pointer"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" data-testid="wt-photo-input" onChange={(e) => { addFiles(e.target.files, "photo"); e.target.value = ""; }} />From library</label>
          {def.capture.video !== "none" && <label className="btn btn-outline cursor-pointer"><input type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" className="sr-only" data-testid="wt-video-input" onChange={(e) => { addFiles(e.target.files, "video"); e.target.value = ""; }} />{def.capture.video === "recommended" ? "Video (recommended)" : "Video (optional)"}</label>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {stepMedia(key).map((m) => { const l = locals.find((x) => x.state === "done" && x.stepKey === key && x.kind === m.kind && x.thumb); return (
            <div key={m.id} className="relative h-20 w-20 border border-cream-dark bg-white text-xs" data-testid="wt-media-uploaded">
              {m.kind === "photo" && l?.thumb ? <img src={l.thumb} alt="Uploaded photo" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center">{m.kind === "video" ? "Video ✓" : "Photo ✓"}</span>}
              <button aria-label="Remove" className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-basalt text-bone" onClick={async () => { const r = await post("media-delete", { mediaId: m.id }); if (r.ok) { const s = await call("session"); if (s.ok) setWt(s.j.walkthrough); } }}>×</button>
            </div>); })}
          {stepLocals(key).map((l) => <div key={l.localId} className="flex h-20 w-20 flex-col items-center justify-center border border-dashed border-bronze bg-white p-1 text-center text-[11px]" data-testid="wt-media-pending">{l.state === "failed" || l.state === "rejected" ? <><span className="text-red-700">{l.state === "rejected" ? "Not usable" : "Failed"}</span>{l.state === "failed" && <button className="underline" onClick={async () => { const items = await pendingFor(wt.reference); const it = items.find((x) => x.localId === l.localId); if (it) runQueue(it); }}>Retry</button>}</> : <span>{l.state}…</span>}</div>)}
        </div>
      </div>}

      {def.questions.map((q) => <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />)}

      {!!def.measurements.length && <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="label !mb-0">Measurements (optional)</p><UnitToggle units={units} onChange={switchUnits} /></div>
        <div className="mt-3 space-y-4">{def.measurements.map((f) => <MeasureRow key={f.id} f={f} units={units} v={meas[f.id] ?? { a: "", b: "", unknown: false, uncertain: false }} onChange={(v) => setMeas({ ...meas, [f.id]: v })} />)}</div>
      </div>}

      {msg && <p className="mt-4 text-sm text-red-700" role="alert">{msg}</p>}
      <div className="sticky bottom-0 -mx-5 mt-8 flex flex-col gap-2 border-t border-cream-dark bg-cream px-5 py-3 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:px-0">
        {rep && isLastInstance && repCount < rep.max && !correcting && <button className="btn btn-outline" disabled={busy} data-testid="wt-add-repeat" onClick={addRepeat}>Add another {rep.label}</button>}
        <div className="flex gap-2">
          <button className="btn btn-outline flex-1" disabled={busy} onClick={async () => { await save(Boolean(wt.steps[key]?.completed)); if (idx > 0) setIdx(idx - 1); else setScreen("intro"); }}>Back</button>
          <button className="btn btn-hunter flex-[2]" disabled={busy} data-testid="wt-next" onClick={next}>{busy ? "Saving…" : idx < keys.length - 1 ? "Save & next" : "Review"}</button>
        </div>
      </div>
    </div>
  );
}

function UnitToggle({ units, onChange }: { units: "imperial" | "metric"; onChange: (u: "imperial" | "metric") => void }) {
  return <div className="inline-flex border border-basalt text-sm" role="group" aria-label="Units">{(["imperial", "metric"] as const).map((u) => <button key={u} type="button" aria-pressed={units === u} data-testid={`wt-units-${u}`} className={`min-h-11 px-4 ${units === u ? "bg-basalt text-bone" : "bg-white"}`} onClick={() => onChange(u)}>{u === "imperial" ? "ft / in" : "m / cm"}</button>)}</div>;
}

function QuestionField({ q, value, onChange }: { q: Question; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const id = `q-${q.id}`;
  const opts = q.options ?? (q.type === "yesno" ? [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] : q.type === "yesnounsure" ? [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "unsure", label: "Not sure" }] : []);
  if (q.type === "text") return <div className="mt-5"><label className="label" htmlFor={id}>{q.label}{q.required ? " *" : ""}</label><input id={id} className={inputCls} placeholder={q.hint} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} maxLength={500} /></div>;
  const multi = q.type === "multi"; const arr = Array.isArray(value) ? value : [];
  return (
    <fieldset className="mt-5"><legend className="label">{q.label}{q.required ? " *" : ""}</legend>
      <div className="flex flex-wrap gap-2">{opts.map((o) => { const on = multi ? arr.includes(o.id) : value === o.id; return <button key={o.id} type="button" aria-pressed={on} data-testid={`wt-q-${q.id}-${o.id}`} className={`min-h-11 border px-4 text-sm ${on ? "border-basalt bg-basalt text-bone" : "border-cream-dark bg-white"}`} onClick={() => onChange(multi ? (on ? arr.filter((x) => x !== o.id) : [...arr, o.id]) : o.id)}>{o.label}</button>; })}</div>
      {q.hint && <p className="mt-1 text-xs text-sage-ink">{q.hint}</p>}
    </fieldset>
  );
}

function MeasureRow({ f, units, v, onChange }: { f: MeasureField; units: "imperial" | "metric"; v: { a: string; b: string; unknown: boolean; uncertain: boolean }; onChange: (v: { a: string; b: string; unknown: boolean; uncertain: boolean }) => void }) {
  const [u1, u2] = f.kind === "length" ? (units === "imperial" ? ["ft", "in"] : ["m", "cm"]) : f.kind === "area" ? [units === "imperial" ? "sq ft" : "m²", ""] : ["", ""];
  const num = (s: string) => s.replace(/[^0-9.]/g, "").slice(0, 8);
  return (
    <div className="border border-cream-dark bg-white p-3" data-testid={`wt-m-${f.id}`}>
      <p className="text-sm font-semibold">{f.label}</p>{f.hint && <p className="text-xs text-sage-ink">{f.hint}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1"><span className="sr-only">{f.label} {u1 || "count"}</span><input inputMode="decimal" disabled={v.unknown} className={`${inputCls} w-24`} value={v.a} onChange={(e) => onChange({ ...v, a: num(e.target.value) })} data-testid={`wt-m-${f.id}-a`} /><span className="text-sm">{u1}</span></label>
        {f.kind === "length" && <label className="flex items-center gap-1"><span className="sr-only">{f.label} {u2}</span><input inputMode="decimal" disabled={v.unknown} className={`${inputCls} w-20`} value={v.b} onChange={(e) => onChange({ ...v, b: num(e.target.value) })} data-testid={`wt-m-${f.id}-b`} /><span className="text-sm">{u2}</span></label>}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={v.unknown} onChange={(e) => onChange({ ...v, unknown: e.target.checked })} data-testid={`wt-m-${f.id}-unknown`} />I don&apos;t know</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={v.uncertain} disabled={v.unknown} onChange={(e) => onChange({ ...v, uncertain: e.target.checked })} />Estimate / not sure</label>
      </div>
    </div>
  );
}
