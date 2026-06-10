import { getCurrentUserId } from "./session";
import { supabaseAdmin } from "./supabase";
import { Profile } from "./types";

export async function requireCurrentUser(): Promise<Profile> {
  const userId = await getCurrentUserId();
  if (!userId) throw new HttpError(401, "not authenticated");
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id,email,display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(401, "session user not found");
  return data as Profile;
}

export async function getCurrentUserOrNull(): Promise<Profile | null> {
  try {
    return await requireCurrentUser();
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return null;
    throw e;
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
