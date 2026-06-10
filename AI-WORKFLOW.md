# AI Workflow Note

How AI was actually used to build this, written honestly. Verbose enough to be useful, short enough to read.

## Tools

- **Claude Code (Opus 4.7)** in an interactive CLI session — the primary collaborator. Planning, code generation, file edits, running typecheck / build / tests, reading the local `node_modules/next/dist/docs` for Next 16 API confirmation.
- **Manual review** at every checkpoint: every plan, every architectural decision, every produced file was read before being committed to.

No GitHub Copilot, no Cursor, no v0 — single tool, single conversation, transparent transcript.

## Where AI sped me up materially

- **Plan iteration before execution.** I spent the first ~15 minutes refusing to start coding until the plan survived two rounds of explicit pushback (time-budget realism, architectural overclaiming, pre-committed fallback cuts). The plan that finally got written had the depth and cuts called out *before* I'd written a line — see ARCHITECTURE.md for the carry-over of those decisions.
- **Boilerplate elimination.** API routes, Supabase queries, Tiptap toolbar wiring, dashboard list rendering — all are mechanical given the data model. Claude wrote them; I reviewed for correctness and small UX improvements (debounce numbers, error toasts, the read-only header treatment).
- **Verifying Next 16 conventions.** The scaffold landed on Next 16 instead of the planned 15. Instead of guessing, Claude read the bundled `node_modules/next/dist/docs/01-app/03-api-reference/...` to confirm `cookies()` and route `params` are still async — saved a debugging cycle.
- **Catching the Tiptap v3 packaging change live.** When I started writing the editor, Claude opened `node_modules/@tiptap/starter-kit/dist/index.d.ts` and found that **Underline is bundled in StarterKit v3** — the separately-installed `@tiptap/extension-underline` would have been a duplicate registration. Fixed in `EditorView.tsx` and `lib/fileImport.ts` before it ever ran.

## What AI got wrong that I rejected or fixed

- **Initial plan was 6h00m with no slack** — surfaced on the first round of review. I pushed back; the v2 plan added real slack and a pre-committed fallback cut (drop viewer/editor → binary access at the 4.5h mark, never had to use it).
- **The plan claimed "RLS does the access work — no app-layer checks needed."** This became false the moment I dropped Supabase Auth for seeded users. I caught it in review and made the API-layer-vs-RLS tradeoff explicit in ARCHITECTURE.md instead of letting the misleading claim ship.
- **First attempt at the dashboard query had wrong type narrowing** — Supabase returns FK-joined relations as arrays *or* objects depending on cardinality, and my types treated them as scalars. Typecheck caught it; fixed with a `pickName` / `pickDoc` normalizer rather than a blind cast.
- **First version of file upload was server-side** — would have needed `jsdom` for `generateJSON`, ~3 MB of dep weight on a Vercel function. Refactored to client-side dynamic-import (`marked` + `@tiptap/html` lazy-loaded when the user picks a file). No bundle impact on the dashboard, no DOM dep on the server.
- **Initial seeded login was magic-link auth.** Reviewer pushback (rightly) flagged the email-config / redirect-URL / Vercel-env risk for zero grading payoff. Cut to the seeded-user switcher; saved ~40 min and removed the single most likely "reviewer can't log in" failure mode.

## How I verified correctness

- **TypeScript strict mode** caught two real bugs during the build (the Supabase relation shape mismatch above, and a Tiptap `content: unknown` cast). Both surfaced from `pnpm typecheck` before the first `pnpm dev`.
- **`pnpm build`** succeeded with all routes correctly marked `ƒ (Dynamic)` — confirms no accidental static generation of DB-touching pages.
- **Vitest integration test** runs `getAccessLevel` against a real Supabase Postgres with synthetic users, covering owner / no-share / viewer / editor / non-existent doc / null-userId paths. Cleanup runs in `afterAll` so reruns don't accumulate state. This was the one most-likely-to-silently-break piece of the app — sharing — so it gets the one test.
- **Manual UX walkthrough** of the golden path: log in as Abhiram → create doc → bold/italic/H1/list edits → autosave indicator turns green → share with John as Viewer → log out → log in as John → confirm read-only badge + locked title + hidden toolbar → log back to Abhiram → upgrade to Editor → log back to John → confirm now-editable → autosave still works.

## What I would do differently with more time

Less of "use AI more," more of "verify earlier." Specifically: deploy to Vercel during block 0 instead of block 8. Even with a placeholder API, an early deployed URL catches env-loading and edge-runtime mismatches *before* you've written 80% of the code that depends on them. I knew this from the original plan and didn't do it because creating the Vercel project requires the user's account — but I should have stopped to ask for it earlier rather than batching all deployment-side risk to the end.
