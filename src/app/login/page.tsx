import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Profile } from "@/lib/types";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/dashboard");

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id,email,display_name")
    .order("display_name");

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="font-semibold text-lg mb-2">Database not reachable</h1>
          <p className="text-sm">
            Could not load seeded users. Make sure you ran the SQL migration and
            seed script, and that <code>.env.local</code> has{" "}
            <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>
          <p className="mt-3 text-xs font-mono">{error.message}</p>
        </div>
      </main>
    );
  }

  const profiles = (data ?? []) as Profile[];

  return (
    <main className="flex flex-1 items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Collab Docs</h1>
        <p className="text-sm text-muted mb-6">
          Pick a seeded user to continue. Auth is mocked for the demo — see
          ARCHITECTURE.md.
        </p>
        {profiles.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No seeded users found. Run{" "}
            <code className="font-mono">supabase/seed.sql</code> in the Supabase
            SQL editor.
          </div>
        ) : (
          <LoginForm profiles={profiles} />
        )}
      </div>
    </main>
  );
}
