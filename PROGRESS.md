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


## 2026-11-05 Code-only authentication; retire email onboarding and token invitations
- Per user confirmation that nobody registered with email, removed /login/email, /signup, /reset-password, /auth/callback, /join/[token], the email AuthForm, password/session-exchange actions, legacy create/redeem actions and their dedicated dead redirect helper.
- The old /bands/create bookmark redirects to /bands/new. Dashboard creation now leads to code-based creation. Login/member/profile no longer offer or recommend email login; AppShell labels its displayed nickname accurately.
- Retained /login?code=... reusable band-code invites, shared password, nickname/part/personal PIN registration, own edits, leader management and band isolation. A missing band code now produces a setup error instead of an email-invite fallback.
- New 202611050006_retire_email_login_and_invites.sql revokes PUBLIC/anon/authenticated EXECUTE on create_band/create_invite/inspect_invite/redeem_invite and all app privileges on band_invites. Historical migration files, profiles, band membership and confirmed plans are preserved; no user/data cleanup is performed.
- Replaced obsolete email-only assertions with code-only UI and retired-RPC denial tests. Test count decreases because removed email callback/redirect/login features no longer have live tests. Current npm test PASS: 17 files / 102 tests. npm run test:db PASS: 7 migrations / 191 assertions, including 16 new retired-email assertions.
- Production build PASS: 18 routes including the removed endpoints' absence. Lint initially reported one unused Link after removing member-page email link; removed the unused import and reran. Final standalone typecheck/lint/diff results recorded below.
- BLOCKED: hosted migration/deployment and Supabase provider configuration are not connected. The Supabase Email provider may still be enabled remotely; disable it in provider settings to prevent direct provider email signup/login. Keep anonymous sign-ins enabled. No provider credentials, production data, Git commit/push or deployment were changed.
- Rollout: after 005 succeeded, apply ONLY new 006 SQL once, then push/redeploy the app. Old email URLs return not found and old token RPCs are denied; share fresh /login?code=... links. If any prior migration is missing, apply missing files in order; never rerun already-successful historical scripts.
Final 006 checks: standalone typecheck PASS; lint PASS without warnings after unused import cleanup; git diff --check PASS. Source scan found no remaining email-login/reset/callback/token-invite route or API references. Production build PASS (18 routes); no hosted provider change or deployment performed.


## 2026-11-05 Identity-query latency reduction and owner-operated test band
- Identified remaining request waterfall: verified getUser -> current_band_identity -> active membership SELECT -> band-name SELECT. New migration 007 includes the canonical actor's own member/band snapshot in current_band_identity. App passes it request-locally to membership/context consumers, eliminating two serial database requests after verified auth; older RPC versions retain existing fallback queries. No global user-data cache or skipped getUser/RLS/write checks.
- Hydrated snapshots verify matching actor and member/band pairing. Unit tests prove zero extra from() calls for both context and active member and reject other actors/inconsistent snapshots. Realtime now mounts only in the resolved authenticated shell, not its pre-auth loading fallback.
- Added /bands/test and login '테스트 밴드 체험'. Caller chooses nickname/shared password/personal PIN, then create_test_band builds a separate one-member band with caller as leader, normal 60-day round, 2 future unavailable dates and four songs: A eligible, B waiting vote, C no vote choice, D missing difficulty. Legacy administrator storage is populated internally; no extra admin-PIN input on this flow.
- Fixture uses normal band/round/song/vote/availability RPCs atomically; does not insert Auth users, impersonate members, alter original bands or auto-sign-out a real-band profile. Active members must explicitly sign out or use an independent private browser session. Added members join subsequent rounds under normal policy. Bands are persistent, not auto-deleted.
- PostgreSQL fixture suite: 30 assertions executed, including real A finalization, D rejection retaining A, no original-band access/overwrite, repeated-create rejection and forced late error rolling back band/membership/PIN. Fixed fixture difficulty part key to match actual normalized Korean '기타' before running the new fixture suite.
- Actual tests: npm.cmd test PASS (19 files / 111 tests); npm.cmd run test:db PASS (8 migrations / 221 assertions); lint PASS; standalone typecheck PASS; npm.cmd run build PASS (19 routes). New action/page tests verify credentials, transaction failure reporting and refusal to silently replace active real sessions.
- Hosted Auth/SQL application, production latency/regions, real browser navigation and multi-device behavior remain BLOCKED/unverified because provider credentials are unavailable. Query-count improvements are measured in tests; no milliseconds/percentage latency claim is made.
- No production band or Git commit/push/deployment was created by this run. Test-band creation is available to the user after deployment through /bands/test. No shared precreated code/password is published.
- Rollout: after successful 006, run ONLY new supabase/migrations/202611050007_identity_context_and_test_band.sql once; then push/redeploy the app. Open /bands/test in a private window. See TEST_CASES.md for steps and expected results.
Final 007 smoke: local production /bands/test and /login returned HTTP 200; test creation button, scenario guide, and /bands/test login link present. Local app has no Supabase environment, so this is rendering-only evidence. git diff --check PASS. Local preview started at http://127.0.0.1:3000 (session 86002). No hosted test band or deployment was created.

