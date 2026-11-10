"use client";
import { useRef, useState } from "react";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}
const Pre = ({ v }: { v: unknown }) => <pre className="mt-4 max-h-[520px] overflow-auto rounded bg-hunter p-4 text-xs text-cream">{typeof v === "string" ? v : JSON.stringify(v, null, 2)}</pre>;

export function SchedulingTool() {
  const [zip, setZip] = useState("02139"); const [ctype, setCtype] = useState("homeowner"); const [value, setValue] = useState(""); const [urgent, setUrgent] = useState(false); const [hnw, setHnw] = useState(false);
  const [res, setRes] = useState<unknown>(null);
  const [book, setBook] = useState({ date: "", start: "", assignedTo: "bdr-1", type: "estimate" });
  const suggest = async () => setRes((await post("/api/admin/schedule", { action: "suggest", zip, customerType: ctype, estimatedValue: value ? Number(value) : undefined, isUrgent: urgent, isHnw: hnw })).data);
  const doBook = async () => {
    const s = res as { suggestion?: { zone?: { id: string } } };
    setRes((await post("/api/admin/schedule", { action: "book", zip, customerType: ctype, estimatedValue: value ? Number(value) : undefined, isUrgent: urgent, isHnw: hnw, booking: { ...book, zoneId: s?.suggestion?.zone?.id, durationMin: book.type === "job" ? 300 : 45 } })).data);
  };
  return (
    <div className="rounded-lg bg-white p-6 shadow-card">
      <div className="grid gap-3 sm:grid-cols-5">
        <input className="field" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
        <select className="field" value={ctype} onChange={(e) => setCtype(e.target.value)}>{["homeowner", "renter", "landlord", "commercial", "property_manager"].map((c) => <option key={c}>{c}</option>)}</select>
        <input className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Est. value $" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />Urgent</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hnw} onChange={(e) => setHnw(e.target.checked)} />HNW</label>
      </div>
      <button className="btn btn-hunter mt-4" onClick={suggest}>Suggest slots</button>
      <div className="mt-6 grid gap-3 border-t border-cream-dark pt-4 sm:grid-cols-5">
        <input className="field" type="date" value={book.date} onChange={(e) => setBook({ ...book, date: e.target.value })} />
        <input className="field" value={book.start} onChange={(e) => setBook({ ...book, start: e.target.value })} placeholder="HH:MM" />
        <input className="field" value={book.assignedTo} onChange={(e) => setBook({ ...book, assignedTo: e.target.value })} placeholder="Assignee" />
        <select className="field" value={book.type} onChange={(e) => setBook({ ...book, type: e.target.value })}><option value="estimate">estimate</option><option value="job">job</option></select>
        <button className="btn btn-outline" onClick={doBook}>Check & book</button>
      </div>
      {res !== null && <Pre v={res} />}
    </div>
  );
}

const SERVICES = ["shower_restoration", "grout_cleaning", "grout_color_seal", "clear_seal", "regrout", "caulk", "marble_clean", "marble_hone_polish", "countertop_seal", "bathroom_refresh"];

export function QuoteTool() {
  const [market, setMarket] = useState("boston"); const [zip, setZip] = useState("02116"); const [ctype, setCtype] = useState("homeowner");
  const [lines, setLines] = useState([{ service: "shower_restoration", quantity: 1 }, { service: "caulk", quantity: 20 }]);
  const [res, setRes] = useState<unknown>(null);
  return (
    <div className="rounded-lg bg-white p-6 shadow-card">
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="field" value={market} onChange={(e) => setMarket(e.target.value)}><option value="boston">boston</option><option value="south-florida">south-florida</option></select>
        <input className="field" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
        <select className="field" value={ctype} onChange={(e) => setCtype(e.target.value)}>{["homeowner", "renter", "landlord", "commercial"].map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="mt-3 grid grid-cols-[1fr_120px_40px] gap-2">
          <select className="field" value={l.service} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)))}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
          <input className="field" inputMode="decimal" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} />
          <button className="text-red-700" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove line">✕</button>
        </div>
      ))}
      <div className="mt-4 flex gap-2"><button className="btn btn-outline" onClick={() => setLines([...lines, { service: "grout_cleaning", quantity: 100 }])}>Add line</button><button className="btn btn-hunter" onClick={async () => setRes((await post("/api/admin/quote", { market, zip, customerType: ctype, lines })).data)}>Build quote</button></div>
      {res !== null && <Pre v={res} />}
    </div>
  );
}

