import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await isAdmin()) redirect("/admin/dashboard");
  const { e } = await searchParams;
  return (
    <div className="mx-auto max-w-sm rounded-lg bg-white p-8 shadow-card">
      <h1 className="font-serif text-2xl">StoneCraft Admin</h1>
      {!adminConfigured() && <p className="mt-3 rounded bg-linen-pale p-3 text-sm">Set ADMIN_TOKEN (24+ random characters) in the environment to enable admin tools.</p>}
      <form method="post" action="/api/admin/login" className="mt-5 space-y-3">
        <label className="label" htmlFor="token">Access token</label>
        <input id="token" name="token" type="password" className="field" autoComplete="current-password" />
        {e && <p className="text-sm text-red-700">Incorrect token.</p>}
        <button className="btn btn-hunter w-full">Sign in</button>
      </form>
    </div>
  );
}