## 2026-11-05 Reproduced-bug audit and regression repairs (008)
- Added tests before fixes: 12 UI/service cases failed for explicit-none submission, past calendar entry, stale difficulty/version mixing, stale votes and swallowed read errors. Fixed and reran to pass. Page-level run reproduced 7 failures in 8 tests, then expanded error checks to dates/song modes. Three additional failures reproduced old-round drafts and new-member edit/status errors; all corrected.
- Database input suite reproduced 6 failures out of 11: malformed JSON reason types were accepted and changed stored dates; null choice raised a constraint error. New 008 migration validates before writes. All 11 pass, including retained old data on invalid requests.
- Loaders no longer invent skill=3 or empty data after a query error. Schedule/plans/home/date and song round lookup failures surface a retry/home boundary. Newly joined members outside frozen roster cannot see their vote/schedule edit forms and are not labeled submitted; candidate/difficulty permissions remain.
- Version-keyed difficulty forms and round/saved-vote-keyed vote forms prevent hidden current versions from being mixed with stale uncontrolled inputs.
- Actual results: npm test PASS (23 files / 139 tests), test:db PASS (9 migrations / 232 assertions), standalone typecheck PASS, lint PASS, build PASS (19 routes). Initial build caught nullable roundId after permission-condition change; safe hidden-input fallback corrected it and build passed.
- Real Chrome: desktop login screenshot at 1440px; test-band page measured at actual 390px/320px and no horizontal overflow. Initial CLI screenshot clipping was caused by capture viewport settings. Original-style comparison had identical width metrics, so speculative form/input style changes were reverted. Retired email/token URLs returned 404 in actual Chrome fetches.
- See BUG_AUDIT.md for reproduced cases, fixes, precise execution scopes and remaining blockers. Chrome used separate temporary profiles; local app lacks Supabase environment. Real authenticated browser/multi-device/parallel-connection/hosted latency still NOT verified. No production SQL/deployment/Git commit/push performed.
- Rollout: after 007 succeeded, run ONLY new 202611050008_strict_submission_inputs.sql once, then push/redeploy application code. Prior migration files remain untouched and existing records are preserved.
Final 008 validation: full npm.cmd test PASS (23 files/139 tests); lint PASS; final production build PASS (19 routes); standalone typecheck PASS; git diff --check PASS. Database remains 232/232 PASS after 008; no SQL changes after that run. No authenticated hosted browser or production deployment was performed.

## 2026-11-05 Correct fixture scope: owner plus four ordinary members (009)
- User requested realistic member cases after the initial one-person fixture. Added a five-person setup: creator leader on guitar, second guitar(skill2), bass(3), drums(4), vocal(3); all ordinary demo members have real anonymous Auth identities and a user-chosen common PIN distinct from the leader's personal PIN.
- Added private fixture/slot registries, backfill only for exact original one-person sample signatures, authenticated test-slot registration via normal password grants, and leader-only atomic five-person preparation. Real bands cannot use fixture controls. No direct Auth table inserts or service-role keys in production code.
- Existing one-person fixture leaders can open /bands/test and add the missing members. New fixture creation prepares all five. Provisioning is resumable and skips existing slots; a completed fixture cannot be automatically reseeded over user test edits. Initial profile creation spans several Auth requests and is NOT globally atomic; final round/sample setup is one transaction.
- A all-five yes; B four yes with creator pending; C three yes/two no; D missing part difficulty. Five schedules are submitted, one drummer none; tomorrow has three attendees and needs partial acknowledgment. Ordinary profiles can be selected on another device with the shared test PIN.
- Actual SQL run: 47 new assertions pass, including demo profile PIN login, own vote/candidate edits, leader-only denial, duplicate guitar, 3/5 partial finalization and idempotence. New suite caught PL/pgSQL record/alias collision before completion; renamed records and reran successfully. Total 279 assertions/10 migrations pass.
- Unit/service tests verify four isolated Auth signups, partial resume, no reseeding, rate-limit stop, no real-band setup and leader/profile protection. Tests model hosted SDK calls; actual hosted creation remains unverified. Build passed (19 routes), lint passed. Final counts and standalone typecheck recorded below.
- Rollout: after 008 succeeded, apply ONLY 202611050009_multi_member_test_band.sql, deploy code, and open /bands/test while logged in as the existing test leader. No production DB/Auth/deployment was changed in this session. TEST_CASES.md now describes five-person cases.
Final 009 checks: npm.cmd test PASS (24 files/147 tests); PostgreSQL suites PASS (279 assertions/10 migrations, 47 new five-person cases); standalone typecheck PASS; lint PASS; final build PASS (19 routes); git diff --check PASS. Auth SDK provisioning was mocked in unit tests, and hosted anonymous-account creation/real multi-device UI remains unverified. No production SQL, commit/push or deployment performed.


