import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { setCurrentUserId } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  await setCurrentUserId(userId);
  return NextResponse.json({ ok: true });
}
