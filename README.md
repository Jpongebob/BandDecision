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

## Band code and PIN login (v3.2)

The default flow is /bands/new to create a band, then /login (band code/shared password) followed by /login/member (existing profile + 6-digit PIN, or new nickname/part/PIN). The server issues a random 10-character band code. Member login lasts up to 30 days. Leaders unlock management and confirmation for 30 minutes with a separate administrator PIN.

Before using it:

1. Apply the NEW migration banddecision-web/supabase/migrations/202611050002_band_code_login.sql once, after the two existing migrations. Do not rerun already-applied migrations.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. This provides device sessions only; it does not bypass the application's band/password/PIN checks. No service-role key is required.
3. Existing email members use /login/email, set a personal PIN under **내 정보**, and the leader enables code login under **밴드 관리**. Existing records keep their IDs. Do not create a duplicate band/profile for migration.
4. Deploy the updated code and verify real multi-device login, owner-only writes, admin elevation, logout, and credential rotation.

Passwords and PINs are hashed in the private schema and never returned to the browser. PIN attempts are throttled across devices. Changing a personal PIN revokes that member's other device sessions. Rotating shared credentials revokes other code sessions; email login remains available to existing accounts. A leader can reset other member PINs after administrator verification.

Anonymous Auth users include the permanent anchor IDs referenced by band data. **Do not run blanket anonymous-user cleanup**: deleting an anchor can remove profiles and owned records. Administrator-PIN recovery requires the Supabase project owner; there is no public reset bypass.

Code-enabled bands use **간편 초대 링크 만들기** under **밴드 관리** to share /login?code=... links. These skip email signup, prefill the code, and require the shared password followed by member PIN/profile. Send the shared password separately. Replace previously issued /join/token email invitations with new code links. This correction requires no new SQL.

## Latest workflow/handoff update
The availability SQL alias bug and safe leadership transfer are fixed in the new 202611050004_workflow_and_leadership.sql; apply it after the existing four migrations and redeploy. Internal screens now include home/parent return controls and loading boundaries. Actual local verification: 113 unit/UI/action tests, 163 PostgreSQL assertions, lint, typecheck and production build passed. See [QA report](QA_REPORT.md), [progress](PROGRESS.md) and [rollout](DEPLOYMENT.md) for limits and instructions.