## 2026-11-05 Full local mobile flows and five retained plans (010)
- User requested all mobile flows and up to five plans. Added 010 only; historical migration files unchanged. Removed band_id unique and destructive replacement, added indexed date ordering, capacity trigger and band-serialized leader-only deletion. Every confirm/delete bumps the active round version; duplicate confirmation using an old version fails. Existing snapshots remain through new confirmations, membership/part edits, round changes and leadership handoff.
- Home and plans now read collections and show all saved plans. Plan count 0..5, full-capacity notice, explicit per-plan deletion consent, ordinary-member read-only view and localized capacity errors are wired to real server actions.
- Added localhost-only Auth/REST contract gateway using real PGlite migrations/RLS/RPCs, plus actual Chrome mobile metrics/touch testing against real Next pages/actions/cookies. Normal test:mobile completed 157/157 checks in one run, no uncaught JavaScript exceptions. Report: MOBILE_QA_REPORT.md, ignored screenshots and check JSON: banddecision-web/.qa-artifacts/mobile.
- Checked 320/390/430/768px portrait and 844px landscape; all protected screens, public login/member selection, long-title wrapping, fixture create, invite, invalid credentials and retry, calendar/quick/none, votes/reasons, difficulties/version, recommendations, five plans and delete, home navigation, ordinary profile restrictions, handoff, skill/part, credential rotation, member PIN reset, own PIN/nickname and relogin, removal, new round with retained plans, new profile roster guard, leave, standalone band and local deletion request.
- Reproduced/fixed SDK Date.now prerender error using request-time connection boundary (still getUser before identity RPC); feedback lost on whole-form remount; 120-character Latin title expanding 390px to 1274px; validation errors auto-resetting selected profile/PIN; settings and no-round song member reads silently becoming empty state.
- Tests retain stale-version/input consistency and new-round draft reset, add successful-feedback retention, invalid-input retention versus successful form reset, collection rendering, max-five UI and delete/capacity actions. DB adds 21 assertions for five independent snapshots, sixth rejection, trigger, self/cross-band authority, version replay, cascade and reuse.
- Final completed checks: npm.cmd test PASS 26 files/163 tests; npm.cmd run test:db PASS 11 migrations/300 assertions; standalone typecheck PASS; lint PASS; normal production build PASS 19 routes. Additional build with configured local Supabase variables recorded separately after completion.
- Auth/REST are platform substitutes in browser QA, not actual hosted GoTrue/PostgREST; Realtime, CAPTCHA/provider limits, physical phones/Safari/native keyboards, real multi-connection race and hosted latency remain unverified. Test tokens/accounts exist only in disposable local memory. No production SQL, provider Auth users, deployment, Git commit or push was performed. Local test servers stopped after successful browser run.
- Rollout: if 009 already succeeded, run only 202611050010_multiple_rehearsal_plans.sql once, then deploy. Otherwise apply 009 then 010 after previous successful migrations. Never rerun successful historical files.
Final 010 validation: configured-local-Supabase production build PASS (19 routes, authenticated routes remain dynamic/partial with the gateway stopped); rebuilt again in a fresh normal shell with no QA variables PASS (19 routes). Final standalone typecheck PASS, lint PASS, unit 163/163 PASS, SQL 300/300 PASS, mobile full run 157/157 PASS, diff --check PASS. QA servers stopped; artifacts remain ignored.


