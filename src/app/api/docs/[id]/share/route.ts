import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireCurrentUser, HttpError } from "@/lib/currentUser";
import { canShare, getAccessLevel } from "@/lib/permissions";
import { Role } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const ROLES: Role[] = ["viewer", "editor"];

export async function POST(req: Request, { params }: Ctx) {
  try {
    const me = await requireCurrentUser();
    const { id } = await params;
    const sb = supabaseAdmin();

    const level = await getAccessLevel(sb, id, me.id);
    if (!canShare(level)) {
      return NextResponse.json(
        { error: "only the owner can share" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    const role = body?.role;
    if (typeof userId !== "string" || userId.length === 0) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { error: "role must be viewer or editor" },
        { status: 400 },
      );
    }
    if (userId === me.id) {
      return NextResponse.json(
        { error: "cannot share with yourself" },
        { status: 400 },
      );
    }

    const { data: target, error: lookupErr } = await sb
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

    const { error } = await sb
      .from("shares")
      .upsert(
        { document_id: id, user_id: userId, role },
        { onConflict: "document_id,user_id" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const me = await requireCurrentUser();
    const { id } = await params;
    const sb = supabaseAdmin();

    const level = await getAccessLevel(sb, id, me.id);
    if (!canShare(level)) {
      return NextResponse.json(
        { error: "only the owner can change sharing" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { error } = await sb
      .from("shares")
      .delete()
      .eq("document_id", id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
