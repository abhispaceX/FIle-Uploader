"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// Underline ships inside StarterKit v3 — no separate import needed.
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { AccessLevel, Profile } from "@/lib/types";
import { canShare, canWrite } from "@/lib/permissions";
import ShareDialog from "./ShareDialog";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export default function EditorView({
  me,
  doc,
  access,
  owner,
  allUsers,
  initialShares,
}: {
  me: Profile;
  doc: {
    id: string;
    title: string;
    content_json: unknown;
    updated_at: string;
  };
  access: AccessLevel;
  owner: Profile;
  allUsers: Profile[];
  initialShares: { user_id: string; role: "viewer" | "editor" }[];
}) {
  const router = useRouter();
  const writable = canWrite(access);
  const shareable = canShare(access);
  const [title, setTitle] = useState(doc.title);
  const [save, setSave] = useState<SaveState>({
    kind: "saved",
    at: new Date(doc.updated_at).getTime(),
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (body: { title?: string; content_json?: unknown }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setSave({ kind: "saving" });
      try {
        const res = await fetch(`/api/docs/${doc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setSave({ kind: "error", message: b.error ?? `HTTP ${res.status}` });
          return;
        }
        setSave({ kind: "saved", at: Date.now() });
      } catch (e: unknown) {
        if ((e as { name?: string }).name === "AbortError") return;
        setSave({
          kind: "error",
          message: e instanceof Error ? e.message : "save failed",
        });
      }
    },
    [doc.id],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ],
    content: doc.content_json as JSONContent,
    editable: writable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-doc max-w-none min-h-[60vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (!writable) return;
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => {
        persist({ content_json: editor.getJSON() });
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (contentTimer.current) clearTimeout(contentTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  function onTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitle(next);
    if (!writable) return;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      const t = next.trim();
      if (t.length === 0 || t.length > 200) return;
      persist({ title: t });
    }, 600);
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex flex-col flex-1 min-h-full">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <div className="text-muted text-sm">·</div>
          <SaveIndicator state={save} writable={writable} />
          <div className="flex-1" />
          <span className="hidden sm:inline text-sm text-muted">
            {me.display_name}
            {!writable && access !== "none" && (
              <> · <span className="text-amber-700">read-only</span></>
            )}
          </span>
          {shareable && (
            <button
              onClick={() => setShareOpen(true)}
              className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Share
            </button>
          )}
          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-xs text-muted hover:text-foreground underline-offset-2 hover:underline disabled:opacity-60 disabled:cursor-progress inline-flex items-center gap-1"
          >
            {loggingOut && (
              <span
                className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden
              />
            )}
            {loggingOut ? "Switching…" : "Switch user"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-8 flex-1">
        <input
          value={title}
          onChange={onTitleChange}
          disabled={!writable}
          placeholder="Untitled"
          aria-label="Document title"
          className="w-full text-3xl font-bold bg-transparent outline-none border-none disabled:cursor-default mb-2"
          maxLength={200}
        />
        {!writable && (
          <p className="text-xs text-muted mb-4">
            Shared by {owner.display_name} · you can read but not edit
          </p>
        )}
        {writable && <Toolbar editor={editor} />}
        <EditorContent editor={editor} className="mt-4" />
      </main>

      {shareOpen && (
        <ShareDialog
          docId={doc.id}
          docTitle={title}
          me={me}
          owner={owner}
          allUsers={allUsers}
          initialShares={initialShares}
          onClose={() => {
            setShareOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SaveIndicator({
  state,
  writable,
}: {
  state: SaveState;
  writable: boolean;
}) {
  if (!writable) {
    return <span className="text-sm text-muted">Read-only</span>;
  }
  switch (state.kind) {
    case "saving":
      return <span className="text-sm text-muted">Saving…</span>;
    case "saved":
      return (
        <span className="text-sm text-muted">
          Saved {relative(state.at)}
        </span>
      );
    case "error":
      return (
        <span className="text-sm text-red-600" title={state.message}>
          Save failed — retry?
        </span>
      );
    default:
      return <span className="text-sm text-muted">Idle</span>;
  }
}

function relative(at: number): string {
  const d = Math.max(0, Date.now() - at);
  if (d < 5000) return "just now";
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(at).toLocaleTimeString();
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
    title: string,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm border ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background border-border hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 sticky top-[57px] z-[5] bg-background py-2 border-b border-border">
      {btn(
        "B",
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        "Bold (⌘/Ctrl+B)",
      )}
      {btn(
        "I",
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "Italic (⌘/Ctrl+I)",
      )}
      {btn(
        "U",
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        "Underline (⌘/Ctrl+U)",
      )}
      <span className="w-px bg-border mx-1" />
      {btn(
        "H1",
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        "Heading 1",
      )}
      {btn(
        "H2",
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "Heading 2",
      )}
      {btn(
        "H3",
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        "Heading 3",
      )}
      <span className="w-px bg-border mx-1" />
      {btn(
        "• List",
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "Bulleted list",
      )}
      {btn(
        "1. List",
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "Numbered list",
      )}
      <span className="w-px bg-border mx-1" />
      {btn(
        "↶",
        false,
        () => editor.chain().focus().undo().run(),
        "Undo (⌘/Ctrl+Z)",
      )}
      {btn(
        "↷",
        false,
        () => editor.chain().focus().redo().run(),
        "Redo (⌘/Ctrl+Shift+Z)",
      )}
    </div>
  );
}
