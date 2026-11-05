> 최신 기능: 회차 없는 일정·투표, 날짜만 확정, 계획 수정/삭제는 011 마이그레이션과 함께 배포합니다. 009 중복 오류와 적용 순서는 루트 CONTINUOUS_PLANNING.md를 참고하세요. 아래 이전 배포 기록보다 이 안내가 우선합니다.

# BandDecision Web

> Current onboarding (006): band code/shared password + personal PIN only. Email login/signup/reset and legacy token invitations have been removed. Reusable /login?code=... invites remain. Apply new 006 after 005, then redeploy; see DEPLOYMENT.md. Supabase Email-provider disabling is a separate owner configuration step; keep anonymous sign-ins enabled.

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

The default flow is /bands/new to create a band, then /login (band code/shared password) followed by /login/member (existing profile + 6-digit PIN, or new nickname/part/PIN). The server issues a random 10-character band code. Member login lasts up to 30 days. Active leaders can manage members and confirm plans immediately after personal login.

Before using it:

1. Apply the NEW migration banddecision-web/supabase/migrations/202611050002_band_code_login.sql once, after the two existing migrations. Do not rerun already-applied migrations.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. This provides device sessions only; it does not bypass the application's band/password/PIN checks. No service-role key is required.
3. Members use the band code/shared password and personal PIN. Leaders reset forgotten personal PINs under band management.
4. Deploy the updated code and verify real multi-device login, owner-only writes, leader-only actions, logout, and credential rotation.

Passwords and PINs are hashed in the private schema and never returned to the browser. PIN attempts are throttled across devices. Changing a personal PIN revokes that member's other device sessions. Rotating shared credentials revokes other code sessions; retired email login is unavailable. A leader can reset other member PINs while signed in as the current band leader.

Anonymous Auth users include the permanent anchor IDs referenced by band data. **Do not run blanket anonymous-user cleanup**: deleting an anchor can remove profiles and owned records. Administrator-PIN recovery requires the Supabase project owner; there is no public reset bypass.

Code-enabled bands use **간편 초대 링크 만들기** under **밴드 관리** to share /login?code=... links. These skip email signup, prefill the code, and require the shared password followed by member PIN/profile. Send the shared password separately. Replace previously issued /join/token email invitations with new code links. This correction requires no new SQL.

## Latest workflow/handoff update
The availability SQL alias bug and safe leadership transfer are fixed in the new 202611050004_workflow_and_leadership.sql; apply it after the existing four migrations and redeploy. Internal screens now include home/parent return controls and loading boundaries. Actual local verification: 113 unit/UI/action tests, 163 PostgreSQL assertions, lint, typecheck and production build passed. See [QA report](QA_REPORT.md), [progress](PROGRESS.md) and [rollout](DEPLOYMENT.md) for limits and instructions.

### Current leader policy (005)
A signed-in active band leader can immediately manage members, invite, start rounds and finalize plans; no separate administrator PIN unlock or 30-minute window is required. Apply migration 202611050005_leader_without_admin_unlock.sql after 004 and redeploy. Ordinary-member, cross-band and personal-session checks remain. Latest local run: 115 tests and 175 PostgreSQL assertions passed; see PROGRESS.md/DEPLOYMENT.md for rollout and live verification limits.

### Test band and identity optimization (007)
Apply only new 202611050007_identity_context_and_test_band.sql after 006 and redeploy. Open /bands/test (or login → 테스트 밴드 체험) in a private window; choose your nickname/shared password/personal PIN. The new separate one-member band logs you in as leader and contains four song scenarios plus dates. Your real band is preserved. See TEST_CASES.md in the repository root.

Identity RPC now includes verified member/band context, avoiding two follow-up database requests. Auth verification is retained and no global user cache is used. Latest checks: 111 tests, 221 PostgreSQL assertions, lint/typecheck and 19-route build passed; actual hosted latency remains unmeasured.

### Regression repairs (008)
Apply only new 202611050008_strict_submission_inputs.sql after 007, then redeploy. Repaired date-none/past-date entry, refreshed difficulty/vote state, round roster editing and partial-read error handling. Latest evidence: 139 tests, 232 SQL assertions, lint/typecheck and 19-route build passed. Public Chrome rendering/retired-route checks executed; hosted authenticated testing remains unverified. See BUG_AUDIT.md in the repository root.

### Five-member test band (009)
Apply only new 202611050009_multi_member_test_band.sql after 008 and deploy. A new /bands/test fixture contains you as leader plus four PIN-protected ordinary profiles. Existing original one-person fixture owners can open the same page and use '테스트 멤버 추가하고 5인 회차 준비'. Choose a shared demo PIN different from your own. Use another browser/device to select each demo profile. See TEST_CASES.md; hosted Auth provisioning remains unverified.


### 합주 계획 최대 5개 (010)
009까지 성공한 DB에는 202611050010_multiple_rehearsal_plans.sql만 한 번 실행한 뒤 앱을 재배포하세요. 009가 아직이면 009 → 010 순서로 적용합니다. 기존 SQL을 삭제하거나 다시 실행하지 않습니다. 기존 계획은 보존되며, 홈·합주 계획에서 날짜순으로 모두 확인합니다. 5개가 차면 밴드장만 삭제 동의 후 하나를 지우고 추가할 수 있습니다.
모바일 검사 범위와 로컬 재실행 방법은 루트 MOBILE_QA_REPORT.md를 참고하세요. 실제 Supabase SQL 적용·Vercel 배포는 이 작업에서 수행하지 않았습니다.
