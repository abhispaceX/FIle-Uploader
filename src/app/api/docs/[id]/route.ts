import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireCurrentUser, HttpError } from "@/lib/currentUser";
import {
  canDelete,
  canRead,
  canWrite,
  getAccessLevel,
} from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const me = await requireCurrentUser();
    const { id } = await params;
    const sb = supabaseAdmin();
    const level = await getAccessLevel(sb, id, me.id);
    if (!canRead(level)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const { data, error } = await sb
      .from("documents")
      .select("id,title,content_json,owner_id,updated_at,created_at")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data, access: level });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const me = await requireCurrentUser();
    const { id } = await params;
    const sb = supabaseAdmin();
    const level = await getAccessLevel(sb, id, me.id);
    if (!canRead(level)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (!canWrite(level)) {
      return NextResponse.json({ error: "read-only" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const update: { title?: string; content_json?: unknown } = {};
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (t.length === 0) return NextResponse.json({ error: "empty title" }, { status: 400 });
      if (t.length > 200) return NextResponse.json({ error: "title too long" }, { status: 400 });
      update.title = t;
    }
    if (body.content_json !== undefined) {
      if (typeof body.content_json !== "object" || body.content_json === null) {
        return NextResponse.json({ error: "invalid content_json" }, { status: 400 });
      }
      update.content_json = body.content_json;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }
    const { error } = await sb.from("documents").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const me = await requireCurrentUser();
    const { id } = await params;
    const sb = supabaseAdmin();
    const level = await getAccessLevel(sb, id, me.id);
    if (!canDelete(level)) {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }
    const { error } = await sb.from("documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
