import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminStatus } from "@/components/admin/StatusBadge";
import { SchedulingTool } from "@/components/admin/Tools";
import { markets, zoneZips } from "@/config/markets";
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return (<div className="space-y-6"><h1 className="font-serif text-3xl">Scheduling engine</h1><AdminStatus page="scheduling" /><SchedulingTool />
    {markets.map((m) => <div key={m.id} className="rounded-lg bg-white p-5 shadow-card"><h2 className="font-semibold">{m.name} zones</h2><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="text-left text-xs text-hunter/60"><tr><th>Zone</th><th>Primary</th><th>Flex</th><th>Slots</th><th>Flex hold</th><th>Priority $</th><th>ZIPs</th><th>Active</th></tr></thead><tbody>{m.zones.map((z) => <tr key={z.id} className="border-t border-cream-dark align-top"><td className="py-1.5 font-semibold" style={{ color: z.color }}>{z.name}</td><td>{z.primaryDay}</td><td>{z.flexDay}</td><td>{z.slotTimes.join(", ")}</td><td>{z.flexSlotCount} @ T-{z.flexReleaseHours}h</td><td>{z.priorityValueThreshold}</td><td className="max-w-xs text-xs">{[...zoneZips(z), ...(z.zipPrefixes ?? []).map((p) => `${p}xx`)].join(" ")}</td><td>{z.active ? "yes" : "no"}</td></tr>)}</tbody></table></div></div>)}
    <p className="text-xs text-hunter/60">Zone configuration lives in src/config/markets.ts (versioned). Runtime overrides and the SmartOps zone editor are specified in docs/09.</p></div>);
}
