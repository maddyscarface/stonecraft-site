import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminStatus } from "@/components/admin/StatusBadge";
import { WorkOrderTool } from "@/components/admin/Tools";
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return (<div className="space-y-6"><h1 className="font-serif text-3xl">Work order brief generator</h1><AdminStatus page="workorder" /><p className="rounded bg-linen-pale p-3 text-sm">Step library is unvalidated. Briefs show "Field-ready: NO" until a qualified technician validates procedures against manufacturer data sheets. Tech briefs never include price, margin or pay.</p><WorkOrderTool /></div>);
}
