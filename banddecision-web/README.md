> 최신 기능: 회차 없는 일정·투표, 날짜만 확정, 계획 수정/삭제는 011 마이그레이션과 함께 배포합니다. 009 중복 오류와 적용 순서는 루트 CONTINUOUS_PLANNING.md를 참고하세요. 아래 이전 배포 기록보다 이 안내가 우선합니다.

# BandDecision Web app

> Current onboarding (006): band code/shared password + personal PIN only. Email login/signup/reset and legacy token invitations have been removed. Reusable /login?code=... invites remain. Apply new 006 after 005, then redeploy; see DEPLOYMENT.md. Supabase Email-provider disabling is a separate owner configuration step; keep anonymous sign-ins enabled.

This folder contains the Next.js application. For setup and product behavior, see the repository [README](../README.md).

Install dependencies with `npm install`, configure `.env.local` from `.env.example`, apply the Supabase migrations, and start development with `npm run dev`.

## Band code and PIN login (v3.2)

The default flow is /bands/new to create a band, then /login (band code/shared password) followed by /login/member (existing profile + 6-digit PIN, or new nickname/part/PIN). The server issues a random 10-character band code. Member login lasts up to 30 days. Active leaders can manage members and confirm plans immediately after personal login.

Before using it:

1. Apply the NEW migration supabase/migrations/202611050002_band_code_login.sql once, after the two existing migrations. Do not rerun already-applied migrations.
2. In Supabase Authentication settings, enable **Allow anonymous sign-ins**. This provides device sessions only; it does not bypass the application's band/password/PIN checks. No service-role key is required.
3. Members use the band code/shared password and personal PIN. Leaders reset forgotten personal PINs under band management.
4. Deploy the updated code and verify real multi-device login, owner-only writes, leader-only actions, logout, and credential rotation.

Passwords and PINs are hashed in the private schema and never returned to the browser. PIN attempts are throttled across devices. Changing a personal PIN revokes that member's other device sessions. Rotating shared credentials revokes other code sessions; retired email login is unavailable. A leader can reset other member PINs while signed in as the current band leader.

Anonymous Auth users include the permanent anchor IDs referenced by band data. **Do not run blanket anonymous-user cleanup**: deleting an anchor can remove profiles and owned records. Administrator-PIN recovery requires the Supabase project owner; there is no public reset bypass.

Code-enabled bands use **간편 초대 링크 만들기** under **밴드 관리** to share /login?code=... links. These skip email signup, prefill the code, and require the shared password followed by member PIN/profile. Send the shared password separately. Replace previously issued /join/token email invitations with new code links. This correction requires no new SQL.


### Regression checks and leadership handoff
Run npm run test:db for disposable PostgreSQL/pgTAP tests, in addition to npm run lint, npm run typecheck, npm test and npm run build. Current run: 113 unit/action/component tests and 163 SQL assertions pass; see ../QA_REPORT.md and ../PROGRESS.md for scope. Hosted Auth/Realtime/concurrent connections and real device layouts are not covered by the in-memory runner.

Apply only the NEW supabase/migrations/202611050004_workflow_and_leadership.sql after the prior four migrations, then redeploy. It fixes the ambiguous x availability error. 밴드 관리 → administrator unlock → target member → 밴드장 권한 넘기기 requires explicit confirmation and, for code bands, a distinct new 6-digit admin PIN. Share that PIN privately with the recipient, who unlocks administration again. Old leader becomes a member; saved plans are preserved. Internal screens now include home/parent return links and streaming loading states.

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
- **밴드 관리 → 멤버 실력 기능**에서 밴드장이 켜고 끌 수 있습니다. 기존/새 밴드 모두 기본값은 꺼짐입니다. 꺼지면 멤버 실력 입력·표시·홈 안내를 숨기고, 추천 부담 계산과 실력 미설정 차단도 생략합니다. 기존 값은 보관하여 다시 켜면 사용합니다. 이후 020 적용 시 곡별 파트 난이도도 함께 끄며, 투표 조건은 유지합니다.
- 합주 계획 생성·수정의 **장소 (선택사항)**에 합주실 이름이나 주소를 입력합니다(최대200자). 나중에 수정하거나 비울 수 있습니다. 계획 목록과 홈에 표시되며, 기존 계획의 기본 장소는 비어 있습니다.
- 홈의 **다가오는 합주**가 내가 할 일보다 먼저 표시됩니다. 가장 가까운 합주의 날짜·시간·장소·곡을 바로 확인할 수 있습니다.
- 019는 구버전의 7개 인자 계획 저장 API를 보존합니다. 구버전에서 수정하더라도 이미 저장된 장소를 지우지 않습니다.


