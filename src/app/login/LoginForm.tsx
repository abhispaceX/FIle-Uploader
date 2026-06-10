"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Profile } from "@/lib/types";

export default function LoginForm({ profiles }: { profiles: Profile[] }) {
  const [selected, setSelected] = useState<string>(profiles[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Login failed");
      return;
    }
    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-2">Select user</legend>
        {profiles.map((p) => (
          <label
            key={p.id}
            className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${
              selected === p.id
                ? "border-accent bg-blue-50"
                : "border-border hover:bg-surface"
            }`}
          >
            <input
              type="radio"
              name="user"
              value={p.id}
              checked={selected === p.id}
              onChange={() => setSelected(p.id)}
              className="accent-[var(--accent)]"
            />
            <div>
              <div className="text-sm font-medium">{p.display_name}</div>
              <div className="text-xs text-muted">{p.email}</div>
            </div>
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={pending || !selected}
        className="w-full rounded-md bg-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {pending ? "Continuing…" : "Continue"}
      </button>
    </form>
  );
}
