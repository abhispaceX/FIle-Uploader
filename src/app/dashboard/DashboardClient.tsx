"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { DocumentSummary, Profile } from "@/lib/types";
import { importFile } from "@/lib/fileImport";

type Tab = "owned" | "shared";

export default function DashboardClient({
  me,
  owned,
  shared,
}: {
  me: Profile;
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("owned");
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = tab === "owned" ? owned : shared;

  async function createDoc() {
    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Failed to create");
      return;
    }
    router.push(`/doc/${body.id}`);
  }

  async function deleteDoc(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Delete failed");
      return;
    }
    toast.success("Deleted");
    startTransition(() => router.refresh());
  }

  async function renameDoc(id: string, current: string) {
    const next = prompt("Rename document", current);
    if (next === null) return;
    const title = next.trim();
    if (!title) return toast.error("Title cannot be empty");
    if (title.length > 200) return toast.error("Title too long (max 200)");
    const res = await fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Rename failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const t = toast.loading("Importing…");
    try {
      const { title, content_json } = await importFile(file);
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content_json }),
      });
      const body = await res.json().catch(() => ({}));
      toast.dismiss(t);
      if (!res.ok) {
        toast.error(body.error ?? "Import failed");
        return;
      }
      toast.success("Imported");
      router.push(`/doc/${body.id}`);
    } catch (err) {
      toast.dismiss(t);
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Collab Docs</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              Signed in as <strong className="text-foreground">{me.display_name}</strong>
            </span>
            <button
              onClick={logout}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              Switch user
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8 flex-1">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setTab("owned")}
              className={`px-4 py-2 text-sm font-medium ${
                tab === "owned" ? "bg-foreground text-background" : "hover:bg-surface"
              }`}
            >
              Owned ({owned.length})
            </button>
            <button
              onClick={() => setTab("shared")}
              className={`px-4 py-2 text-sm font-medium border-l border-border ${
                tab === "shared" ? "bg-foreground text-background" : "hover:bg-surface"
              }`}
            >
              Shared with me ({shared.length})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,text/plain,text/markdown"
              className="hidden"
              onChange={onFilePicked}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              Import .md / .txt
            </button>
            <button
              onClick={createDoc}
              className="rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90"
            >
              + New document
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
            {tab === "owned"
              ? "No documents yet. Create one to get started."
              : "Nothing has been shared with you yet."}
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-background">
            {list.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface gap-3"
              >
                <Link href={`/doc/${d.id}`} className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.title || "Untitled"}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {tab === "owned"
                      ? `You · updated ${formatRelative(d.updated_at)}`
                      : `${d.owner_name} · ${d.access} · updated ${formatRelative(d.updated_at)}`}
                  </div>
                </Link>
                {tab === "owned" && (
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => renameDoc(d.id, d.title)}
                      className="px-2 py-1 rounded hover:bg-background border border-transparent hover:border-border"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => deleteDoc(d.id)}
                      disabled={pending}
                      className="px-2 py-1 rounded hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
