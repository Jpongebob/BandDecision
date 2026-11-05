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

## Anonymous Auth failure diagnostics (2026-11-05)

- Investigated the generic guest-session failure. Supabase Auth runs inside a Next.js Server Action, which returns a form error without necessarily making the browser request fail/red. Browser Network red-request guidance was insufficient for this implementation.
- Added sanitized Auth diagnostics for anonymous-provider disabled, signup disabled, CAPTCHA failure, rate limits, invalid API key/401, connection failure, and upstream 500 errors. Messages include only stable provider code/HTTP status, never raw provider messages, cookies, tokens, or passwords. No retry loop, authentication bypass, or SQL change was introduced.
- Verified against Supabase official error-code documentation: https://supabase.com/docs/guides/auth/debugging/error-codes
- Executed: lint PASS; typecheck PASS; tests PASS (5 files / 38 tests, including 8 new Auth failure regressions); production build PASS (23 routes).
- BLOCKED: exact live failure remains undiagnosed until the new diagnostic code is deployed or provider logs are available. No connected Supabase/Vercel account or live credentials are available. This change improves diagnosis and does not claim to fix the underlying provider failure.
- Next action: push/deploy this code, retry once, then inspect the displayed error code. No SQL needs to be rerun for this diagnostic update.

## Fix invitations still requiring email signup (2026-11-05)

- Root cause: the invitation action always generated legacy /join/token email invitations despite band-code/PIN onboarding.
- Code-enabled bands now share /login?code=... links. Login validates and prefills the code; recipients enter the shared password and then select their PIN-protected member or register nickname/part/PIN. No password or PIN is placed in the URL. Code links are reusable.
- Invitation generation verifies the canonical current band, leader role and administrator elevation. Failed settings reads do not silently fall back to email. Bands without code login retain one-use email invitations.
- Management shows the matching invitation method. Older /join/token pages prominently offer code entry; legacy email participation remains collapsed. Replace previously issued email links with new code invites.
- Executed: lint PASS; typecheck PASS; tests PASS (6 files / 45 tests including 7 invitation regressions); production build PASS (23 routes); local /login?code=ab12cd34ef returned 200 with the normalized AB12CD34EF input value; git diff --check PASS.
- No new SQL/provider settings are required. No commit/push/live deployment was performed.
- BLOCKED/unverified: real Supabase invite/join flow on two devices and RLS integration; provider credentials and an isolated test DB are unavailable.
- Rollout: push/redeploy, open the current production domain, unlock administrator access and create a new 간편 초대 link under 밴드 관리. Send the shared password separately.

## Signed-in home and leader self-skill correction (2026-11-05)

- User screenshots showed band-management membership but a dashboard/create-band prompt and an ALREADY_IN_BAND error. Home/layout queries embedded bands(name) and silently treated any query error as no membership. The exact remote query error was not available; no live root-cause confirmation is claimed.
- Added shared getBandContext with independent membership/band-name queries and distinct ready/none/error states. Layout/dashboard/band settings now show a retryable lookup error with a sanitized code instead of claiming an existing member has no band. Canonical member IDs and RLS remain in use.
- Authenticated visits to / and plain /login now redirect to /dashboard. An explicit invitation code retains its profile-switch context.
- Explained the existing DB default of skill=3/5 in band management. Restored the missing own-leader skill form after administrator elevation, while preserving leader-only skill assignment. No saved skill values or scoring formula were changed. Removed duplicate automatic/explicit submit buttons from dashboard and round creation.
- Executed: lint PASS; typecheck PASS; tests PASS (8 files / 54 tests, including 6 membership/error cases and 3 authenticated routing regressions); production build PASS (23 routes); git diff --check PASS.
- Database test suite now declares 47 assertions, adding leader own-skill update and member-denial coverage; NOT executed because the isolated Supabase DB/provider connection remains unavailable.
- No new SQL migration is needed. Remote query behavior, true provider sessions, and device-level self-skill updates remain unverified.
- Rollout: push/redeploy all pending invitation/home fixes and open the fixed production domain from Vercel Domains. Previously copied immutable deployment URLs retain their earlier code. If lookup still fails, use the newly displayed error code to diagnose the actual remote DB response.

## Menu navigation performance (2026-11-05)

