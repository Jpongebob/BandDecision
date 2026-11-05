# Deployment

The application is in `banddecision-web/`. Production deployment requires a Supabase project and a Vercel project connected to this repository. The current checkout has neither provider credentials nor a Vercel project link, so these steps have not been run against a live service.

## Supabase

1. Create a Supabase project and copy its project URL and publishable/anon key.
2. In Authentication URL Configuration, set the production Site URL and allow these callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-production-host>/auth/callback`
   - Add preview host callbacks only if preview authentication is needed.
3. From `banddecision-web/`, authenticate and link the project, then apply every migration in order:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   npx supabase test db
   ```

4. Configure the application environment variables below. Never put a service-role key in a browser-visible variable.

## Vercel

1. Import the GitHub repository and set **Root Directory** to `banddecision-web`.
2. Use `npm run build` as the build command. The project uses the standard Next.js output.
3. Add these variables to Preview and Production separately:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` in Production (the exact production origin, with no trailing slash)
   - Leave `NEXT_PUBLIC_SITE_URL` unset in Preview; server actions use Vercel's per-deployment `VERCEL_URL` for email callbacks and invite links.
4. Deploy a Preview first. Verify signup, email callback, login, password reset, band-scoped reads, member song permissions, date/vote ownership, and leader-only confirmation.
5. Add the final production callback URL in Supabase, then promote/deploy the verified revision to Production.

## Local production check

Copy `.env.example` to `.env.local`, fill in the Supabase values, then run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

The database pgTAP suite requires Supabase CLI and Docker. A successful local Next.js build does not validate remote authentication, RLS, RPCs, Realtime, or provider deployment.

## v3.2 migration on an existing deployment

The two original migrations were reported successful by the user. Apply only 202611050002_band_code_login.sql in SQL Editor (the file has a single transaction). For a CLI-managed project, use the normal migration history workflow; SQL Editor runs do not automatically register CLI migration history. Do not db push old migrations blindly onto a project initialized through SQL Editor.

Enable **Allow anonymous sign-ins** in Supabase Authentication settings, then redeploy the updated application. These sessions are mapped to a PIN-verified canonical member; raw anonymous sessions have no band access. Keep Supabase Auth rate limits enabled.

Keep the current Supabase URL and publishable/anon key. There is no new service-role credential. Production NEXT_PUBLIC_SITE_URL, Supabase Site URL, and allowed /auth/callback URLs still use the fixed production origin for legacy email login/reset/invites.

Existing band: leader uses /login/email → **밴드 관리** → enable code login; each member uses **내 정보** → set own PIN. The leader can set an initial PIN for another existing member and communicate it privately. New members enter the code/shared password and register their own profile; current round snapshots do not change.

Run lint, typecheck, unit/action tests, and build. Run npx supabase test db against a disposable/local Supabase database. Do not run test fixtures on the production database. The database suites cover canonical identity mapping, owner-only submissions/votes, leader-only administration, session revocation, rate limiting, and cross-band denial.

If the administrator PIN is lost, the Supabase project owner must reset its hash through SQL Editor. Never expose an administrator/service key or bypass this check in the client. Avoid bulk deletion of anonymous Auth users: anchor users own persistent band records. No automatic cleanup job is added.

## Shared password minimum length update

Shared band passwords now accept 4..64 characters (UTF-8 maximum 72 bytes). Personal and administrator PINs remain six digits. Apply the NEW 202611050003_shared_password_min4.sql after 202611050002_band_code_login.sql, then deploy the updated UI/server validation. Do not rerun either previously applied migration. Existing hashes and passwords remain valid.

## Code-based invite rollout

No new SQL is needed for the invite-flow correction. Redeploy the updated app and open the current production domain. In a code-enabled band, unlock admin access and generate a fresh 간편 초대 link under 밴드 관리. The new /login?code=... link pre-fills the band code; send the shared password separately. Previously issued /join/... links remain legacy email invitations and should be replaced for email-free onboarding. Existing profiles select their own PIN; newcomers register nickname, part and PIN after the shared-password gate.


## Availability/leadership correction (202611050004)
After the first four existing migrations have succeeded, run ONLY banddecision-web/supabase/migrations/202611050004_workflow_and_leadership.sql in Supabase SQL Editor, then push/redeploy the app. This fixes column reference x is ambiguous on quick-date submission as well as leadership handoff. Do not rerun earlier migrations; SQL Editor does not automatically reconcile CLI migration history. No new environment variable is required.

Under 밴드 관리, unlock administrator PIN, choose another active member, expand 밴드장 권한 넘기기, enter a new administrator PIN for code bands, and explicitly confirm. The recipient must already have a personal PIN; new admin PIN must differ. All administrator elevations reset, including the new leader's: privately send the new PIN to the recipient. Personal login and shared password remain valid; old leader becomes ordinary. Existing confirmed plans stay intact.

Before rollout: npm ci, npm run lint, npm run typecheck, npm test, npm run test:db, npm run build. test:db is isolated PGlite; never paste test fixtures into production. After rollout verify quick dates, parent/home links, two-device handoff, old-leader denial and new-leader unlock/finalization. Full GoTrue/PostgREST/Realtime/concurrency/viewport tests remain outstanding.

M_ID in 200.js is not identified by the supplied stack. Check the actual script URL in DevTools and test a private window without extensions; provide the complete deployed chunk URL if reproducible. M_ID is absent from this local source/build. Do not change SQL or disable access checks based solely on that console error.

Navigation optimizations preserve user checks and avoid shared-user caches. Actual deployed speed remains unmeasured; inspect RSC/server response duration and Vercel function/Supabase regional distance before changing hosting regions.


## Latest policy: no extra administrator unlock (005)
This supersedes earlier instructions to unlock administrator access before management/finalization. A signed-in active band leader can administer immediately; ordinary members remain restricted. Apply ONLY supabase/migrations/202611050005_leader_without_admin_unlock.sql after 004, then redeploy the UI/server changes. If 004 has not yet been applied, apply 004 first, then 005, each once. Do not rerun older files.
Existing personal/shared passwords and sessions remain intact. Individual session expiry/revocation still blocks access. Old administrator PIN hashes/fields are retained for compatibility; they no longer expire or gate leader administration. Existing PIN inputs on credential setup/transfer remain compatibility fields. No additional provider setting/environment secret is required. Live deployment and multi-device verification remain outstanding.


## Current onboarding: code-only (006)
After 005 succeeded, run ONLY banddecision-web/supabase/migrations/202611050006_retire_email_login_and_invites.sql once, then push/redeploy the application. Do not rerun prior successful migrations. Email login/signup/password reset/callback and /join/token routes are removed; use /login?code=... for invitations. Old email-invite RPCs and invite-table reads are denied; existing records are preserved.

Supabase account-owner step: disable the Email sign-in provider if still enabled; keep Allow anonymous sign-ins enabled for the current device sessions. Removing application routes does not modify hosted provider settings. No new environment secret is required. NEXT_PUBLIC_SITE_URL still supplies the fixed origin of code invite links; old Auth callback redirect URLs are unused by the app. This agent has not changed hosted provider settings or deployed these changes.

## Identity context / user test-band setup (007)
After 006 succeeds, run ONLY 202611050007_identity_context_and_test_band.sql once and deploy the matching app. Old identity response versions fall back safely but receive no query-count improvement. No new environment secret or Auth bypass is needed. /bands/test creates its fixtures only after the caller explicitly submits personal credentials; merely applying SQL does not create a shared public demo band. Use a private browser session if already in a real band. Fixture RPC adds no Auth users and rolls back on failure. Follow TEST_CASES.md.

Hosted creation and latency were not measured by the agent. Existing provider access/region limitations remain; do not assume a query-count reduction equals a particular response-time improvement.

## Strict input / reproduced bug corrections (008)
If 007 already succeeded, run ONLY 202611050008_strict_submission_inputs.sql once and deploy the app. This redefines availability/vote RPCs with strict reason type and null-choice validation. Existing data and ACLs are retained. No provider setting/environment secret is added. App corrections include refreshed form-version alignment, none/past dates, no editing for new members outside the round roster, and retryable data errors. Follow BUG_AUDIT.md; full live Auth/Realtime/concurrency checks remain outstanding.

## Five-person fixtures (009)
After 008, apply ONLY 009_multi_member_test_band (full filename 202611050009_multi_member_test_band.sql) and deploy. Existing exact baseline one-person fixture owners can expand from /bands/test; no need to delete the band. New creation automatically prepares all five. Keep anonymous sign-ins enabled. Four new Auth signup requests are made; provider rate limits are honored, and partial progress resumes without duplicating registered profiles. Public Supabase key only; no service-role/environment change required. Never blanket-delete anonymous anchors. Completed fixture edits and existing confirmed plans are preserved.


### 합주 계획 최대 5개 (010)
009까지 성공한 DB에는 202611050010_multiple_rehearsal_plans.sql만 한 번 실행한 뒤 앱을 재배포하세요. 009가 아직이면 009 → 010 순서로 적용합니다. 기존 SQL을 삭제하거나 다시 실행하지 않습니다. 기존 계획은 보존되며, 홈·합주 계획에서 날짜순으로 모두 확인합니다. 5개가 차면 밴드장만 삭제 동의 후 하나를 지우고 추가할 수 있습니다.
모바일 검사 범위와 로컬 재실행 방법은 루트 MOBILE_QA_REPORT.md를 참고하세요. 실제 Supabase SQL 적용·Vercel 배포는 이 작업에서 수행하지 않았습니다.