## 2026-11-05 Continuous planning and simpler editing (011)
- User replaced the round workflow with immediate current-roster planning. Added only 011; historical migrations remain unchanged. New band_song_votes imports the latest historical vote per member/song, current membership/dates/difficulties/votes bump band planning_version, and old external round write APIs are revoked. Internal fixture compatibility and historical references remain, with no manual round in the app.
- New single coherent context RPC replaces current page query waterfalls. Verified actor/member/band pairing and strict context validation remain; no Auth bypass, no global user cache. Active members immediately affect attendance/vote eligibility; unsaved dates mean available (shown explicitly). Recommendation window is rolling 60 days, but direct date-only confirmation may choose any future date.
- Saved dates appear once, separately from blank new-date inputs. Single-date and optional bulk append never replace the stored set. Saved rows edit date/reason or delete only that row, including past saved rows. Duplicate-target edits and invalid bulk inputs are atomic rejections.
- Plans allow zero songs, direct date confirmation, later date/song edits and song removal with the same plan ID. Five-plan limit does not block editing. Current leader authority, band serialization, planning version and individual plan version checks remain; partial attendance acknowledgement remains. Existing snapshots are preserved unless explicitly edited; edit uses current active members and keeps retained historical song snapshots.
- Removed manual round controls/text from home, settings, schedules, songs and recommendations. Simplified plan cards, optional songs, optional bulk date input and collapsed attendance detail.
- Updated current UI/action/page tests rather than asserting the retired frozen-roster behavior. Actual results: 28 files / 182 tests PASS; 66 current SQL assertions PASS; 300 historical assertions at 010 PASS. Upgrade test inserts real 010 dates/votes/confirmed snapshots before executing 011 and verifies preservation and edit support.
- Actual Chrome full run PASS 100 checks: 320/390/430/768/844 widths, separate saved-date list, add/edit/delete/bulk, date-only direct confirmation, later song add/remove and date edit, edit at five-plan capacity, deletion, persistent vote/difficulty, member-only restrictions, immediate newcomer date/vote and six-person date-only plan, no user-facing round or preview. Runtime exceptions: 0. Platform Auth/REST are still localhost substitutes; hosted provider, physical phones/Safari/native keyboard/Realtime/real concurrency/production latency unverified.
- First SQL attempt exposed UTF-8 BOM handling; 011 is now UTF-8 without BOM. Browser automation initially selected the hidden delete-date field instead of the visible edit-date input; scoped the selector, product SQL edit already passed. An automatic approval review was temporarily unavailable due to usage limit; no action was run/bypassed, and work resumed through normal approval after the specified reset time.
- User's 009 already-exists error is handled with read-only supabase/checks/migration_status.sql; no table deletion or blind IF NOT EXISTS conversion. If all 009 objects exist, skip it; verify 010 then apply 011 once and redeploy. No hosted SQL, Auth user, Git commit/push or deployment performed.

Final 011 checks: unit/component/action tests PASS 28 files/182 tests; current SQL PASS 66 assertions including seeded 010->011 preservation, historical-through-010 PASS 300 assertions (separate scopes). Current Chrome default full matrix/workflow PASS 100 checks, uncaught JS exceptions 0, screenshot visually inspected. Lint PASS; standalone typecheck PASS; configured-local-Supabase production build PASS 19 routes while gateway stopped. Generic build restoration and final diff check recorded after completion. Local test servers stopped; no provider SQL or deployment performed.
Final 011 completion: restored no-QA-environment production build PASS (19 routes); diff --check PASS. Current source lint/type/unit/SQL/mobile checks all passed. Read-only migration_status.sql is provided for the existing-009 error; apply only migrations that have not succeeded. Hosted execution/deployment remain user actions.


## 2026-11-05 Automatically visible compact date suggestions
- User reported that plan confirmation showed only a native date input, with no recommendations. Added automatically visible top-five native radio choices directly below that input, computed from the same current-members/availability recommendation algorithm. No extra reveal button, no full-size recommendation cards or mandatory preview. Selection syncs the calendar and attendance immediately and resets partial-attendance consent. Manual dates and existing-plan editing remain available; SQL is unchanged.
- Mobile uses a compact three-column/two-row layout; wider viewports use five columns/one row. Actual Chrome measured suggestion fieldset height 130px at 320/390/430px and 76px at 768/844px, with no horizontal overflow. Automatic rendering, selection and direct date-only confirmation pass. Screenshot automatic-date-suggestions-390.png visually inspected.
- New unit cases verify immediate five-option visibility, attendance/date ranking, calendar synchronization, no required songs/preview, and consent reset. Full unit suite PASS 28 files/186 tests; standalone typecheck PASS; lint PASS. Browser focused run (QA_FAST skips only the initial old 50-route matrix) PASS 63 checks, exceptions 0, including all continuous planning workflow checks plus the five-width compact-suggestion checks. New SQL test rerun not needed because no SQL changed. Local servers stopped. Production build result recorded after completion.
- Rollout is frontend redeployment only; do not rerun 011 for this change. Hosted provider and physical phones remain unverified.
Compact date suggestions final: normal production build PASS (19 routes); diff --check PASS. UI-only change, no new migration, no hosted deployment performed.


