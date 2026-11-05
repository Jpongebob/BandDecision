# BandDecision Web app

This folder contains the Next.js application. For setup and product behavior, see the repository [README](../README.md).

Install dependencies with `npm install`, configure `.env.local` from `.env.example`, apply the Supabase migrations, and start development with `npm run dev`.

## Band code and PIN login (v3.2)

The default flow is /bands/new to create a band, then /login (band code/shared password) followed by /login/member (existing profile + 6-digit PIN, or new nickname/part/PIN). The server issues a random 10-character band code. Member login lasts up to 30 days. Leaders unlock management and confirmation for 30 minutes with a separate administrator PIN.

Before using it:

1. Apply the NEW migration supabase/migrations/202611050002_band_code_login.sql once, after the two existing migrations. Do not rerun already-applied migrations.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. This provides device sessions only; it does not bypass the application's band/password/PIN checks. No service-role key is required.
3. Existing email members use /login/email, set a personal PIN under **내 정보**, and the leader enables code login under **밴드 관리**. Existing records keep their IDs. Do not create a duplicate band/profile for migration.
4. Deploy the updated code and verify real multi-device login, owner-only writes, admin elevation, logout, and credential rotation.

Passwords and PINs are hashed in the private schema and never returned to the browser. PIN attempts are throttled across devices. Changing a personal PIN revokes that member's other device sessions. Rotating shared credentials revokes other code sessions; email login remains available to existing accounts. A leader can reset other member PINs after administrator verification.

Anonymous Auth users include the permanent anchor IDs referenced by band data. **Do not run blanket anonymous-user cleanup**: deleting an anchor can remove profiles and owned records. Administrator-PIN recovery requires the Supabase project owner; there is no public reset bypass.

Code-enabled bands use **간편 초대 링크 만들기** under **밴드 관리** to share /login?code=... links. These skip email signup, prefill the code, and require the shared password followed by member PIN/profile. Send the shared password separately. Replace previously issued /join/token email invitations with new code links. This correction requires no new SQL.


### Regression checks and leadership handoff
Run npm run test:db for disposable PostgreSQL/pgTAP tests, in addition to npm run lint, npm run typecheck, npm test and npm run build. Current run: 113 unit/action/component tests and 163 SQL assertions pass; see ../QA_REPORT.md and ../PROGRESS.md for scope. Hosted Auth/Realtime/concurrent connections and real device layouts are not covered by the in-memory runner.

Apply only the NEW supabase/migrations/202611050004_workflow_and_leadership.sql after the prior four migrations, then redeploy. It fixes the ambiguous x availability error. 밴드 관리 → administrator unlock → target member → 밴드장 권한 넘기기 requires explicit confirmation and, for code bands, a distinct new 6-digit admin PIN. Share that PIN privately with the recipient, who unlocks administration again. Old leader becomes a member; saved plans are preserved. Internal screens now include home/parent return links and streaming loading states.

### Current leader policy (005)
A signed-in active band leader can immediately manage members, invite, start rounds and finalize plans; no separate administrator PIN unlock or 30-minute window is required. Apply migration 202611050005_leader_without_admin_unlock.sql after 004 and redeploy. Ordinary-member, cross-band and personal-session checks remain. Latest local run: 115 tests and 175 PostgreSQL assertions passed; see PROGRESS.md/DEPLOYMENT.md for rollout and live verification limits.