- Source-level contributors: layout/page repeated client creation, getUser, identity and band lookups; independent route data was awaited sequentially; every Realtime row triggered router.refresh; protected routes had no loading boundary.
- React.cache now deduplicates createClient, getCurrentUser and getBandContext only within one Server Component render request. No global/shared-user data cache, skipped authorization, or cross-request membership cache was introduced.
- Parallelized independent queries in dashboard, band settings, schedule, candidate songs, song recommendations and plans. Kept authentication and dependent IDs before their queries. Plan confirmation UI also checks administrator elevation; server permission/version checks remain.
- Added protected loading.tsx for streaming/partial prefetch and responsive navigation while page data loads.
- Batched Realtime refreshes into fixed 200ms windows without indefinitely delaying updates. Hidden tabs defer work; focus/visibility restoration refreshes once. Cleanup cancels pending work and removes listeners/subscription.
- Executed: lint PASS; typecheck PASS; tests PASS (10 files / 60 tests); production build PASS (23 routes); git diff --check PASS. New tests cover 100 event schedules producing one refresh, continuous streams, later batches, cancellation, and actual component background/focus behavior.
- Evidence is limited to code paths and synthetic refresh counts. Actual deployed latency, Supabase/Vercel regional distance, cold starts and authenticated live workload were NOT measured because provider access/live credentials are unavailable. No latency/percentage improvement claim is made.
- No SQL, environment-variable or provider-region changes are needed. Push/redeploy and measure the current production domain before adjusting database/function regions.


## 2026-11-05 Thorough regression audit, leadership handoff, availability error and navigation

This section supersedes earlier local-database BLOCKED statements; hosted provider/device checks below remain unverified.

