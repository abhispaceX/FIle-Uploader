import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserOrNull } from "@/lib/currentUser";
import DashboardClient from "./DashboardClient";
import { DocumentSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await getCurrentUserOrNull();
  if (!me) redirect("/login");

  const sb = supabaseAdmin();

  const [ownedRes, sharedRes] = await Promise.all([
    sb
      .from("documents")
      .select("id,title,owner_id,updated_at,profiles!documents_owner_id_fkey(display_name)")
      .eq("owner_id", me.id)
      .order("updated_at", { ascending: false }),
    sb
      .from("shares")
      .select(
        "role,documents(id,title,owner_id,updated_at,profiles!documents_owner_id_fkey(display_name))",
      )
      .eq("user_id", me.id),
  ]);

  if (ownedRes.error || sharedRes.error) {
    return (
      <main className="p-6">
        <div className="max-w-md rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Failed to load documents: {ownedRes.error?.message ?? sharedRes.error?.message}
        </div>
      </main>
    );
  }

  type ProfileRel = { display_name: string } | { display_name: string }[] | null;
  type OwnedRow = {
    id: string;
    title: string;
    owner_id: string;
    updated_at: string;
    profiles: ProfileRel;
  };
  type SharedRow = {
    role: "viewer" | "editor";
    documents: OwnedRow | OwnedRow[] | null;
  };

  const pickName = (p: ProfileRel): string => {
    if (!p) return "";
    if (Array.isArray(p)) return p[0]?.display_name ?? "";
    return p.display_name ?? "";
  };
  const pickDoc = (d: SharedRow["documents"]): OwnedRow | null => {
    if (!d) return null;
    if (Array.isArray(d)) return d[0] ?? null;
    return d;
  };

  const owned: DocumentSummary[] = ((ownedRes.data as unknown as OwnedRow[]) ?? []).map(
    (d) => ({
      id: d.id,
      title: d.title,
      owner_id: d.owner_id,
      owner_name: pickName(d.profiles),
      updated_at: d.updated_at,
      access: "owner",
    }),
  );

  const shared: DocumentSummary[] = [];
  for (const s of (sharedRes.data as unknown as SharedRow[]) ?? []) {
    const d = pickDoc(s.documents);
    if (!d) continue;
    shared.push({
      id: d.id,
      title: d.title,
      owner_id: d.owner_id,
      owner_name: pickName(d.profiles),
      updated_at: d.updated_at,
      access: s.role,
    });
  }

  return <DashboardClient me={me} owned={owned} shared={shared} />;
}
