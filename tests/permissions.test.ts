import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getAccessLevel,
  canRead,
  canWrite,
  canShare,
  canDelete,
} from "../src/lib/permissions";

// Fixed UUIDs for the two synthetic users this test owns.
const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EMAIL_PATTERN = "%@vitest.local";

const skipReason = checkEnv();
const describeIfEnv = skipReason ? describe.skip : describe;

let sb: SupabaseClient;
let docId: string;

if (skipReason) {
  console.warn(`[permissions.test] Skipping: ${skipReason}`);
}

describeIfEnv("getAccessLevel (API-layer permission checks)", () => {
  beforeAll(async () => {
    sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    // Clean any leftover synthetic data from a previous failed run.
    await sb.from("profiles").delete().like("email", EMAIL_PATTERN);

    const { error: insErr } = await sb.from("profiles").insert([
      { id: USER_A, email: "test-a@vitest.local", display_name: "Test A" },
      { id: USER_B, email: "test-b@vitest.local", display_name: "Test B" },
    ]);
    if (insErr) throw insErr;

    const { data, error } = await sb
      .from("documents")
      .insert({ owner_id: USER_A, title: "Vitest doc" })
      .select("id")
      .single();
    if (error) throw error;
    docId = data.id;
  });

  afterAll(async () => {
    if (docId) await sb.from("documents").delete().eq("id", docId);
    if (sb) await sb.from("profiles").delete().like("email", EMAIL_PATTERN);
  });

  it("returns 'owner' for the document owner", async () => {
    const level = await getAccessLevel(sb, docId, USER_A);
    expect(level).toBe("owner");
    expect(canRead(level)).toBe(true);
    expect(canWrite(level)).toBe(true);
    expect(canShare(level)).toBe(true);
    expect(canDelete(level)).toBe(true);
  });

  it("returns 'none' for a user with no share", async () => {
    const level = await getAccessLevel(sb, docId, USER_B);
    expect(level).toBe("none");
    expect(canRead(level)).toBe(false);
    expect(canWrite(level)).toBe(false);
  });

  it("returns 'viewer' when shared as viewer (read-only)", async () => {
    await sb
      .from("shares")
      .upsert(
        { document_id: docId, user_id: USER_B, role: "viewer" },
        { onConflict: "document_id,user_id" },
      );
    const level = await getAccessLevel(sb, docId, USER_B);
    expect(level).toBe("viewer");
    expect(canRead(level)).toBe(true);
    expect(canWrite(level)).toBe(false);
    expect(canShare(level)).toBe(false);
    expect(canDelete(level)).toBe(false);
  });

  it("returns 'editor' when share is upgraded (can write but not share/delete)", async () => {
    await sb
      .from("shares")
      .upsert(
        { document_id: docId, user_id: USER_B, role: "editor" },
        { onConflict: "document_id,user_id" },
      );
    const level = await getAccessLevel(sb, docId, USER_B);
    expect(level).toBe("editor");
    expect(canRead(level)).toBe(true);
    expect(canWrite(level)).toBe(true);
    expect(canShare(level)).toBe(false);
    expect(canDelete(level)).toBe(false);
  });

  it("returns 'none' on a non-existent document id", async () => {
    const fakeId = "deadbeef-dead-beef-dead-beefdeadbeef";
    const level = await getAccessLevel(sb, fakeId, USER_A);
    expect(level).toBe("none");
  });

  it("returns 'none' when userId is null", async () => {
    const level = await getAccessLevel(sb, docId, null);
    expect(level).toBe("none");
  });
});

function checkEnv(): string | null {
  if (!process.env.SUPABASE_URL) {
    return "SUPABASE_URL not set — copy .env.example to .env.local and fill it in";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "SUPABASE_SERVICE_ROLE_KEY not set";
  }
  return null;
}