export function WorkOrderTool() {
  const [services, setServices] = useState<string[]>(["shower_restoration"]);
  const [notes, setNotes] = useState("Heavy soap scum on lower walls, mildew in caulk at tub. Marble threshold.");
  const [area, setArea] = useState("85"); const [color, setColor] = useState(""); const [grout, setGrout] = useState("unknown"); const [access, setAccess] = useState(""); const [quals, setQuals] = useState("");
  const [res, setRes] = useState<{ text?: string } | null>(null);
  return (
    <div className="rounded-lg bg-white p-6 shadow-card">
      <div className="flex flex-wrap gap-2">{SERVICES.map((s) => <label key={s} className="flex items-center gap-1 rounded border border-cream-dark px-2 py-1 text-sm"><input type="checkbox" checked={services.includes(s)} onChange={() => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s])} />{s}</label>)}</div>
      <textarea className="field mt-3" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope notes / conditions" />
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <input className="field" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area sq ft" />
        <input className="field" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Grout colour" />
        <select className="field" value={grout} onChange={(e) => setGrout(e.target.value)}><option value="unknown">grout: unknown</option><option value="cementitious">cementitious</option><option value="epoxy">epoxy</option></select>
        <input className="field" value={access} onChange={(e) => setAccess(e.target.value)} placeholder="Site access notes" />
        <input className="field" value={quals} onChange={(e) => setQuals(e.target.value)} placeholder="Tech quals (comma)" />
      </div>
      <button className="btn btn-hunter mt-4" onClick={async () => setRes((await post("/api/admin/workorder", { services, scopeNotes: notes, areaSqft: Number(area) || undefined, groutColor: color || undefined, groutType: grout, siteAccessNotes: access, technician: { name: "Tech", qualifications: quals.split(",").map((s) => s.trim()).filter(Boolean) } })).data)}>Generate brief</button>
      {res?.text && <Pre v={res.text} />}
    </div>
  );
}

export function RoomScanTool() {
  const video = useRef<HTMLVideoElement>(null);
  const [frames, setFrames] = useState<string[]>([]); const [on, setOn] = useState(false); const [res, setRes] = useState<unknown>(null); const [err, setErr] = useState("");
  const [refLabel, setRefLabel] = useState("door width"); const [refIn, setRefIn] = useState("32");
  const start = async () => { try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } }); if (video.current) { video.current.srcObject = s; await video.current.play(); setOn(true); } } catch (e) { setErr(`Camera unavailable: ${(e as Error).message}`); } };
  const grab = () => { const v = video.current!; const c = document.createElement("canvas"); const scale = Math.min(1, 1280 / v.videoWidth); c.width = v.videoWidth * scale; c.height = v.videoHeight * scale; c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height); setFrames((f) => [...f, c.toDataURL("image/jpeg", 0.7)].slice(-6)); };
  return (
    <div className="rounded-lg bg-white p-6 shadow-card">
      <p className="text-sm">Pan slowly and capture 4–6 frames covering floor, walls and shower. Include a reference object if you can. Results are <strong>provisional</strong> and must be confirmed with a tape measure.</p>
      <video ref={video} playsInline muted className="mt-4 aspect-video w-full rounded bg-hunter" />
      <div className="mt-3 flex flex-wrap gap-2">
        {!on ? <button className="btn btn-hunter" onClick={start}>Start camera</button> : <button className="btn btn-hunter" onClick={grab}>Capture frame ({frames.length}/6)</button>}
        <input className="field !w-40" value={refLabel} onChange={(e) => setRefLabel(e.target.value)} /><input className="field !w-24" value={refIn} onChange={(e) => setRefIn(e.target.value)} placeholder="inches" />
        <button className="btn btn-outline" disabled={frames.length < 2} onClick={async () => setRes((await post("/api/admin/room-scan", { frames, reference: refIn ? { label: refLabel, inches: Number(refIn) } : undefined })).data)}>Analyse</button>
      </div>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-3 flex gap-2">{frames.map((f, i) => <img key={i} src={f} alt={`frame ${i + 1}`} className="h-16 rounded" />)}</div>
      {res !== null && <Pre v={res} />}
    </div>
  );
}
