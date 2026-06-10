import { NextResponse } from "next/server";
import { clearCurrentUserId } from "@/lib/session";

export async function POST() {
  await clearCurrentUserId();
  return NextResponse.json({ ok: true });
}
