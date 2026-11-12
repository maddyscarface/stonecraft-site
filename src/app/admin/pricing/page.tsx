import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminStatus } from "@/components/admin/StatusBadge";
import { QuoteTool } from "@/components/admin/Tools";
import { draftPriceSheets } from "@/config/pricing";
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return (<div className="space-y-6"><h1 className="font-serif text-3xl">Pricing & quotes</h1><AdminStatus page="pricing" />
    <p className="rounded bg-linen-pale p-3 text-sm">Price sheets are DRAFTS (approved: false). Quotes are internal estimates until the owner approves a sheet. Override via PUT /api/admin/config {"{"}key: "pricing:boston", value{"}"}.</p>
    <QuoteTool />
    {draftPriceSheets.map((s) => <div key={s.marketId} className="overflow-x-auto rounded-lg bg-white p-5 shadow-card"><h2 className="font-semibold">{s.marketId} · {s.version} · {s.approved ? "approved" : "DRAFT"}</h2><table className="mt-2 w-full min-w-[640px] text-sm"><thead className="text-left text-xs text-hunter/60"><tr><th>Service</th><th>Unit</th><th>Rate</th><th>Min</th><th>Internal cost/unit</th><th>Tech pay</th></tr></thead><tbody>{s.rows.map((r) => <tr key={r.service} className="border-t border-cream-dark"><td className="py-1.5">{r.label}</td><td>{r.unit}</td><td>${r.rate}</td><td>${r.minCharge}</td><td>${r.internalCostPerUnit}</td><td>{r.techPay.type === "percent" ? `${r.techPay.pct}%` : `$${r.techPay.amount}`}</td></tr>)}</tbody></table></div>)}
  </div>);
}
