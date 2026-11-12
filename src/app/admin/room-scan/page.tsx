import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminStatus } from "@/components/admin/StatusBadge";
import { RoomScanTool } from "@/components/admin/Tools";
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin");
  return (<div className="space-y-6"><h1 className="font-serif text-3xl">AI-assisted room scan (beta)</h1><AdminStatus page="room-scan" /><p className="rounded bg-linen-pale p-3 text-sm">Requires ROOM_SCAN_ENABLED=true and ANTHROPIC_API_KEY. Provisional estimates only — never shown to customers as measured dimensions. Test against tape-measured rooms before relying on it (docs/10).</p><RoomScanTool /></div>);
}
