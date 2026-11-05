> 최신 기능: 회차 없는 일정·투표, 날짜만 확정, 계획 수정/삭제는 011 마이그레이션과 함께 배포합니다. 009 중복 오류와 적용 순서는 루트 CONTINUOUS_PLANNING.md를 참고하세요. 아래 이전 배포 기록보다 이 안내가 우선합니다.

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


## 화면 로딩 최적화 적용 (012)
011까지 성공했다면 `banddecision-web/supabase/migrations/202611050012_loading_performance.sql`만 Supabase SQL Editor에서 한 번 실행하고, 최신 앱을 Vercel에 재배포하세요. 일정/날짜 추천 화면은 새 조회 함수를 사용하므로 SQL을 먼저 적용합니다. 이미 성공한 기존 SQL은 다시 실행하거나 삭제하지 않습니다.

일정 화면의 곡·투표 조회, 홈의 전체 멤버/계획 상세 조회, 밴드 관리의 중복 멤버 조회를 줄였습니다. 로그인 검증과 밴드별 접근 권한은 유지합니다. 실시간 갱신은 현재 밴드의 변경만 구독합니다. 로컬 5인 브라우저 검사에서는 큰 시간 단축까지 입증되지는 않았으며, 배포 후에도 오래 걸리면 실제 요청 시간과 Vercel/Supabase 리전을 확인해야 합니다. 이 작업에서 실제 배포나 운영 DB 실행은 하지 않았습니다.


## 달력 선택·곡 상세·내 투표 취소 (013)
012까지 성공한 DB에는 `banddecision-web/supabase/migrations/202611050013_withdraw_song_vote.sql`을 한 번 실행한 뒤 최신 앱을 재배포합니다. 012가 아직이라면 012 → 013 순서로 적용하세요. 기존 SQL을 다시 실행하거나 삭제하지 않습니다. 013은 내 투표 취소 함수만 추가합니다. 합주계획의 곡 추천·선택 조건은 변경하지 않습니다.

곡 목록에서 제목 또는 '곡 상세 · 투표 수정'을 누르면 상세페이지에서 난이도와 내 투표를 수정·취소할 수 있습니다. 합주 날짜는 참석 인원이 표시된 월별 팝업 달력에서, 불가능한 날짜는 여러 날짜/기간 선택 달력에서 고릅니다. PIN/밴드 코드 공백은 자동 제거하고, 공용 비밀번호는 앞뒤 공백만 정리합니다.


## 불참 사유 제거 (014)
013 다음에 `banddecision-web/supabase/migrations/202611050014_dates_without_reasons.sql`을 한 번 실행하고 재배포합니다. 이 SQL은 기존 일정 및 확정 계획에 남은 불참 사유 값을 삭제하고 이후 저장도 막습니다. 날짜는 그대로 유지합니다. 이전 SQL 호환용 빈 컬럼만 남으며 기존 사유 내용은 보존하지 않습니다. 곡 투표의 반대 사유는 별도로 유지합니다.


## 관리자 PIN 제거·지난 합주 보관·실력 미설정·홈 할 일 (015)
014까지 성공한 DB에 `banddecision-web/supabase/migrations/202611050015_simplified_band_workflow.sql`을 한 번 실행하고 앱을 재배포하세요. 이전 SQL은 다시 실행하거나 삭제하지 않습니다.

밴드 생성/비밀번호 변경/권한 이전에서 관리자 PIN을 받지 않습니다. 개인 로그인 PIN은 유지합니다. 한국 날짜 기준 지난 계획은 기록으로 보관하고, 오늘 이후 예정 계획만 최대 5개입니다. 지난 기록은 삭제 없이 유지되며 밴드장은 필요할 때 명시적으로 삭제할 수 있습니다.

새 멤버의 실력은 미설정으로 시작합니다. 기존 실력 값은 보존합니다. 밴드장이 실력을 설정하면 곡 부담 점수와 추천이 계산됩니다. 미설정 중에도 날짜만 정할 수 있습니다. 홈의 할 일에서 미투표 곡·다가오는 합주·내 불참 일정·실력 설정을 확인합니다.


## 2026-11-06 확정곡과 멤버 내보내기 확인
- 합주곡 상세에서 밴드장이 `이 곡 확정`을 누르면 합주곡 화면의 별도 `확정곡` 목록에 보관합니다. 확정곡은 추천 조건과 별개로 밴드장이 결정한 레퍼토리이며 합주 계획 생성/수정에 선택할 수 있습니다. 일반 후보곡의 기존 추천 조건은 그대로입니다.
- `확정 목록에서 삭제`는 후보 상태로 되돌립니다. 곡/투표를 지우지 않으며, 이미 저장된 계획의 곡 스냅샷도 유지합니다. 계획 삭제는 레퍼토리 상태에 영향을 주지 않습니다.
- 멤버 내보내기를 누르면 `OOO님을 내보내겠습니까?` 대화상자를 표시합니다. 취소/ESC는 실행하지 않고 `내보내기 확인`을 누를 때만 서버 작업을 요청합니다. 서버 액션은 명시적 확인 및 UUID를 검사하며, DB는 기존 활성 밴드장 권한을 검증합니다.
- **적용 순서:** 기존 014까지 적용되어 있다면 `202611050015_simplified_band_workflow.sql` → `202611050016_confirmed_songs.sql`을 각각 한 번 실행한 뒤 앱을 재배포하세요. 이미 적용한 이전 SQL은 삭제하거나 다시 실행하지 않습니다. 015를 이미 실행했다면 016만 실행하면 됩니다.
- 015 포함 내용: 관리자 PIN 절차 제거(개인 PIN 유지), 지난 합주 자동 보관 및 예정 계획만 최대 5개, 새 멤버 실력 미설정, 홈 할 일/다가오는 합주/내 저장 날짜. 기존 수치 실력은 보존합니다.