## 2026-11-06 곡 난이도도 실력 설정과 함께 전환 (020)
- 기존 **밴드 관리 → 멤버 실력 기능** 스위치를 함께 사용합니다. 기본값은 꺼짐이며, 꺼지면 후보곡·확정곡 목록의 난이도 요약과 곡 상세의 파트별 난이도 입력·수정 이력을 숨깁니다. 투표 수정·취소는 계속 사용할 수 있습니다.
- 꺼진 동안 후보곡 추천 및 새 계획의 곡 선택에는 실력/난이도 등록을 요구하지 않습니다. 현재 멤버 전원 응답·찬성 정족수는 유지합니다. 켜면 기존 실력·난이도 값과 추천 계산이 복구되며, 데이터는 삭제하지 않습니다.
- **019 다음에 `202611050020_optional_song_difficulty.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 화면만 배포하면 추천된 곡의 계획 저장이 구버전 DB 조건에 막힐 수 있습니다. 기존 마이그레이션은 다시 실행하지 않습니다.
- 확정곡의 추가 투표 생략, 저장된 계획의 곡 기록·장소, 기존 7개 인자 저장 API, 밴드장 권한·버전 검사·다가오는 계획 5개 제한은 유지합니다.


## 2026-11-06 합주 메모 (021)
- 합주 계획 생성·수정에 선택 메모(최대 2,000자)를 추가했습니다. 예: 지난 합주의 부족한 점, 이번 연습 목표, 준비할 내용. 밴드장만 저장·수정하며 멤버 모두 읽을 수 있습니다. 메모를 비우고 저장하면 삭제됩니다.
- 계획 목록/지난 계획에서는 줄바꿈을 유지해 전체 메모를 보여주고, 홈의 다가오는 합주에서는 최대 3줄로 미리 보여줍니다. 전체 내용은 합주 계획 전체 보기에서 확인합니다. 입력 내용은 일반 텍스트로 렌더링합니다.
- **020 다음에 `202611050021_rehearsal_plan_memo.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 기존 메모는 빈 상태로 시작합니다. 7/8개 인자를 받는 구버전 저장 API는 새 9개 인자 API로 연결되어, 구버전 화면의 수정이 메모를 지우지 않도록 했습니다.
- 계획 저장은 기존 요청 한 번에 메모를 함께 저장합니다. 별도 메모 조회/저장 요청은 없습니다. 합주 계획 화면의 인증 확인 뒤 추천 자료 조회를 사용자/기존 계획 조회와 병렬화하여 순차 대기를 줄였습니다. 운영 지연시간은 측정하지 않았으므로 속도 개선 수치는 제시하지 않습니다.


