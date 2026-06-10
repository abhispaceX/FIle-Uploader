import { SupabaseClient } from "@supabase/supabase-js";
import { AccessLevel, Role } from "./types";

export async function getAccessLevel(
  supabase: SupabaseClient,
  documentId: string,
  userId: string | null,
): Promise<AccessLevel> {
  if (!userId) return "none";
  const { data: doc, error } = await supabase
    .from("documents")
    .select("owner_id")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) return "none";
  if (doc.owner_id === userId) return "owner";

  const { data: share, error: shareErr } = await supabase
    .from("shares")
    .select("role")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (shareErr) throw shareErr;
  if (!share) return "none";
  return share.role as Role;
}

export function canRead(level: AccessLevel): boolean {
  return level !== "none";
}

export function canWrite(level: AccessLevel): boolean {
  return level === "owner" || level === "editor";
}

export function canShare(level: AccessLevel): boolean {
  return level === "owner";
}

export function canDelete(level: AccessLevel): boolean {
  return level === "owner";
}
