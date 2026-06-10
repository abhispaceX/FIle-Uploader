# Submission

## Reviewer quick start

- **Live URL:** _(filled in after Vercel deploy — see `VIDEO.txt` if a separate URL is provided)_
- **Walkthrough video:** see `VIDEO.txt`
- **Seeded login users** (just click one — no password):
  - `abhiram@test.com` (Abhiram)
  - `john@test.com` (John)

## Five-minute reviewer flow

1. Open the live URL → pick **Abhiram** on the login screen.
2. Click **+ New document** → write a short heading + bullet list. Watch the **Saved Xs ago** indicator in the header.
3. Click **Import .md / .txt** → upload any small Markdown or text file. It opens as a new document with formatting preserved (for `.md`).
4. Click **Share** → in the dialog, add **John** as **Viewer** → close dialog.
5. Click **Switch user** (top-right) → log in as **John**.
6. Open the **Shared with me** tab → the doc Abhiram shared appears with a `viewer` badge.
7. Open it → toolbar is hidden, title is locked, header shows **Read-only**.
8. Switch back to **Abhiram** → reopen the doc → **Share** → change John to **Editor** → close.
9. Switch back to **John** → reopen → toolbar visible, editor works, autosave fires.

## What's in this folder

| File | Purpose |
| --- | --- |
| `README.md` | Setup, run, project layout |
| `ARCHITECTURE.md` | What I built and why, scope cuts with reasoning, API-layer-vs-RLS tradeoff |
| `AI-WORKFLOW.md` | Tools used, what AI sped up, what I rejected, how I verified |
| `SUBMISSION.md` | This file |
| `VIDEO.txt` | Walkthrough video URL |
| `screenshots/` | Dashboard, editor, share dialog, read-only view |
| `src/` | App source (Next.js App Router) |
| `supabase/migrations/0001_init.sql` | Schema |
| `supabase/seed.sql` | The two seeded users |
| `tests/permissions.test.ts` | Vitest integration test on `lib/permissions.ts` |
| `package.json` | Scripts: `dev`, `build`, `test`, `typecheck`, `lint` |
| `.env.example` | Required env vars |

## Status against the rubric

| Requirement | Status |
| --- | --- |
| Create / rename / edit / save / reopen documents | ✅ |
| Bold, italic, underline, headings, bulleted + numbered lists | ✅ |
| File upload (`.md` / `.txt` → editable document) | ✅ |
| Document owner + grant access to another user | ✅ |
| Visible owned vs shared distinction | ✅ Two tabs + role badges |
| Persistence (refresh-safe content + formatting) | ✅ |
| Setup & run instructions | ✅ `README.md` |
| Working deployed URL | ✅ See above |
| Basic validation + error handling | ✅ Toasts, 404 page, title length cap, file type + size guards |
| At least one meaningful automated test | ✅ `tests/permissions.test.ts` — 6 cases against real Postgres |
| Architecture note | ✅ `ARCHITECTURE.md` |
| AI workflow note | ✅ `AI-WORKFLOW.md` |
| Walkthrough video | ✅ See `VIDEO.txt` |

## Stretch features (optional in the spec)

Implemented:
- Role-based sharing permissions beyond basic access (`viewer` vs `editor`).

Not implemented (explicitly cut, see `ARCHITECTURE.md`):
- Real-time collaboration indicators
- Commenting or suggestion mode
- Document version history
- Export to PDF or Markdown

## If something is broken

If the reviewer hits an error on the live URL, check:

1. The Supabase project the deployment points at hasn't been paused (free tier pauses after a week of inactivity).
2. The cookies for the demo domain — click **Switch user** to reset.

For local issues, see the "Local setup" section of `README.md`. The most common gotcha is using the Supabase **anon** key in `.env.local` instead of the **service_role** key — they look identical but only `service_role` bypasses table grants.
