"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { DocumentSummary, Profile } from "@/lib/types";
import { importFile } from "@/lib/fileImport";

type Tab = "owned" | "shared";
type DeleteTarget = { id: string; title: string };

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

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  function startRename(d: DocumentSummary) {
    setRenamingId(d.id);
    setRenameDraft(d.title);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  async function commitRename(id: string) {
    const title = renameDraft.trim();
    if (!title) {
      toast.error("Title cannot be empty");
      return;
    }
    if (title.length > 200) {
      toast.error("Title too long (max 200)");
      return;
    }
    // No change → just close
    const original = owned.find((o) => o.id === id)?.title;
    if (title === original) {
      cancelRename();
      return;
    }
    setRenameBusy(true);
    const res = await fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setRenameBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Rename failed");
      return;
    }
    toast.success("Renamed");
    cancelRename();
    startTransition(() => router.refresh());
  }

  function askDelete(d: DocumentSummary) {
    setDeleteTarget({ id: d.id, title: d.title });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/docs/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Delete failed");
      return;
    }
    toast.success("Deleted");
    setDeleteTarget(null);
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
            {list.map((d) => {
              const isRenaming = renamingId === d.id;
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface gap-3"
                >
                  {isRenaming ? (
                    <RenameInput
                      initial={renameDraft}
                      busy={renameBusy}
                      onChange={setRenameDraft}
                      onCommit={() => commitRename(d.id)}
                      onCancel={cancelRename}
                      subtitle={
                        tab === "owned"
                          ? `You · updated ${formatRelative(d.updated_at)}`
                          : `${d.owner_name} · ${d.access} · updated ${formatRelative(d.updated_at)}`
                      }
                    />
                  ) : (
                    <Link href={`/doc/${d.id}`} className="flex-1 min-w-0">
                      <div className="font-medium truncate">{d.title || "Untitled"}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {tab === "owned"
                          ? `You · updated ${formatRelative(d.updated_at)}`
                          : `${d.owner_name} · ${d.access} · updated ${formatRelative(d.updated_at)}`}
                      </div>
                    </Link>
                  )}
                  {tab === "owned" && (
                    <div className="flex items-center gap-1 text-xs">
                      {isRenaming ? (
                        <>
                          <button
                            onClick={() => commitRename(d.id)}
                            disabled={renameBusy}
                            className="px-2 py-1 rounded bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                          >
                            {renameBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelRename}
                            disabled={renameBusy}
                            className="px-2 py-1 rounded border border-border hover:bg-background"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startRename(d)}
                            className="px-2 py-1 rounded hover:bg-background border border-transparent hover:border-border"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => askDelete(d)}
                            disabled={pending}
                            className="px-2 py-1 rounded hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {deleteTarget && (
        <ConfirmDeleteDialog
          title={deleteTarget.title}
          busy={deleteBusy}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function RenameInput({
  initial,
  busy,
  onChange,
  onCommit,
  onCancel,
  subtitle,
}: {
  initial: string;
  busy: boolean;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  subtitle: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="flex-1 min-w-0">
      <input
        ref={ref}
        value={initial}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        maxLength={200}
        className="w-full font-medium bg-background border border-accent rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
        aria-label="Rename document"
      />
      <div className="text-xs text-muted mt-1 px-1">
        {subtitle} · <span className="text-foreground">Enter to save, Esc to cancel</span>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
      if (e.key === "Enter" && !busy) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel, onConfirm]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-background border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4">
          <h2 id="delete-dialog-title" className="text-lg font-semibold mb-2">
            Delete document?
          </h2>
          <p className="text-sm text-muted">
            <span className="text-foreground font-medium break-words">
              &ldquo;{title || "Untitled"}&rdquo;
            </span>{" "}
            will be permanently deleted along with all shares. This can&apos;t be undone.
          </p>
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className="rounded-md bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
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
