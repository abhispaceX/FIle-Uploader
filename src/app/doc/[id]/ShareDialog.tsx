"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Profile, Role } from "@/lib/types";

type Share = { user_id: string; role: Role };

export default function ShareDialog({
  docId,
  docTitle,
  me,
  owner,
  allUsers,
  initialShares,
  onClose,
}: {
  docId: string;
  docTitle: string;
  me: Profile;
  owner: Profile;
  allUsers: Profile[];
  initialShares: Share[];
  onClose: () => void;
}) {
  const [shares, setShares] = useState<Share[]>(initialShares);
  const [busy, setBusy] = useState(false);

  // Candidates: everyone except the owner.
  const candidates = allUsers.filter((u) => u.id !== owner.id);

  async function addShare(userId: string, role: Role) {
    setBusy(true);
    const res = await fetch(`/api/docs/${docId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Share failed");
      return;
    }
    setShares((s) => {
      const filtered = s.filter((x) => x.user_id !== userId);
      return [...filtered, { user_id: userId, role }];
    });
    toast.success("Shared");
  }

  async function removeShare(userId: string) {
    setBusy(true);
    const res = await fetch(
      `/api/docs/${docId}/share?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Remove failed");
      return;
    }
    setShares((s) => s.filter((x) => x.user_id !== userId));
    toast.success("Access removed");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-background border border-border shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-muted mb-4 truncate">{docTitle}</p>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted font-medium">
            People with access
          </div>
          <div className="rounded-md border border-border divide-y divide-border">
            <PersonRow name={`${owner.display_name} (you)`} sub={owner.email} role="Owner" />
            {shares.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted">
                Only you have access.
              </div>
            )}
            {shares.map((s) => {
              const u = allUsers.find((x) => x.id === s.user_id);
              if (!u) return null;
              return (
                <div key={s.user_id} className="flex items-center justify-between px-3 py-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.display_name}</div>
                    <div className="text-xs text-muted truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={s.role}
                      disabled={busy}
                      onChange={(e) => addShare(s.user_id, e.target.value as Role)}
                      className="text-xs border border-border rounded px-1 py-0.5"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => removeShare(s.user_id)}
                      disabled={busy}
                      className="text-xs text-red-700 hover:underline px-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-muted font-medium mb-2">
            Add a user
          </div>
          {candidates.length === 0 ? (
            <div className="text-sm text-muted">No other users to share with.</div>
          ) : (
            <div className="space-y-1">
              {candidates
                .filter((u) => !shares.find((s) => s.user_id === u.id))
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3 py-2 border border-border rounded-md gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.display_name}</div>
                      <div className="text-xs text-muted truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={busy}
                        onClick={() => addShare(u.id, "viewer")}
                        className="text-xs rounded border border-border px-2 py-1 hover:bg-surface"
                      >
                        + Viewer
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => addShare(u.id, "editor")}
                        className="text-xs rounded bg-foreground text-background px-2 py-1 hover:opacity-90"
                      >
                        + Editor
                      </button>
                    </div>
                  </div>
                ))}
              {candidates.filter((u) => !shares.find((s) => s.user_id === u.id)).length === 0 && (
                <div className="text-sm text-muted">Everyone already has access.</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonRow({
  name,
  sub,
  role,
}: {
  name: string;
  sub: string;
  role: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 gap-2">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted truncate">{sub}</div>
      </div>
      <div className="text-xs text-muted">{role}</div>
    </div>
  );
}
