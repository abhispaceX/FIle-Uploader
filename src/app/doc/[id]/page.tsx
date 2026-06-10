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
  const access = await getAccessLevel(sb, id, me.id);
  if (!canRead(access)) notFound();

  const { data: doc, error } = await sb
    .from("documents")
    .select("id,title,content_json,owner_id,updated_at")
    .eq("id", id)
    .single();
  if (error || !doc) notFound();

  const { data: ownerProfile } = await sb
    .from("profiles")
    .select("id,email,display_name")
    .eq("id", doc.owner_id)
    .single();

  const { data: allProfiles } = await sb
    .from("profiles")
    .select("id,email,display_name")
    .order("display_name");

  const { data: existingShares } = access === "owner"
    ? await sb
        .from("shares")
        .select("user_id,role")
        .eq("document_id", id)
    : { data: [] };

  return (
    <EditorView
      me={me}
      doc={{
        id: doc.id,
        title: doc.title,
        content_json: doc.content_json,
        updated_at: doc.updated_at,
      }}
      access={access}
      owner={(ownerProfile as Profile | null) ?? { id: doc.owner_id, email: "", display_name: "Unknown" }}
      allUsers={(allProfiles as Profile[]) ?? []}
      initialShares={(existingShares ?? []) as { user_id: string; role: "viewer" | "editor" }[]}
    />
  );
}