## 2026-11-05 Loading performance follow-up (012)
- Added a canonical-actor, active-member-only `band_attendance_context()` RPC and active-roster/song indexes in `202611050012_loading_performance.sql`. Schedule and date recommendations no longer retrieve song difficulties/votes. Home reads only member count and plan summary fields; band settings reuses its already-loaded roster.
- Server Auth verification is request-local and shared. Schedule/date identity and attendance reads run concurrently only AFTER verified `auth.getUser()` succeeds; invalid Auth cannot start private RPCs. Existing canonical identity, session expiry, RLS and leader checks remain. Cross-request user caching was not introduced.
- Replaced `connection()` with installed Next 16.4.5 `io()` to exclude SDK clock reads from prerendering without a navigation-only I/O boundary. This does not prefetch or cache private account data across visitors. Proxy `getClaims()` remains unchanged.
- Realtime refresh subscribes to the current band's revision row instead of every changed child row/all bands. Existing visibility/focus refresh and burst coalescing remain. Hosted Realtime delivery is unverified.
- Validation: lint and typecheck PASS; 29 files / 192 unit/component/action tests PASS; 72 CURRENT continuous-planning SQL assertions PASS, including six new payload-equivalence/authorization/index assertions. Separate HISTORICAL through-010 scope: 300 PASS. Actual Chrome focused workflow: 63 checks PASS, zero uncaught JS exceptions, including normal-member restrictions, saved-date edits, automatic date choices, date-only plans, five-plan capacity, vote changes and new-member roster updates. Auth/REST use disposable localhost substitutes with real SQL/RLS, not hosted Supabase.
- Controlled production-build Chrome benchmark, three full document loads per route with 80ms artificial delay per local gateway request: before medians schedule 468ms / date recommendations 492ms / home 478ms; after idle rerun 485ms / 479ms / 471ms. Small differences are within run noise; NO substantial end-to-end latency win is established by this five-member fixture. The query work/payload is reduced, but hosted cold starts, provider latency and actual menu-navigation timing still require deployed measurement. Background SDK Auth/unsupported Realtime retries pollute total request/byte metrics, so those totals are not treated as pure route payload savings.
- An automatic approval review rejected replacing proxy `getClaims()` with `getSession()` as potentially weakening Auth. That command did not execute; the safer implementation retains verification and optimizes only request-local sharing and data retrieval. No permission request is needed for the retained implementation.
- Apply 012 once AFTER successful 011, then deploy the updated app. Do not rerun prior migrations. No hosted SQL, credentials, production user data, commit/push or deployment changed by this task. Final normal-environment build and local-server cleanup recorded below.

Final 012 completion: no-QA-environment production build PASS (19 routes); lint/typecheck PASS with no warnings. Local QA gateway and Next server started for this task were stopped. Source diff whitespace check recorded at completion. No production latency claim or deployment performed.


## 2026-11-05 Calendar selection, credential whitespace, compact song detail and vote withdrawal
- User withdrew the request to allow all songs in plan choices. Restored original eligibility filtering and SQL checks; the provisional manual-plan-song migration was removed before any DB execution. Final new 013 is ONLY withdraw_song_vote; it does not change song recommendation/plan eligibility.
- Plan date button opens an accessible native modal dialog with monthly calendar and attendance counts for every date, not just top-five suggestions or a 60-day hard cap. Zero-attendance and new past dates are disabled; partial-attendance acknowledgement is retained. Five compact suggestions remain automatically visible. Native modal focus handling, Escape and keyboard day/month navigation supported.
- Unavailable dates now use an inline multiple/range calendar, selected-day toggle/removal, cross-month ranges, common reason, append-only save and separate saved-row edit/delete. Existing saved/past dates are disabled for new selection. Ranges over 366 days are rejected without truncating a long range; saved days are skipped. Saved date editing also uses a calendar. Optional old text bulk input remains collapsed.
- Band code and PIN remove all whitespace on browser input AND server validation, preserving leading zeroes. Shared passwords trim only leading/trailing whitespace on blur/server validation; internal password spaces remain meaningful. Oversized PIN input is rejected rather than silently dropping extra digits.
- Songs list shows compact title/artist, vote counts, part difficulty summary and own vote state with a detail link. Difficulty editors, saved metadata, own-vote editor and negative reasons live on /songs/[id]; no repeated full editor per list row. Registration is collapsed on the list, absent from detail. Votes can change choice/reason; negative reason only appears when needed. Withdrawing deletes only the verified actor's current vote, returning it to unanswered and allowing re-voting.
- New migration `202611050013_withdraw_song_vote.sql`: band-first row lock, recheck active canonical actor after lock, own member-only DELETE, cross-band/guest denial, authenticated EXECUTE only; existing live-vote trigger increments planning_version. Idempotent repeat has no spurious revision bump. Historical plan snapshots remain intact.
- Sources consulted for interaction: https://doodle.com/en/scheduling/ (calendar multiple dates) and https://daypicker.dev/docs/selection-modes/ (single/multiple/range). Implemented a small reusable existing-stack calendar without adding a dependency.
- Current checks so far: lint/type PASS; 202 unit tests PASS before final eligibility regression addition; SQL CURRENT 89/89 PASS including 17 vote-edit/withdrawal/second-device canonical identity/isolation assertions. Separate HISTORICAL through010 300 PASS. Browser final result and normal environment build recorded after completion; no production SQL or deployment performed.


