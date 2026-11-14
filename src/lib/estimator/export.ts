import { lineTotal, totals, type Proposal } from "./proposal";

/**
 * Private DOCX / PDF export for owner-approved proposals. Dependency-free generators:
 *  - DOCX: a minimal WordprocessingML package in a STORE-only ZIP (CRC-32 computed here)
 *  - PDF: a plain PDF-1.4 document with the built-in Helvetica font
 * Files are written to private storage and downloaded by the owner through short-lived signed URLs.
 * Nothing here sends anything.
 */
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const regionLabel = (r: Proposal["region"]) => (r === "boston" ? "Greater Boston, MA" : "Southeast Florida (Palm Beach / Broward), FL");

export type DocBlock = { style: "title" | "h2" | "p" | "small" | "row" | "total"; text: string; right?: string };
export function proposalBlocks(p: Proposal): DocBlock[] {
  const t = totals(p);
  const approved = p.approval && p.approval.revision === p.revision ? `Approved by the owner on ${p.approval.at.slice(0, 10)}` : "NOT APPROVED — internal draft";
  const out: DocBlock[] = [
    { style: "title", text: "StoneCraft — Restoration Proposal" },
    { style: "small", text: `Reference ${p.reference} · Revision ${p.revision} · ${regionLabel(p.region)}` },
    { style: "small", text: approved },
    { style: "h2", text: "Prepared for" },
    { style: "p", text: p.customerName + (p.siteLabel ? ` — ${p.siteLabel}` : "") },
    { style: "h2", text: "Scope and price" },
    ...p.lines.map((l): DocBlock => { const lt = lineTotal(l); return { style: "row", text: `${l.description}${l.quantity !== null ? ` — ${l.quantity} ${l.unit}` : ""}${l.unitPrice !== null ? ` × ${usd(l.unitPrice)}` : ""}`, right: lt === null ? "not priced" : usd(lt) }; }),
    { style: "total", text: "Total", right: t.total === null ? `incomplete (${t.unpricedLines} unpriced)` : usd(t.total) },
  ];
  if (p.scopeNotes.trim()) out.push({ style: "h2", text: "Scope notes" }, ...p.scopeNotes.split(/\n+/).map((x): DocBlock => ({ style: "p", text: x })));
  if (p.exclusions.trim()) out.push({ style: "h2", text: "Not included" }, ...p.exclusions.split(/\n+/).map((x): DocBlock => ({ style: "p", text: x })));
  out.push(
    { style: "h2", text: "Terms" },
    { style: "p", text: `This proposal is valid for ${p.validDays} days from approval. Work is scheduled only after you accept it in writing. If hidden damage (for example loose tile, a leak or soft substrate) is found, we stop and agree any change with you before continuing.` },
    { style: "small", text: "StoneCraft · info@stonecraftpros.com" },
  );
  return out;
}

/* ───────────────────────────── ZIP (store) ───────────────────────────── */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const enc = new TextEncoder();
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const u16 = (v: DataView, o: number, n: number) => v.setUint16(o, n, true), u32 = (v: DataView, o: number, n: number) => v.setUint32(o, n >>> 0, true);
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data);
    const lh = new Uint8Array(30 + name.length); const lv = new DataView(lh.buffer);
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0); u16(lv, 8, 0); u16(lv, 10, 0); u16(lv, 12, 0x21); u32(lv, 14, crc); u32(lv, 18, f.data.length); u32(lv, 22, f.data.length); u16(lv, 26, name.length); u16(lv, 28, 0); lh.set(name, 30);
    const ch = new Uint8Array(46 + name.length); const cv = new DataView(ch.buffer);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0); u16(cv, 10, 0); u16(cv, 12, 0); u16(cv, 14, 0x21); u32(cv, 16, crc); u32(cv, 20, f.data.length); u32(cv, 24, f.data.length); u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset); ch.set(name, 46);
    chunks.push(lh, f.data); central.push(ch); offset += lh.length + f.data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 8, files.length); u16(ev, 10, files.length); u32(ev, 12, cdSize); u32(ev, 16, offset);
  const all = [...chunks, ...central, end]; const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0)); let o = 0; for (const c of all) { out.set(c, o); o += c.length; }
  return out;
}