### Implemented and reproduced
- Added 202611050004_workflow_and_leadership.sql without editing any previously applied migration. Reproduced PostgreSQL 42702 ambiguous x in save_unavailability on the original function. Replaced conflicting PL/pgSQL/JSON aliases, deduplicated equal dates, retained atomic validation and outside-round acknowledgment. Actual SQL workflow suite now passes.
- Leadership transfer is available under 밴드 관리 on another active member's card after administrator unlock. Requires explicit confirmation and, for code-enabled bands, a new 6-digit administrator PIN distinct from the recipient's personal PIN. Recipient must have a personal PIN. Transfer atomically changes owner/roles, resets all admin elevations, and preserves shared password, personal sessions and confirmed plans. Hand the new administrator PIN to the recipient privately.
- Serialized management, handoff and finalization by band-row lock and fresh authorization checks. Former leaders cannot retain authority after transfer; membership removal/leave invalidates relevant mappings. Single-connection tests verify authority before/after, but do not prove true concurrent races.
- Hardened action validation, safe internal redirects, generic unexpected-error display, vote ownership/scoring inputs, required-part difficulty validation, and stale confirmation previews. New round/version resets forms; leaving signs out after successful leave.
- Added home and logical-parent navigation across internal screens, including explicit songs-list return on recommendations. Logical-parent return works on direct URL entry without relying on external browser history.
- Async protected-layout work now sits inside Suspense, with static navigation/loading fallback. Added destination loading boundaries, request-scoped active-member sharing between layout/pages, and parallel round/member skill reads. Auth getUser still precedes identity RPC and existing security regression remains intact. No shared cross-user caches or skipped authorization.
- M_ID was absent from src/public and all 20 generated JS chunks. User-provided 200.js stack has no full source URL, so origin remains unknown; no claim that an extension or our application is responsible. Obtain the full source URL from DevTools (chrome-extension:// versus deployed /_next/static/...), compare a private window without extensions, and capture a full URL/stack if it persists. The database x error is a separate reproduced failure.

### Checks actually executed
- npm.cmd run lint: PASS.
- npm.cmd run typecheck: PASS.
- npm.cmd test: PASS, 17 files / 113 tests.
- npm.cmd run test:db: PASS, five migrations and 163 pgTAP assertions (band-code 47, leadership 37, security 16, member-song 20, workflow 43).
- npm.cmd run build: PASS, 23 routes. Intermediate build exposed usePathname outside Suspense in a fallback; added the missing boundary and reran successfully.
- Local production HTTP smoke: /, /login, /bands/new, /songs/recommendations, /schedule/recommendations all 200; recommendation HTML contains /dashboard home link. No .env.local is configured, so protected responses verify fallback/configuration rendering, not authenticated workflows.
- git diff --check: PASS before final documentation pass; rerun recorded below.
- npm audit --omit=dev: PASS, zero reported production vulnerabilities. Vitest upgraded from 3.2.4 to 4.1.12, removing two reported Critical development-tool findings. Full development audit retains 16 Moderate findings; no forced incompatible ESLint downgrade was applied.
- Static bundle check: zero sb_secret_ key literals of at least 20 suffix characters; SDK prefix-validation strings may still contain the literal prefix. No real server key was configured/injected, so this is not a secret-injection penetration test.
- New disposable test harness: npm run test:db uses PGlite PostgreSQL plus pgTAP/pgcrypto with minimal local auth.uid/auth.jwt fixtures. It runs real SQL/RLS/RPC in an isolated in-memory database, not a production project; no test fixture data is sent to Supabase.

### Remaining / BLOCKED
- Live Supabase migration, GoTrue anonymous/email HTTP authentication, PostgREST schema reload, WebSocket/Realtime delivery, multiple-device behavior, real concurrent connections, viewport/browser visual checks, actual deployed latency and provider regions: NOT executed, credentials/provider connection absent.
- Account deletion remains a request record; the actual Auth deletion/anonymization worker is not implemented.
- No Git commit/push or Vercel deployment was performed. New code and SQL need rollout; prior immutable deployment URLs do not update.
- See QA_REPORT.md for current AC01–AC60 scope and evidence.

### Rollout
1. If 001 initial + member permissions + 002 band-code + 003 password-min4 already succeeded, run ONLY banddecision-web/supabase/migrations/202611050004_workflow_and_leadership.sql in Supabase SQL Editor. Do not rerun historical files or test fixtures.
2. Push the application changes and redeploy Vercel; use the fixed production domain. No new environment secret is needed.
3. Retry quick-date submission once, verify saved dates/reasons after refresh, then test handoff with two separate devices. Old leader should see member rights; recipient unlocks with the new administrator PIN.
4. Measure navigation on the deployed domain using DevTools Network timing for the RSC request and the Vercel/Supabase regions. No quantitative latency improvement is claimed from local synthetic tests.


## 2026-11-05 Policy update: leader administration without extra PIN unlock
This explicit user-requested policy supersedes earlier 30-minute administrator-elevation requirements. A currently logged-in, PIN-verified active band leader may manage members, invite, start rounds and finalize plans immediately. Authentication/session expiry, canonical actor mapping, matching band owner AND active leader role, self-only dates/votes, cross-band RLS and latest-version/finalization validation remain required. No ordinary member gains administrator rights.

Apply ONLY banddecision-web/supabase/migrations/202611050005_leader_without_admin_unlock.sql AFTER the existing migration 004 has succeeded. Do not rerun 001-004. Deploy the matching app changes so the layout banner/unlock form disappear and dashboard, member settings, invitations and finalization use leader role directly. No environment-variable change or data reset is needed. Legacy admin_until/admin_unlocked and administrator PIN storage/RPCs remain for old-client compatibility; admin_until no longer determines authorization. Existing creation/configuration/handoff administrator PIN fields are preserved for compatibility and do not unlock or expire management access.

Verified locally: npm test PASS (18 files/115 tests), npm run test:db PASS (6 migrations/175 SQL assertions), lint PASS, production build PASS (23 routes). New leader_access SQL suite (12 assertions) proves no-extra-unlock finalization/member management, old compatibility flags, member/cross-band denial and expired-personal-session denial. Updated policy-specific tests retain all unrelated denials; new UI tests show tools with legacy admin_unlocked=false and hide them for ordinary members. Standalone typecheck/final build result recorded in final response.
BLOCKED/unverified: hosted SQL application/deployment, actual two-device Auth/Realtime and production UI/latency. No commit/push or provider change was performed.

Final checks for policy 005: standalone npm.cmd run typecheck PASS; final npm.cmd run build PASS (23 routes); git diff --check PASS. No provider deployment performed.

## 2026-11-05 Continuation: complete leader policy copy
- Confirmed policy 005 changes remain in the working tree; latest committed change is 69e0612 (004).
- Corrected stale new-band text claiming administrator PIN is used for management/finalization. Simplified handoff guidance to state immediate signed-in leader access.
- Supabase/Vercel/gh CLI commands and a local .vercel project link are absent. Hosted SQL execution/deployment remains BLOCKED; no production change, commit or push is claimed.
Continuation validation: npm.cmd test PASS (18 files / 115 tests); final npm.cmd run build PASS (23 routes, TypeScript passed); git diff --check PASS. SQL was unchanged since the previous 175-assertion PASS, so the DB suite was not repeated for copy-only changes.