### Follow-up: remove unavailability reasons, including saved data (014)
- User explicitly rejected hiding/preserving old absence reasons. Removed all absence-reason inputs/displays (new dates, saved date editing, date recommendations and confirmed attendance). Multiple/range calendar replaces optional text bulk entry. Dates save directly without any reason field.
- `202611050014_dates_without_reasons.sql` erases ALL stored unavailable_dates.reason values and confirmed_plan_members.reason_snapshot values. BEFORE triggers and constraints prevent new values from being stored, including legacy fixture RPC writes. Empty legacy columns/parameters remain solely for backward SQL compatibility; no existing reason text is retained. Negative song-vote reasons are a separate feature and remain intact.
- Updated new/edited availability API to accept missing reason; date-only changes do not require collecting text. Date ownership, duplicate protection and range/date validation remain. Seeded a real pre-014 plan absence reason in the disposable SQL upgrade test before applying the migration, then verify it is erased along with original date reasons.
- Supersedes earlier preservation notes for absence reasons. Apply 013 then 014 once after 012, then redeploy. No production SQL/deployment was performed here.


## Final 013/014 verification (2026-11-05)
- Final source: lint PASS (no warnings), typecheck PASS, 31 files / 203 unit/component/action tests PASS; no-QA-environment production build PASS, 19 routes. New plan choices still filter by recommendation eligibility; regression test confirms waiting songs remain excluded.
- SQL CURRENT continuous planning: 99/99 assertions PASS, including own-vote edit/withdraw/recast/isolation/canonical second device (17) and reason-free availability plus seeded data cleanup (10). Separate HISTORICAL-through010: 300/300 PASS. Existing date/plan membership, version and eligibility tests continue to pass.
- Actual Chrome focused workflow: 83/83 PASS, zero uncaught JavaScript exceptions. Multiple/range calendar date-only save/edit/delete; no absence reason input/output; attendance popup across 320/390/430/768/1280px; compact list has no repeated editors; detail difficulty/vote edit, own withdrawal and re-vote; padded password/PIN login; normal-member/newcomer and six-member plan behavior passed. Mobile 390px and desktop 1280px popup screenshots plus compact list screenshot visually inspected.
- Scope: Chrome emulation and production Next with disposable PGlite SQL/RLS and simulated Auth/REST; actual Supabase Auth/PostgREST/Realtime, physical iOS/Safari and hosted latency not verified. Local QA processes stopped; no operating SQL, commit, push or deployment performed. Apply unexecuted migrations in order (012 if pending, then 013, then 014), then deploy. 014 actually clears stored absence reason text and prevents recollection; empty legacy columns exist only for SQL compatibility. Negative song-vote reasons remain.


## 2026-11-05 Attendance calendar and compact saved dates
- Availability receives the existing scoped attendance context (active members and all unavailable dates) from the schedule page, with no extra DB query/RPC. Calendar cells show both attending and absent counts, including clearly labelled unsaved own-selection previews. Sets prevent double-counting duplicate records; inactive member IDs are ignored. A zero-attendance day can still be selected/deselected as unavailability.
- Saved dates now sort and group by month as compact 3/4/6-column tiles, with weekday, totals and attendance. Clicking a date opens a single edit/delete modal instead of mounting a full row/editor/action per stored date. Nested date picker close is isolated from outer editor close; refreshed deleted/moved rows close the modal. Existing date-only APIs and reason removal remain unchanged.
- Candidate registration defaults open on the songs list, and remains manually collapsible. Detail-page editors remain on the detail page.
- Lint/typecheck PASS; 32 files / 209 tests PASS, including preview counts, duplicate/inactive member handling, refreshed roster, chronological month grouping and nested-dialog lifecycle. Chrome screenshots at 390px and 1280px visually inspected. Final browser count/build recorded below. No new SQL needed; no deployment performed.

