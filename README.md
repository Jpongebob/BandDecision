# BandDecision Web

Responsive band rehearsal planning service built with Next.js App Router, strict TypeScript, Tailwind CSS, shadcn-style UI components, and Supabase Auth/Postgres/RLS/Realtime. The app lives in `banddecision-web/`; repository-level requirements are in `banddecision_web_SPEC.md`, `banddecision_web_AGENTS.md`, and `banddecision_web_CODEX_TASK.md`.

## Run locally

1. Use Node.js 20 or newer.
2. Copy `banddecision-web/.env.example` to `banddecision-web/.env.local` and set the Supabase URL, anon key, and site URL.
3. Run `cd banddecision-web`, `npm install`, then `npm run dev`.
4. Apply all SQL files in `banddecision-web/supabase/migrations/` to a Supabase project before exercising database-backed flows.

## Checks

From `banddecision-web/`, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Database pgTAP tests are under `supabase/tests/database/`; they require Supabase CLI and a local database.

## Song permissions

Any active band member can register candidate songs and create or edit per-part difficulty in their band. Difficulty edits record the member, timestamp, and version; stale concurrent edits are rejected. They update current recommendations but do not alter confirmed plan snapshots. Members can only edit their own availability and votes; band leaders alone manage members and confirm plans. Direct table writes remain revoked, and RPCs enforce band membership.

See `PROGRESS.md` for implemented phases, checks, and blocked external integration/deployment work.