## 2026-11-06 프로필·PIN 화면으로 시작하기 (017)
1. `202611050017_optional_direct_band_entry.sql`을 016 다음에 한 번 실행하고 앱을 재배포합니다. 기존 로그인 코드는 보존되어 있습니다.
2. 밴드장으로 로그인 → **밴드 관리 → 사이트 시작 화면 → 프로필 시작 화면 켜기**.
3. 이후 로그아웃 상태에서 사이트 주소 또는 `/login`을 열면 해당 밴드의 프로필 선택·개인 PIN 화면이 바로 나옵니다. 별도 입장 버튼이나 코드·공용 비밀번호 입력이 없습니다.
4. **프로필 시작 화면 끄기**를 누르면 기존 방식으로 복귀합니다. 이미 PIN 인증을 마친 기기의 로그인은 유지됩니다. `/login?standard=1`로 기존 코드 입력 화면에 직접 접근할 수도 있습니다.
- 기본값은 꺼짐입니다. 한 사이트에서 한 밴드만 시작 화면으로 지정할 수 있습니다. 다른 밴드가 이미 지정되어 있으면 덮어쓰지 않습니다.
- 켜면 사이트 방문자가 그 밴드의 최소 멤버 목록(닉네임/파트/역할/PIN 설정 여부)을 보고 새 프로필을 만들 수 있습니다. 기존 프로필 접근은 6자리 개인 PIN 검증과 기존 시도 제한/세션 만료를 그대로 적용합니다. PIN/해시/공용 비밀번호는 공개되지 않습니다.
- 페이지를 열기만 할 때 익명 사용자나 입장 세션을 만들지 않습니다. PIN 로그인 또는 프로필 생성 제출 때 서버가 현재 설정을 다시 확인하고 인증합니다. 설정을 끄면 진행 중인 코드 생략 입장 권한은 폐기되어 이전 화면으로 재시도할 수 없습니다.


## 2026-11-06 곡 삭제 / 확정곡 투표 생략 (018)
- `202611050018_delete_band_song.sql`을 017 다음에 한 번 실행하고 앱을 재배포합니다.
- 밴드장은 **합주곡 → 곡 상세 → 곡 삭제 → 삭제 확인**으로 후보곡이나 확정곡 자체를 삭제할 수 있습니다. 취소하면 변경하지 않습니다. 해당 곡의 투표·반대 사유·난이도도 함께 삭제되며, 이미 저장한 합주 계획의 곡 기록은 보존합니다.
- `확정 목록에서 삭제`는 후보로 되돌리는 기존 동작이고, `곡 삭제`는 곡 자체를 삭제하는 동작입니다.
- 확정곡은 추가 투표가 필요 없습니다. 투표 입력과 미응답 안내를 표시하지 않으며, 홈 미투표 개수·미투표 목록·후보곡 추천 대기에서도 제외합니다. 합주 계획에서는 투표·난이도 조건과 관계없이 바로 선택할 수 있습니다. 확정 해제 시 기존 투표를 다시 사용합니다.


## 2026-11-06 달력 2개월 제한 및 키보드 수정
- 모든 날짜 선택 달력은 **이번 달과 다음 달**만 표시합니다. 날짜 추천과 계획의 자동 추천 날짜도 동일한 범위입니다. 예: 11월에는 11~12월, 12월에는 12월~다음 해 1월. 단순한 앞으로60일 범위와 다릅니다.
- 이전에 저장한 일정/계획을 삭제하거나 날짜를 바꾸지 않습니다. 범위 밖 기존 날짜도 목록/계획에 보존하며, 달력에서 새로 변경할 날짜만 위 범위에 한정합니다.
- 방향키가 저장된 비활성 날짜에서 멈추는 문제, PageUp/PageDown이 월 이동 제한을 우회하는 문제를 수정했습니다. 월이 바뀌어도 키보드 초점이 이어지고 짧은 달 말일로 이동할 때 날짜를 조정합니다.
- 이번 변경은 앱 재배포로 반영됩니다. 새 SQL 마이그레이션은 없습니다.


## 2026-11-06 실력 on/off와 합주 장소 (019)
- 018 다음에 `202611050019_optional_skill_and_plan_location.sql`을 한 번 실행하고 앱을 재배포합니다.
- **밴드 관리 → 멤버 실력 기능**에서 밴드장이 켜고 끌 수 있습니다. 기존/새 밴드 모두 기본값은 꺼짐입니다. 꺼지면 멤버 실력 입력·표시·홈 안내를 숨기고, 추천 부담 계산과 실력 미설정 차단도 생략합니다. 기존 값은 보관하여 다시 켜면 사용합니다. 곡별 파트 난이도·투표 조건은 유지합니다.
- 합주 계획 생성·수정의 **장소 (선택사항)**에 합주실 이름이나 주소를 입력합니다(최대200자). 나중에 수정하거나 비울 수 있습니다. 계획 목록과 홈에 표시되며, 기존 계획의 기본 장소는 비어 있습니다.
- 홈의 **다가오는 합주**가 내가 할 일보다 먼저 표시됩니다. 가장 가까운 합주의 날짜·시간·장소·곡을 바로 확인할 수 있습니다.
- 019는 구버전의 7개 인자 계획 저장 API를 보존합니다. 구버전에서 수정하더라도 이미 저장된 장소를 지우지 않습니다.