Final date-UI verification: 209 unit/component tests PASS; focused Chrome 84 checks PASS, zero uncaught JS exceptions, 320/390/430/768/1280px calendar/tile layouts and modal edit/delete passed. Screenshot compact-saved-dates-390.png / 1280.png visually inspected. Final no-QA-environment production build PASS (19 routes), including the final registration-default-open attribute. Local QA servers stopped. No new migration or hosted changes; redeploy updated app to apply.


## 2026-11-05 Saved-date edit calendar duplicate prevention
- Pass current saved dates into the edit picker; other saved days are disabled and labelled 저장됨, including across month navigation. The original edited day is labelled 기존 날짜 and remains selectable, including a preexisting past day; other past dates stay disabled. A picker-specific hint avoids attendance-only instructions in this calendar. Existing server duplicate checks remain.
- Lint/typecheck PASS; 32 files / 211 tests PASS, including cross-month duplicate rejection and current-past-date exception. Production build PASS. No SQL change, hosted data change or deployment performed; redeploy the app to apply.


## 2026-11-05 End-to-end audit and attendance names
- User requested a broad regression audit after recent features, then requested names beside attendance counts. Added nickname/part lists for attendees and absentees under the availability calendar. Own draft additions immediately update names; a separate view-only date picker can inspect saved dates without adding/removing unavailable dates. Reuses scoped attendance data, no new SQL/RPC. Long names wrap within mobile panels.
- Broad run includes ten menu pages at 320/390/430/768/844/1280 widths; nested date picker Escape/outer-editor preservation; disabled saved-day edits; default-expanded song registration; full date/vote/plan flow and actual leadership handoff with immediate former/new leader permissions and preserved plans.
- Automation corrections: first CDP Escape event lacked the native key code and did not emit a browser cancel; correct rawKeyDown/keyUp 27 verifies inner-only close. A new Runtime.evaluate assertion had nested-selector escaping corrected. These were harness errors; no product fix was required for the existing nested-modal behavior. Full/focused rerun results recorded below.
- Current unit/component/action suite: 32 files / 213 PASS. Existing migrations from initial through014: CURRENT SQL 99 PASS; separate HISTORICAL through010 300 PASS. Actual hosted Auth/Realtime, real concurrent Postgres sessions and physical Safari/phones remain outside localhost QA; no operating data or deployment changed.


## Final broad audit result — 2026-11-05
- PASS: lint, standalone typecheck, 32 files / 213 unit/component/action tests, production build without QA env (19 routes).
- PASS: CURRENT SQL/RLS 99 assertions; separately HISTORICAL through010 300 assertions. Initial->014 migration chain executes in disposable PostgreSQL-compatible SQL engine with upgrade fixtures.
- PASS: one complete actual-Chrome run 158 checks / zero uncaught JS exceptions. Ten menu routes at 320/390/430/768/844/1280, followed by availability counts/names, draft preview, disabled duplicate calendar dates, nested modal Escape, tile date edit/delete, range/date-only writes, direct date-only plans, same-plan edits, five-plan capacity, song registration/difficulty/negative reason/vote withdrawal/recast, bad-credential retry and padded input, new-member inclusion, ordinary-member restrictions, and actual leader handoff. Former leader loses settings/plan controls; new leader can manage immediately and edit retained plans; all five plans preserved.
- Broad audit found no new reproducible APPLICATION failure in this scope. Test harness corrections were required for CDP Escape key codes, Runtime.evaluate quote escaping, and unsupported nested CSS :has selectors. Earlier failed attempts were not counted as final passes. No authentication weakening or new migration introduced.
- Added requested attendance nickname/part panel and view-only date selection. Names reuse existing scoped data; own unsaved date changes update the lists; view-only inspection leaves the draft intact. Long nickname/part labels wrap within mobile chips. New-name screenshot portion visually inspected at 390px; six-width layout checks passed.
- Limitations: production Next with disposable PGlite/RLS and simulated Auth/REST is not hosted Supabase integration. Physical iOS/Safari, real Supabase Auth/Realtime and true multi-connection concurrency remain unverified. No deployment, provider SQL, commit/push or real user data changed. QA servers stopped and normal build restored. Redeploy updated app for new attendance names; no new SQL for this follow-up.