/* ───────────────────────────── DOCX ───────────────────────────── */
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function proposalDocx(p: Proposal): Uint8Array {
  const run = (t: string, o: { b?: boolean; sz?: number; color?: string } = {}) => `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.sz ?? 21}"/></w:rPr><w:t xml:space="preserve">${xml(t)}</w:t></w:r>`;
  const para = (inner: string, spacingAfter = 120, tab = false) => `<w:p><w:pPr>${tab ? '<w:tabs><w:tab w:val="right" w:pos="9000"/></w:tabs>' : ""}<w:spacing w:after="${spacingAfter}"/></w:pPr>${inner}</w:p>`;
  const body = proposalBlocks(p).map((b) => {
    if (b.style === "title") return para(run(b.text, { b: true, sz: 36, color: "25292B" }), 200);
    if (b.style === "h2") return para(run(b.text, { b: true, sz: 26, color: "7D6340" }), 80);
    if (b.style === "small") return para(run(b.text, { sz: 18, color: "666666" }), 60);
    if (b.style === "row" || b.style === "total") return para(run(b.text, { b: b.style === "total" }) + `<w:r><w:tab/></w:r>` + run(b.right ?? "", { b: b.style === "total" }), 60, true);
    return para(run(b.text));
  }).join("");
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(`StoneCraft proposal ${p.reference} r${p.revision}`)}</dc:title><dc:creator>StoneCraft</dc:creator></cp:coreProperties>`;
  return zipStore([{ name: "[Content_Types].xml", data: enc.encode(ct) }, { name: "_rels/.rels", data: enc.encode(rels) }, { name: "docProps/core.xml", data: enc.encode(core) }, { name: "word/document.xml", data: enc.encode(doc) }]);
}

/* ───────────────────────────── PDF ───────────────────────────── */
const ascii = (s: string) => s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/×/g, "x").replace(/·/g, "-").replace(/…/g, "...").replace(/[^\x20-\x7e]/g, "?");
const pdfStr = (s: string) => ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
function wrap(text: string, max: number) { const words = text.split(/\s+/); const lines: string[] = []; let cur = ""; for (const w of words) { if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } if (cur) lines.push(cur); return lines.length ? lines : [""]; }
export function proposalPdf(p: Proposal): Uint8Array {
  const W = 612, H = 792, M = 56; const pages: string[] = []; let ops: string[] = []; let y = H - M;
  const newPage = () => { pages.push(ops.join("\n")); ops = []; y = H - M; };
  const text = (s: string, x: number, size: number, bold = false) => ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y.toFixed(1)} Td (${pdfStr(s)}) Tj ET`);
  const need = (h: number) => { if (y - h < M) newPage(); };
  for (const b of proposalBlocks(p)) {
    const size = b.style === "title" ? 18 : b.style === "h2" ? 13 : b.style === "small" ? 9 : 10.5;
    const lh = size * 1.45;
    if (b.style === "h2") { y -= 8; }
    const lines = wrap(b.text, b.style === "row" || b.style === "total" ? 70 : Math.floor(470 / (size * 0.5)));
    for (let i = 0; i < lines.length; i++) {
      need(lh); text(lines[i]!, M, size, b.style === "title" || b.style === "h2" || b.style === "total");
      if (i === 0 && b.right) { const rw = ascii(b.right).length * size * 0.5; ops.push(`BT /${b.style === "total" ? "F2" : "F1"} ${size} Tf ${(W - M - rw).toFixed(1)} ${y.toFixed(1)} Td (${pdfStr(b.right)}) Tj ET`); }
      y -= lh;
    }
    if (b.style === "title") y -= 4;
  }
  pages.push(ops.join("\n"));
  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  const catalog = add(""); const pagesId = add(""); const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  pages.forEach((content, i) => {
    const footer = `BT /F1 8 Tf ${M} 30 Td (${pdfStr(`StoneCraft proposal ${p.reference} - revision ${p.revision} - page ${i + 1} of ${pages.length}`)}) Tj ET`;
    const stream = `${content}\n${footer}`;
    const cid = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cid} 0 R >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n"; const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info << /Title (${pdfStr(`StoneCraft proposal ${p.reference}`)}) /Producer (StoneCraft admin) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  return enc.encode(out);
}
