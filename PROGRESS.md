# BandDecision Web Progress

The requested root files `SPEC.md`, `AGENTS.md`, and `CODEX_TASK.md` were not present. I read the supplied equivalents `banddecision_web_SPEC.md`, `banddecision_web_AGENTS.md`, and `banddecision_web_CODEX_TASK.md` in full, then built the new web app under `banddecision-web/`. The previous mobile/Expo app was not changed.

## Phases 0-7

| Phase | Implemented | Remaining / status |
|---|---|---|
| 0 Database, RLS, server functions | Supabase migration, core tables/indexes, RLS, restricted RPCs, pgTAP security test | Migration and DB tests BLOCKED: no Supabase project, CLI, Docker, or database |
| 1 App and auth | Next.js App Router, strict TypeScript, Tailwind, shadcn-style shared UI, Supabase SSR, signup/login/logout/password reset/protected routes | Local static checks pass. Real email auth BLOCKED |
| 2 Band and invites | Create band, 7-day single-use invite, variable membership/same part, leader permissions, skill/part changes, transfer/leave/remove | UI/actions/RPC implemented; DB integration BLOCKED |
| 3 Round and unavailable dates | 60-day participant snapshot, submission states, native date picker and quick date entry, per-date reasons, review/range acknowledgment | Calendar selection plus editable reason list implemented; DB verification BLOCKED |
| 4 Date recommendations | All-submitted date ranking, attendee counts/reasons, tie handling, show all | Recommendation unit tests pass; DB verification BLOCKED |
| 5 Song voting | Song/part difficulty, recommendations, yes/no and reasons, tally/scoring | UI/actions/RPC and calculation tests implemented; DB verification BLOCKED |
| 6 Final confirmation | Leader confirmation, round version/current-state checks, plan/member/song snapshots, refresh subscription | Server functions/UI implemented; concurrency/rollback/Realtime DB verification BLOCKED |
| 7 Responsive operations | Desktop/mobile navigation, profile, error/empty states, account deletion request, README/deploy guide | Browser viewport checks not run. Deletion request only; Auth deletion/anonymization worker not implemented |

## v3.1 candidate song permission update

- Any active band member can add candidate songs and set/edit part difficulty in their own band. Member management and final plan confirmation remain leader-only; availability and votes remain self-only.
- Added `202611050001_member_song_permissions.sql`: same-band RLS policies, member-checked RPCs, difficulty actor/time/version fields, serialized expected-version edits, stale-write rejection, and active-round version refresh. Confirmed plan snapshots are not written by difficulty edits.
- Updated song forms to show these controls to all members, include the current difficulty version, and display last editor/time. Recommendation code reads the latest difficulty records.
- Added pgTAP member-permission coverage for ordinary member add/edit, editing a leader-created song, actor/time/version, stale-write and cross-band rejection, restricted direct table writes, and confirmed snapshot preservation. Added a unit test showing updated difficulty changes later recommendation score.
- Verification: lint/typecheck pass; recommendation and date unit suites pass. pgTAP remains unexecuted because Supabase CLI/DB are unavailable.

## Tests actually run

| Check | Result |
|---|---|
| `npm.cmd run lint` | PASS, no warnings/errors |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS, 2 files / 15 tests (includes edited-difficulty scoring) |
| `npm.cmd run build` | PASS, optimized build generated all 20 static pages/routes |
| Production route smoke check | PASS, `/`, `/login`, `/signup`, `/dashboard`, `/schedule`, `/schedule/recommendations`, `/songs`, `/songs/recommendations`, `/plans`, `/settings/band` returned HTTP 200 |
| Supabase migration/pgTAP/Realtime | BLOCKED: credentials, CLI, Docker, and DB unavailable |
| Deployment | BLOCKED: Vercel account/domain/permission unavailable |

The pgTAP test is written but was not executed, so DB policies and RPC integration are not verified. Configure Supabase URL/anon key, apply the migration, and verify signup, RLS, RPC, and Realtime. Public deployment and browser/device responsive checks remain outstanding.

## Deployment readiness review (2026-11-04)

- Rewrote `DEPLOYMENT.md` with the Supabase migration/auth callback and Vercel project setup steps; added `NEXT_PUBLIC_SITE_URL` to `.env.example`.
- Preview email callbacks and invite links now fall back to Vercel's per-deployment `VERCEL_URL` when `NEXT_PUBLIC_SITE_URL` is unset; Production uses the explicitly configured canonical URL.
- Confirmed the repository has a GitHub remote, but no Vercel CLI/project link, Vercel/Supabase environment credentials, Supabase CLI, psql, or Docker. No live migration or deployment was attempted because this checkout cannot authenticate to either provider.
- The connected Sites account contains one unrelated project (`?대떇肄?硫붿씤`); it has no BandDecision source or runtime configuration and was left unchanged. No matching hosting project is available to attach to this checkout.
- Reviewed the new pgTAP fixtures and corrected the cross-band difficulty test to target a song outside the caller's band. The test file declares 20 assertions; it remains unexecuted until a Supabase local/remote test DB is available.
- Latest code checks: `npm run lint`, `npm run typecheck`, and `npm test` (15 passed) succeeded; production build succeeded and generated all 20 routes.

## Vercel prerender fix and local preview (2026-11-04)

