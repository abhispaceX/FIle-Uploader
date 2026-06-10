import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserOrNull } from "@/lib/currentUser";
import { getAccessLevel, canRead } from "@/lib/permissions";
import { Profile } from "@/lib/types";
import EditorView from "./EditorView";

export const dynamic = "force-dynamic";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUserOrNull();
  if (!me) redirect("/login");

  const sb = supabaseAdmin();

  // Run all read-only queries in parallel — they don't depend on each other.
  // Total wait drops from ~5 sequential round-trips to ~1.
  const [access, docRes, allProfilesRes] = await Promise.all([
    getAccessLevel(sb, id, me.id),
    sb
      .from("documents")
      .select(
        "id,title,content_json,owner_id,updated_at,owner:profiles!documents_owner_id_fkey(id,email,display_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    sb.from("profiles").select("id,email,display_name").order("display_name"),
  ]);

  if (!canRead(access)) notFound();
  const docRow = docRes.data;
  if (!docRow) notFound();

  const ownerRel = (docRow as { owner: Profile | Profile[] | null }).owner;
  const ownerProfile: Profile | null = Array.isArray(ownerRel)
    ? ownerRel[0] ?? null
    : ownerRel;

  // Shares are only used to populate the Share dialog — owner-only.
  const sharesRes = access === "owner"
    ? await sb.from("shares").select("user_id,role").eq("document_id", id)
    : { data: [] as { user_id: string; role: "viewer" | "editor" }[] };

  return (
    <EditorView
      me={me}
      doc={{
        id: docRow.id,
        title: docRow.title,
        content_json: docRow.content_json,
        updated_at: docRow.updated_at,
      }}
      access={access}
      owner={
        ownerProfile ?? {
          id: docRow.owner_id,
          email: "",
          display_name: "Unknown",
        }
      }
      allUsers={(allProfilesRes.data as Profile[]) ?? []}
      initialShares={(sharesRes.data ?? []) as { user_id: string; role: "viewer" | "editor" }[]}
    />
  );
}
