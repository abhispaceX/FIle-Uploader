# Collab Docs

A lightweight collaborative document editor built for the Ajaia AI-Native Full Stack take-home. Next.js 16 + Tiptap + Supabase Postgres, deployed on Vercel.

> **Time-boxed build.** See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the scope cuts I made and why, and [`AI-WORKFLOW.md`](./AI-WORKFLOW.md) for how AI tools were used.

---

## What it does

| Feature | Status |
| --- | --- |
| Create / rename / delete documents | ✅ |
| Rich-text editing (bold, italic, underline, H1–H3, bulleted + numbered lists, undo/redo) | ✅ |
| Save + reopen — content + formatting preserved as Tiptap JSON in Postgres | ✅ |
| Debounced autosave with "Saving… / Saved Xs ago / Save failed" indicator | ✅ |
| Owned vs Shared-with-me dashboard | ✅ |
| Share with another user, role = viewer or editor | ✅ |
| Read-only mode for viewers (toolbar hidden, title locked, editor non-editable) | ✅ |
| Import `.md` / `.txt` file → new editable document (size-capped at 1 MB) | ✅ |
| Seeded-user login (no real auth — see ARCHITECTURE.md) | ✅ |
| Vitest test covering the permission logic against a real Postgres | ✅ |
| Deployed on Vercel | See `SUBMISSION.md` |

Real-time collab, comments, version history, and exports were **intentionally cut** — see ARCHITECTURE.md.

---

## Live demo

URL and seeded login credentials are in [`SUBMISSION.md`](./SUBMISSION.md).

## Local setup

### Prerequisites

- Node 18+ (developed on 24)
- pnpm 10 (`npm i -g pnpm` if missing)
- A free Supabase project (5-minute signup at https://supabase.com — no card)

### 1. Install

```bash
pnpm install
```

### 2. Provision the database

In your Supabase project's **SQL Editor**, run each of these once:

1. `supabase/migrations/0001_init.sql` — creates `profiles`, `documents`, `shares`
2. `supabase/seed.sql` — inserts the two seeded users (Abhiram + John) with fixed UUIDs

### 3. Configure env

Copy the example and fill in two values from **Supabase → Settings → API**:

```bash
cp .env.example .env.local
```

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role secret — NOT the anon key>
```

> ⚠️ Use the **`service_role`** key (labeled "secret", hidden by default — click Reveal). The `anon` key will fail with "permission denied" because access control here lives in the API layer, not RLS. See ARCHITECTURE.md.

### 4. Run

```bash
pnpm dev          # → http://localhost:3000
pnpm test         # → runs the permission integration test against your Supabase
pnpm typecheck    # → tsc --noEmit
pnpm build        # → production build
```

The login page lists the seeded users — click one to start.

---

## Project layout

```
collab-docs/
├─ src/
│  ├─ app/
│  │  ├─ login/             user-switcher
│  │  ├─ dashboard/         owned vs shared tabs, create / import / rename / delete
│  │  ├─ doc/[id]/          Tiptap editor + share dialog
│  │  └─ api/
│  │     ├─ auth/{login,logout}/route.ts
│  │     └─ docs/
│  │        ├─ route.ts                   POST create (also accepts content_json for import)
│  │        └─ [id]/
│  │           ├─ route.ts                GET / PATCH / DELETE
│  │           └─ share/route.ts          POST / DELETE
│  └─ lib/
│     ├─ supabase.ts        server-only service-role client
│     ├─ session.ts         cookie helpers
│     ├─ currentUser.ts     identity resolution + HttpError
│     ├─ permissions.ts     getAccessLevel + can{Read,Write,Share,Delete}  ← the tested module
│     ├─ fileImport.ts      .md / .txt → Tiptap JSON (client-side, dynamic import)
│     └─ types.ts
├─ supabase/
│  ├─ migrations/0001_init.sql
│  └─ seed.sql
├─ tests/
│  ├─ setup.ts                            loads .env.local
│  └─ permissions.test.ts                 6 cases against real Postgres
├─ ARCHITECTURE.md          scope cuts + tradeoffs
├─ AI-WORKFLOW.md
└─ SUBMISSION.md            file map + deployed URL + video
```

---

## Switching users for the sharing demo

Reviewer flow:

1. Land on `/login`, pick **Abhiram**, create a doc, share it with John as Editor (or Viewer).
2. Click **Switch user** in the header → log back in as **John**.
3. Open the **Shared with me** tab → the doc shows up, badged with the role.
4. As Viewer: toolbar hidden, title locked, "Read-only" indicator visible.
5. As Editor: full editing works; autosave indicator turns green.

---

## What's intentionally not here

- Real auth (mocked — see ARCHITECTURE.md)
- Real-time collab (single-writer, last-write-wins)
- Comments, suggestions, version history
- Export to PDF / Markdown
- `.docx` upload (only `.md` and `.txt` supported — out of scope for the timebox)

These are listed as optional stretch in the assignment; I prioritized depth on editing + sharing + persistence instead.
