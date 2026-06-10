import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireCurrentUser, HttpError } from "@/lib/currentUser";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export async function POST(req: Request) {
  try {
    const me = await requireCurrentUser();
    const body = await req.json().catch(() => ({}));
    const rawTitle = typeof body.title === "string" ? body.title.trim() : "Untitled";
    if (rawTitle.length > 200) {
      return NextResponse.json({ error: "title too long" }, { status: 400 });
    }
    const title = rawTitle.length === 0 ? "Untitled" : rawTitle;

    let content_json: unknown = EMPTY_DOC;
    if (body.content_json !== undefined) {
      if (
        typeof body.content_json !== "object" ||
        body.content_json === null ||
        (body.content_json as { type?: unknown }).type !== "doc"
      ) {
        return NextResponse.json(
          { error: "content_json must be a Tiptap doc node" },
          { status: 400 },
        );
      }
      content_json = body.content_json;
    }

    const { data, error } = await supabaseAdmin()
      .from("documents")
      .insert({
        owner_id: me.id,
        title,
        content_json,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