## 2026-11-06 화면별 조회 경량화 (022)
- **021 다음에 `202611050022_lean_screen_queries.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 새 곡 조회 RPC와 확장된 홈 응답을 함께 사용하므로 SQL/앱을 모두 반영해야 합니다. SQL021의 memo 열이 필요합니다.
- 홈: 요약 RPC에 예정 계획 개수/가장 가까운 계획 한 건을 포함했습니다. 기존 홈 요약 + 전체 예정 계획 조회(본문 데이터 요청 2회)를 요약 요청 1회로 합쳤습니다. 나머지 예정 계획의 곡/메모, 모든 참석자 스냅샷은 홈에서 가져오지 않습니다. 가까운 계획의 메모는 미리보기용 600자만 전송하며 전체 원문은 계획 화면에 유지합니다.
- 합주곡 목록/추천: `band_song_context(null)`에서 곡·현재 멤버·투표 조건에 필요한 값만 가져옵니다. 불참 일정, 난이도 수정 이력, 반대 사유 원문은 목록에서 제외합니다. 실력 기능 OFF이면 난이도 테이블 집계도 실행하지 않습니다.
- 곡 상세: `band_song_context(곡ID)`로 해당 밴드의 해당 곡 한 건만 가져옵니다. 필요한 반대 사유/난이도 편집 이력은 상세 응답에 포함합니다. 다른 곡 전체나 불참 일정을 가져오지 않습니다. 추천·투표·수정/삭제 기능은 유지합니다.
- 밴드 관리: 멤버 명단 조회와 접속 설정 조회를 Promise.all로 병렬화하고 받은 설정을 하위 컴포넌트에 전달합니다. 같은 설정을 다시 조회하지 않습니다. 계획 목록은 select(*) 대신 실제 사용하는 열만 지정했습니다. 사용처가 없어진 멤버 수/홈 계획 조회 helper는 제거했습니다.
- 서버의 인증된 Auth/개인 PIN 세션 확인과 밴드·역할 검사는 유지합니다. 사용자별 데이터를 전역 캐시에 저장하지 않습니다. 새 곡 RPC는 인증된 역할만 실행할 수 있고 canonical actor의 현재 밴드로 제한됩니다. 기존 저장 RPC와 공개 계약은 삭제하지 않았습니다.
- 검증: TypeScript·ESLint·프로덕션 빌드(19개 라우트)·diff 공백 검사 통과. 이 요청에서 테스트를 추가/실행하거나 SQL을 DB에 적용하지 않았습니다. 기존 검증용 응답 모형만 새 계약에 맞췄습니다. 운영/실기기 지연시간과 SQL/RLS 실행은 미검증이며, 요청 감소는 코드 경로 기준입니다. 초/퍼센트 단축을 측정했다고 주장하지 않습니다. 배포·커밋·push 없음.


## 2026-11-06 중복 UI 및 불필요한 재조회 정리
- 공통 이동 영역의 같은 목적지 버튼/링크를 하나의 Next Link로 합쳤습니다. 상세 화면에는 부모 목록으로 가는 뒤로 링크만, 최상위 메뉴에는 홈 링크만 보입니다. 홈 이동은 기본 메뉴에도 있습니다. 내비게이션 대기 중 임시 홈 링크가 나타났다 사라지는 fallback과 곡 추천 화면의 중복 목록 링크도 제거했습니다.
- 일반 멤버의 합주 계획 페이지는 현재 권한을 확인한 뒤 확정 계획/스냅샷만 조회합니다. 편집 UI에만 필요한 전체 멤버 일정·곡 투표·난이도 추천 RPC와 추천 계산을 생략합니다. 조회를 생략한 데이터는 null로 구분하며 임의의 빈 추천 결과를 만들어 편집기에 넘기지 않습니다. 밴드장은 기존 편집 자료와 계획을 병렬 조회합니다. 인증/밴드/역할/버전 검사는 유지합니다.
- LiveRefresh의 window.focus 이벤트를 제거했습니다. 키보드·팝업 이후 단순 포커스 복귀로 불필요한 router.refresh가 실행되지 않습니다. 실제 밴드 변경, 숨겨졌던 페이지의 복귀, Realtime 재연결에는 갱신하며 이벤트 묶음 처리와 unmount 정리를 유지합니다. 밴드가 없는 상태에서는 Realtime 클라이언트를 만들지 않습니다.
- 새 SQL은 없습니다. 기존 022까지 적용한 앱의 Git push/재배포로 반영합니다. 운영 응답시간은 측정하지 않았으며 모든 느림이 해소되었다고 단정하지 않습니다. 테스트를 새로 추가하거나 실행하지 않았고 기존 이동 검증의 모형/선택자만 실제 화면과 맞췄습니다.


## 2026-11-06 추가 중복 링크 정리 및 곡 화면 병렬 조회
- 최상위 메뉴의 보조 홈 링크를 제거했습니다(기본 메뉴의 홈 사용). 곡/날짜 추천·곡 상세·세부 설정에는 공통 뒤로 링크 한 개만 남깁니다. 날짜 추천의 합주 날짜 정하기, 곡 추천의 합주 계획으로 링크는 기본 합주 계획 메뉴와 중복되어 제거했습니다. 상세의 곡 제목은 현재 화면으로 재이동하지 않는 제목으로 바꿨습니다. 홈의 합주 계획 전체 보기와 다른 기능으로 들어가는 추천 버튼 등 실제 작업 진입점은 유지합니다.
- 곡 목록/추천/상세도 loadVerifiedPlanningPage의 songs 모드를 사용합니다. 검증된 Auth 확인 뒤 canonical 사용자/멤버 확인과 경량 곡 RPC를 동시에 진행합니다. 결과의 밴드 일치 검사는 유지하며 인증 전 private RPC 호출이나 사용자 전역 캐시는 도입하지 않습니다. 곡 상세는 안전한 양의 정수 ID만 허용합니다.
- 이번 변경은 기존022의 band_song_context를 사용하므로 새 SQL은 없습니다. 022까지 적용한 뒤 앱을 재배포합니다. 운영 응답시간 측정과 브라우저/SQL/단위 테스트 실행은 하지 않았습니다. 기존 이동/미투표 페이지 검증용 모형만 새 경로에 맞췄습니다. 기존 조회 helper는 호출자와 검증 코드의 호환성을 위해 유지합니다.
