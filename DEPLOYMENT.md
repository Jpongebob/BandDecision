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
