// Post-build leakage scan: prerendered public HTML/RSC + client JS must contain no dollar amounts / price ranges
// and no prelaunch copy for Southeast Florida. Admin/ops routes are excluded (owner-only, rates ship blank anyway).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const root = ".next";
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = [...walk(path.join(root, "server/app")).filter((f) => /\.(html|body)$/.test(f) && !/\/(admin|api)\//.test(f)), ...walk(path.join(root, "static/chunks")).filter((f) => f.endsWith(".js") && !/\/app\/admin\//.test(f))];
const money = /(?:[>"'`\s(])\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?:[>"'`\s(])\$\s?\d{2,}(?:\.\d+)?\b/;
const prelaunch = /availability (?:is )?being confirmed|Availability being confirmed|Confirming scheduling availability/i;
const bad = [];
for (const f of files) {
  const t = readFileSync(f, "utf8").replace(/<script[^>]*>self\.__next_f[\s\S]*?<\/script>/g, (m) => m.replace(/\\"\$[0-9a-zA-Z@]+\\"/g, '""'));
  const visible = f.endsWith(".js") ? t.replace(/"\$[0-9a-zA-Z@]+"/g, '""') : t.replace(/<script[\s\S]*?<\/script>/g, "");
  const m = visible.match(money); if (m) bad.push(`${f}: money ${JSON.stringify(visible.slice(Math.max(0, m.index - 40), m.index + 30))}`);
  if (!f.endsWith(".js") && prelaunch.test(visible)) bad.push(`${f}: prelaunch copy`);
}
console.log(`scanned ${files.length} files`); if (bad.length) { console.log(bad.slice(0, 30).join("\n")); process.exit(1); } console.log("leak-scan OK");
