import dotenv from "dotenv";
import path from "node:path";

// Load env from .env.local at the repo root so tests can talk to the same
// Supabase project as `pnpm dev`. We don't ship a separate test config —
// the migration + seed are idempotent and tests clean up after themselves.
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });
