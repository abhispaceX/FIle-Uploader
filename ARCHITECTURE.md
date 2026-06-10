# Architecture & Scope Decisions

A short note on what I built, what I cut, and why — written for a reviewer with limited time.

## What got the depth

The assignment explicitly says:

> Prioritize depth in a few important areas over shallow coverage everywhere.

I picked three:

1. **The editing experience.** Tiptap StarterKit + Underline, debounced autosave with a real saving indicator, SSR-safe (`immediatelyRender: false`), aborted in-flight saves on rapid edits, separate debounce for title vs content. Read-only mode that hides the toolbar and locks the title rather than just disabling the editor.
2. **The sharing model.** Owner / viewer / editor distinction wired all the way through: dashboard tabs, share dialog, server-enforced permission checks, and a unit test that catches a regression in any of those layers.
3. **Persistence correctness.** Content is stored as Tiptap JSON (`jsonb` column), preserving structure across reload exactly. Title is a separate column with its own debounce so renames don't race content saves. `updated_at` is bumped via a Postgres trigger, not the application, so concurrent writes can't lose it.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | One deploy target. Auto-upgraded from the planned 15 by `create-next-app` — verified async `params` + `cookies()` API matches. |
| Editor | Tiptap v3 (StarterKit) | StarterKit v3 bundles Underline; one extension instead of two. |
| DB | Supabase Postgres | `jsonb` for content, FK cascades, free tier. Used as a plain Postgres — no Supabase Auth, no Storage, no Realtime. |
| Client | `@supabase/supabase-js` (service-role, server-only) | Skipped Prisma — for three tables and server-only access, the indirection wasn't worth it. |
| Tests | Vitest 4 against the same Supabase project as dev | Synthetic users + cleanup in `beforeAll`/`afterAll`. |
| Deploy | Vercel | Single env-var paste. |

## Scope cuts (and why each one)

| Cut | Reason |
| --- | --- |
| **Real auth** — replaced with seeded-user switcher | The assignment explicitly permits mocked auth. Magic-link or OAuth would have burned 30–45 min on email/redirect/env debugging with zero payoff for the thing actually being graded (the sharing model). |
| **Row Level Security** — access control is API-layer instead | See "API-layer permissions vs RLS" below. |
| **Real-time collaboration** | A CRDT implementation is a multi-day build; a fake one (broadcast last-write) is worse than nothing because it would lie about consistency. Single-writer + last-write-wins is honest. |
| **Comments / suggestions / version history** | All marked optional in the assignment. Skipped for editor-feel polish instead. |
| **Export to PDF / Markdown** | Optional. Tiptap-to-Markdown is a known rabbit hole (custom serializer required for Underline and a few list edge cases). |
| **`.docx` upload** | Mammoth.js → HTML → Tiptap is a 1–2h integration with quality landmines (table cells, embedded images). The spec says "at least one file type" — `.md` and `.txt` cover the demo. |
| **Sharing with non-seeded users via email invite** | No email config means no invite flow. The share dialog only lists existing seeded users; clearly stated in the UI. |

## API-layer permissions vs RLS

**What I shipped:** every doc route resolves the current user from a cookie, calls `getAccessLevel(supabase, docId, userId)`, and returns 404 / 403 based on `canRead` / `canWrite` / `canShare` / `canDelete`. The Supabase client uses the `service_role` key, which bypasses RLS. RLS is **not enabled** on the tables.

**What I considered:** keeping RLS for defense-in-depth. The blocker is that Supabase RLS keys off `auth.uid()`, which is populated by Supabase Auth. Because I dropped Supabase Auth in favor of a seeded-user cookie switcher (justified above), `auth.uid()` is always null, so RLS policies would either fail-closed (locking everyone out) or have to be bypassed in a way that defeats the point.

I could have minted Supabase Auth JWTs server-side to make RLS work, but that's a ~30-minute side quest to preserve a defense layer that adds zero observable behavior to a demo. So:

> In production I'd move access control to RLS for defense-in-depth — a leaked service-role key or a forgotten check on a new route shouldn't be enough to leak documents. Skipped here because the seeded-user auth path doesn't populate `auth.uid()`, and the assignment grades the access *model*, which is fully demonstrable in the API layer.

The single integration test (`tests/permissions.test.ts`) targets `getAccessLevel` — the function the entire API surface goes through — so regressions in any route show up there.

## Autosave design

- Content edits and title edits have independent debounce timers (800 ms content, 600 ms title) so renames don't get queued behind in-flight content saves.
- An `AbortController` is held per editor and replaced on each save attempt — the previous request is cancelled so out-of-order responses can't overwrite newer state.
- The UI exposes one of four states: `Saving… / Saved Xs ago / Save failed — retry? / Read-only`. The error tooltip carries the server message for the dev console.
- `updated_at` is set by a Postgres trigger on update so a slow client clock can't move a doc to the wrong sort position on the dashboard.

## What's stored where

```
profiles(id, email, display_name, created_at)
documents(id, owner_id → profiles, title, content_json jsonb, created_at, updated_at)
shares(document_id → documents, user_id → profiles, role check in ('viewer','editor'), pk(doc, user))
```

`on delete cascade` on both FKs: deleting a doc removes its shares; deleting a profile removes their docs (overshoot for the demo, fine for the timebox).

## File import (`.md` / `.txt`)

Done **client-side** to avoid shipping a server DOM (`jsdom`/`linkedom`) just for this. The flow:

1. `fileImport.ts` dynamically imports `marked` + `@tiptap/html` (no cost on the dashboard otherwise).
2. `.md` → `marked.parse` → HTML → `generateJSON(html, [StarterKit])` → Tiptap doc.
3. `.txt` → split on newlines → array of paragraph nodes (preserves blank lines).
4. POST to `/api/docs` with `{ title, content_json }` — same endpoint as "New document", just non-empty content.

Size capped at 1 MB; only `.md` / `.txt` accepted. Anything else is rejected with a toast before the network call.

## Honest gaps

- **No CSRF protection on mutation routes.** Same-site cookie + service-role key on the server makes the practical risk near zero for a demo, but a real build would either add a CSRF token or move mutations behind server actions.
- **No rate limiting.** A misbehaving client could spam autosave. Fine for the demo because all clients are the developer.
- **No content sanitization on import.** Tiptap's `generateJSON` already strips disallowed nodes from `marked`'s output, so XSS via `.md` is mitigated by the schema. I would still want an explicit allowlist test in prod.
- **The seeded-user cookie isn't signed.** Anyone with the dev tools can edit the cookie value and become anyone. That's the entire point of "mocked auth" — but I want to be explicit that this is a demo affordance, not a security boundary.

## What I'd build next with 2–4 more hours

1. **Move to Supabase Auth + RLS.** Real login (or anonymous Supabase sessions), then port `lib/permissions.ts` checks into RLS policies as defense-in-depth.
2. **Live presence indicator on docs.** Supabase Realtime channel keyed on doc id — no CRDT, just "who else is viewing" avatars. Sets up the visual surface for real collab later.
3. **Document version history.** A nightly snapshot of `content_json` into a `document_versions` table, plus a "Restore" button. Cheap to implement, big perceived-value bump.