## 2026-11-05 Simpler band workflows (015)
- User approved items 1/2/4/5 from the UX review; undo deletion was excluded. Removed administrator PIN inputs/actions from creation, password settings and handoff. Normal creation needs shared password and personal PIN only; handoff retains explicit consent and canonical active-leader checks. Obsolete admin hashes/session elevation values are cleared. Old 6-/2-argument creation/configure RPCs remain compatible and ignore their obsolete PIN argument for fixtures/old clients; the app uses new PIN-free signatures. The unused unlock RPC is removed. Personal PIN verification, expiry/version invalidation and password-rotation semantics remain.
- Date-based archive: plans before today's Seoul date appear under 지난 합주 with preserved song/member snapshots. Only today's/future plans count against five. Home shows upcoming plans only. Past cards are records with no edit form; leaders can still explicitly delete records. Both RPC and capacity trigger enforce five upcoming plans, including past-to-future moves. SQL tests exposed the old trigger still counting all history; updated it as part of 015, then reran successfully. No scheduled job or deletion is needed to archive by date.
- New members start with NULL skill, displayed 미설정; leaders can set or clear a skill. Existing numeric values are kept because historic defaults cannot be distinguished from deliberately assigned values. Fixture members retain explicitly seeded skills. Missing skills suspend burden/score and newly selected recommended songs; date-only plans and retained historical song snapshots remain available. UI explains pending skill, and DB enforces it too.
- Home uses a small canonical-actor band_home_context RPC for own pending votes, upcoming own unavailable dates, member/unassigned-skill counts and own skill. It shows 내가 할 일, the nearest rehearsal and saved upcoming dates. Pending-vote link opens an actual own-vote filter, not another person's vote state. Settings/profile/roster changes now invalidate the layout so home counts and greetings refresh consistently.
- Apply new 202611050015_simplified_band_workflow.sql once AFTER 014, then deploy. Earlier migrations remain unchanged. No production execution/deployment/commit/push performed. Final check results recorded below.


## 2026-11-06 Confirmed repertoire and explicit member removal (016)
- Added songs.confirmed_at and leader-only set_song_confirmation RPC. The existing band lock/song planning-version trigger serializes changes. Idempotent repeated confirmation does not unnecessarily stale plans. Band-scoped planning context exposes the status. Authenticated direct column updates and anonymous RPC execution remain denied.
- Song detail lets leader decide/clear repertoire; songs list separates confirmed repertoire from candidates. Plan choices include repertoire plus originally eligible recommendations, and retained snapshot choices. Only the explicit leader decision bypasses recommendation prerequisites. Existing unconfirmed recommendation policy is retained. Removing from repertoire returns to candidate status; votes and existing plan snapshots survive. Deleting/recreating plans keeps confirmed songs selectable.
- Added named native modal confirmation for member removal, explicit cancel/ESC, consent field checked before server RPC, existing DB leader/membership validation retained. No undo feature was added.
- Added 19 SQL assertions, action boundary tests and UI tests. Executed lint/typecheck successfully, 35 unit files / 222 tests PASS, CURRENT SQL 147 PASS, separate HISTORICAL through010 300 PASS. Full initial->016 migration chain runs against disposable PGlite. QA-configured production build PASS (19 routes). Browser/final normal build results follow.
- No hosted DB/provider changes, deployment, commit/push or production user data changes. New 015 then016 must be applied once in sequence after014 before deploying the updated app.


## Final 015/016 validation — 2026-11-06
- PASS: lint, standalone typecheck, 35 unit/component/action files / 222 tests; CURRENT SQL/RLS 147 assertions, separately HISTORICAL through010 300 assertions. Initial-to016 upgrade chain executed with preserved-data fixtures.
- PASS: actual Chrome against production Next/local disposable SQL gateway: 180 checks, zero uncaught JS errors. Ten routes at 320/390/430/768/844/1280. Full existing date/calendar/edit/delete/range/attendance-name flows, five-plan/date-only/edit/delete flows, persistent votes/withdrawal/recast, normal and new member restrictions, PIN-free actual handoff and old-leader revocation all passed.
- New actual-browser checks: confirmed repertoire separate from candidates; leader direct decision is selectable despite pending votes; unconfirm keeps existing plan song snapshots; deleting a rehearsal keeps repertoire available; member confirmation contains the target name, fits320/390/1280, cancel keeps membership, second explicit confirmation removes only the selected member and home refreshes from6 to5. Ordinary members have no confirmation controls.
- Home screenshots at390/1280 and removal dialog at390 were visually inspected. Screenshots/report saved locally in ignored .qa-artifacts/mobile. Final browser report contains180 checks.
- Limitations: disposable PGlite SQL/RLS plus simulated localhost Auth/REST, not hosted Supabase Auth/PostgREST/Realtime, physical iOS/Safari or real multi-connection Postgres concurrency. No hosted SQL/deployment/real user data/commit/push changed. Owned local QA servers stopped; final normal-environment build result follows in PROGRESS.

- Final normal-environment `npm.cmd run build` (no localhost QA env): PASS, 19 routes. Final `git diff --check`: PASS. Local QA gateway/Next processes stopped.