- Vercel's build failed while prerendering `/dashboard`: authenticated protected routes read Supabase request cookies while Next.js Cache Components were enabled.
- Added `export const instant = false` to the protected route layout so authenticated pages can use request-time data.
- Verification actually run after the change: `npm.cmd run build` PASS (all 20 pages/routes generated); production smoke requests to `/`, `/login`, `/signup`, `/dashboard` all returned HTTP 200.
- Local production preview is running at `http://localhost:3000`.
- Not verified: authenticated Supabase flows and remote Vercel redeployment. `.env.local` is absent in this checkout; push the layout fix to the connected GitHub branch to trigger a new Vercel build.


## v3.2 band-code/password and member PIN login (2026-11-05)

### Implemented

- Default onboarding: /bands/new creates a band with a generated 10-character code, shared password, member nickname/part, personal 6-digit PIN, and a distinct 6-digit administrator PIN. /login checks band credentials, then /login/member selects an existing PIN-protected profile or creates a new member.
- Supabase Anonymous Sign-Ins provides device sessions; the database maps PIN-verified device sessions to stable canonical member IDs. RLS and all affected authenticated RPCs resolve canonical actors, so existing membership, own availability/votes, song editor metadata, and rehearsal snapshots keep their IDs. No service-role key or client-supplied role/user ID is used.
- Added 202611050002_band_code_login.sql as one transaction. Prior migrations were not rewritten. The migration restates existing identity-sensitive helpers/policies/RPCs with the actor resolver, preserving direct-write revocations and band isolation.
- Password/PIN hashes and session mappings live in the private schema. Failed PIN/password attempts persist instead of being rolled back by SQL exceptions. Shared passwords enforce bcrypt's UTF-8 byte limit. Anonymous profile creation now works without an email address.
- Member sessions expire after 30 days. Logout removes the device mapping; a personal PIN change removes other mappings for that member; shared credential rotation invalidates other code sessions. Raw anonymous IDs cannot bypass a removed/expired mapping.
- Code-session leaders must unlock administrator rights with a separate PIN for 30 minutes before member management, invitations, round creation, sole-leader band deletion, or final confirmation. UI controls and server checks enforce this. A member knowing the admin PIN still cannot acquire the leader role.
- Existing email accounts remain at /login/email. Existing members set their PIN under 내 정보; leaders enable shared code login under 밴드 관리. A leader can reset another member PIN; existing band data is retained. Instructions cover recovery and avoiding destructive blanket anonymous-user cleanup.
- Updated SPEC, CODEX_TASK, both READMEs, and DEPLOYMENT. Existing pgTAP difficulty fixture calls now explicitly cast smallint arguments for PostgreSQL function resolution.

### Checks actually executed

| Check | Result |
|---|---|
| npm.cmd run lint | PASS |
| npm.cmd run typecheck | PASS |
| npm.cmd test | PASS: 5 files, 29 tests (15 existing + 14 credential/action/identity tests) |
| npm.cmd run build | PASS: 23 pages/routes generated |
| Local production HTTP smoke | PASS: /, /login, /bands/new, /login/email returned 200; /login/member redirected to /login without a band access grant |
| git diff --check | PASS after normalizing README EOF whitespace |

Local production preview is running at http://localhost:3000 (new login at /login). The checkout has no .env.local, so these HTTP checks validate rendering/routing rather than authenticated Supabase operations.

### BLOCKED / not executed

- New database pgTAP suite: 42 assertions written, NOT executed. Supabase CLI, Docker, psql, an isolated DB connection, and connected provider credentials are unavailable. SQL migration execution and actual RLS/RPC behavior remain unverified.
- Live Supabase migration and Allow anonymous sign-ins toggle were NOT applied by this session.
- Live Vercel redeployment, actual multi-device code/PIN login, administrator timeout, browser/device layout, and Realtime behavior were NOT verified.
- User previously reported that the first two migrations ran successfully; this does not verify the new migration.
- No Git commit/push or production deployment was performed for v3.2.

### Required rollout

1. Apply ONLY 202611050002_band_code_login.sql in Supabase SQL Editor, after the already-applied first two migrations. Do not rerun those migrations. SQL Editor and CLI migration histories are separate; see DEPLOYMENT.md before using db push.
2. Enable Allow anonymous sign-ins in Supabase Authentication settings. Retain existing URL/publishable-key environment variables; no new server secret is required.
3. Commit/push and deploy the new code. For an existing band, use /login/email and enable the code/PIN flow on the existing profiles rather than creating replacements.
4. Run the DB suites on an isolated Supabase test database and verify password/PIN rejection, same-band and owner-only writes, leader elevation, revocation, and existing data on two devices before treating the rollout as verified.

## Shared band password minimum: four characters (2026-11-05)

- Shared-band password validation, creation/login/rotation RPC definitions, UI label and HTML minimum now accept 4..64 characters (UTF-8 maximum 72 bytes). Personal and administrator PINs stay six digits. Email-account password rules are unchanged.
- Added 202611050003_shared_password_min4.sql using CREATE OR REPLACE for the three affected RPCs. The previous migration is unchanged; existing hashes and grants are preserved.
- Added the 3/4-character boundary unit test, made the login action test use a four-character password, and extended database fixtures to verify four-character creation/login/rotation plus three-character rejection. Updated SPEC and DEPLOYMENT.
- Executed: lint PASS; typecheck PASS; unit/action tests PASS (5 files, 30 tests); production build PASS (23 pages/routes).
- BLOCKED: live migration application and actual Supabase authentication/RLS tests were not executed; no provider credentials/test DB are connected. Database suite now declares 44 assertions but remains unexecuted.
- Rollout: after 202611050002 is already applied, execute ONLY the new 202611050003 migration, then commit/push/redeploy the frontend/server validation. Do not rerun earlier migrations.
