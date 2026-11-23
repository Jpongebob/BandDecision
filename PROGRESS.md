# BandDecision Web Progress

### 2026-11-23 멤버별 일정 화면 공동작업 병합
- 원격 feat/member-availability의 b00e672 검토 후 master에 충돌 없이 병합. 밴드장용 멤버별 가능 날짜 화면, 모바일 멤버 선택 달력/PC 4주 표, 월별 미응답 판단 및 날짜 입력 요청 문구 공용화 포함. 추가 SQL 없음.
- 전체 테스트 51개 파일 332개, 린트/프로덕션 빌드 통과. 임시 DB와 로컬 브라우저에서 320/390/768/1024/1280/1440px의 보기 전환·멤버 선택·월/4주 이동 검사, JS 예외 0. 내 일정이 멤버별 보기에서 숨겨지는 것 확인.
- 작은 PC 표의 날짜가 두 줄로 갈라지는 문제를 스크린샷에서 확인해 날짜 칸 최소 너비와 표 내부 가로 스크롤 보완. 운영 DB/환경 파일 변경 없음. 실제 휴대기기 미검증.

### 2026-11-13 PC·모바일 추가 QA 및 폼 오류 수정
- 기준 508e0b3 및 원격 master 일치 확인. 사용자 요청에 따라 로컬 프로덕션 서버/임시 DB에서 추가 검사. 운영 데이터와 .env.local 변경 없음.
- 곡 수정 실패 시 React 자동 reset으로 수정한 제목·가수가 사라지는 문제를 테스트 실패 및 PC/모바일 브라우저로 재현. 초안을 보존하도록 수정하고 재시도 저장·새로고침 후 값 유지까지 확인.
- 390×320 화면에서 곡 추가·수정 팝업의 저장 버튼이 잘리고 스크롤되지 않는 문제 수정. 공통 sheet에 세로 스크롤 허용. PC 휠과 모바일 터치 스와이프로 추가·수정·삭제 팝업의 하단 버튼 접근 확인.
- 단위/컴포넌트/액션 50개 파일 325개 통과, 린트 및 타입 검사 포함 QA 빌드 통과. 반응형 40개 조합과 PC 상세 동작 4개 검사 통과. 상세 근거는 UI_QA_20261113.md.
- 추가 SQL 없음. 실제 휴대기기 Safari/소프트 키보드/캘린더 앱과 운영 Auth/Realtime은 미검증.
- 2026-11-15 재개: 모바일 전체 사용 흐름 최종 225개 통과 및 JS 예외 0 확인. 일반 환경 빌드·전체 325개 테스트·린트 재확인 후 한국어 커밋/푸시. QA 서버 종료 상태 확인.

### 2026-11-12 PC·모바일 전체 QA 및 오류 수정
- 사용자 요청으로 최신 PC 개편을 로컬 Next 프로덕션 서버 + 임시 PGlite DB에서 검사. 운영 DB/환경 파일 변경 없이 실제 Chrome의 PC 마우스·키보드와 모바일 터치 에뮬레이션 사용.
- 재현 후 수정: 1024px 곡 표 잘림, 작은 PC 합주 상세의 과도한 줄바꿈, 투표 저장 실패 후 잘못된 선택 강조, 반대 사유 저장 실패 후 입력 손실. 작은 PC 배치를 조정하고 투표 오류 시 저장된 값/입력 초안을 보존.
- 단위/컴포넌트/액션 49개 파일 324개 통과. SQL 현재 기능 323개 + 역사적 보존 300개 통과. PC 전체 234개, 수정본 모바일 전체 225개 브라우저 검사 통과, 각각 처리되지 않은 JS 예외 0. 최초 모바일 전체 273개도 통과.
- 별도 320/390/430/768/1024/1152/1280/1440px의 5개 화면 조합 40개에서 긴 장소·메모의 레이아웃 확인. PC 선택 상세의 투표 유지·계획 수정·선택 계획 삭제 등 4개 집중 검사 통과. 스크린샷 육안 확인 포함.
- 회귀 검사 추가: 실패한 투표/사유 초안과 재시도, iPhone/iPadOS URL 이동 방지·파일 공유, PC 계획 선택/삭제/지난 합주/빈 상태. QA에 표 내부 잘림 검사와 실제 1024/1152px 검사 추가.
- 운영 테스트 RPC 차단 수동 SQL은 별도 로컬 DB에서 네 함수 실행 권한 제거 확인. 운영 적용 여부는 확인하지 않음. 추가 배포 SQL 없음.
- 상세 범위·근거는 UI_QA_20261112.md. 실제 iPhone Safari/Chrome·Calendar·Mail 및 hosted Auth/Realtime·다중 PostgreSQL 연결 동시성은 이번 검사의 범위에 포함하지 않음. QA 서버 종료 후 일반 설정의 최종 빌드/린트/타입 검사 확인.

### 2026-11-12 공동작업자 PC 목록·상세 화면 병합
- 사용자 요청으로 원격 feat/pc-master-detail의 커밋 6329ecd를 검토 후 master에 병합. 작업 전 변경 파일 없고 충돌 없음.
- PC 합주 계획은 왼쪽 목록과 선택한 상세, 곡은 표와 선택한 곡의 투표/정보, 일정은 달력과 멤버별 현황으로 배치. 공용 수정·참석·삭제 팝업을 모바일/PC 버튼에서 열도록 연결. 투표 막대·평균 난이도 계산 공용화 및 PC 사이드바 정리 포함.
- 기존 테스트 체험 차단 코드 유지. 추가 SQL/운영 DB 변경 없음. 프로덕션 빌드(타입 검사 포함), ESLint, staged diff 공백 검사 통과. 이번 요청에서 단위/DB/브라우저 테스트 및 실제 화면 확인은 실행하지 않음.

### 2026-11-12 공동작업자 홈 합주 배치 정리 병합
- 사용자 요청으로 원격 fix/home-later-plans의 2개 커밋(0126212, ffc8c80)을 검토 후 master에 병합. 작업 전 변경 파일 없고 충돌 없음.
- 다가오는 합주의 참석 인원을 날짜·D-day 줄 오른쪽으로 이동. 그다음 합주의 날짜/참석, 시간·장소 아이콘, 곡 표시 순서를 통일. 관련 로컬 브라우저 QA 스크립트 갱신도 포함.
- 추가 SQL 및 운영 DB 변경 없음. 프로덕션 빌드(타입 검사 포함), ESLint, staged diff 공백 검사 통과. 이번 요청에서 단위/DB/브라우저 테스트는 실행하지 않음.

### 2026-11-11 공동작업자 입력창·홈 곡 표시 후속 변경 병합
- 사용자 요청으로 원격 fix/plan-form-followups의 3개 커밋(28cb926, 19fdfaa, cb50144)을 검토 후 master에 병합. 작업 전 변경 파일 없고 충돌 없음.
- 확정일의 가능 등록 인원이 0명이어도 수정 달력에서 원래 날짜로 돌아갈 수 있도록 보완. 새 합주 저장 후 입력 초기화, 수정 계획의 새 버전 반영, 날짜 이동 안내 추가.
- 029 홈 합주 곡 제목 응답과 홈 일부 곡/+N곡 표시, 계획 카드 곡 전체 표시, 평균 난이도/저장 문구/설정 명칭, 공유 들여쓰기 및 PC 캘린더 버튼 숨김 포함. 기존 테스트 체험 차단 정책 유지하고 관련 테스트/로컬 QA 안내 갱신.
- 029의 count(*)와 조회 범위(private.actor_id 기반 본인 밴드 조회)를 검토. 앞서 사용자에게 제공한 029 SQL과 같은 동작. 운영 DB에는 실행하지 않았고, 이미 적용했다면 중복 실행 불필요.
- 프로덕션 빌드(타입 검사 포함), ESLint 통과. 공동작업 코드의 공백 1곳 정리. 이번 요청에서 단위/DB/브라우저 테스트는 실행하지 않음.

### 2026-11-11 운영 테스트 체험 차단
- 사용자 요청으로 로그인 화면의 공개 테스트 체험 링크를 기본 제거하고 /bands/test 직접 접근은 DB 조회 전에 notFound 처리. 테스트 밴드 생성/멤버 추가 Server Action 및 하위 준비 함수도 DB/Auth 접근 전에 차단.
- 로컬 QA 유지: ENABLE_TEST_BANDS=true와 loopback Supabase 주소를 모두 설정해야만 허용. 실제 hosted Supabase에서는 플래그를 켜도 거부. .env.example/README에 정책과 로컬 설정 기록.
- 직접 Supabase RPC 호출 차단용 운영 수동 SQL supabase/manual/disable_public_test_band_access.sql 추가. create_test_band/register_test_member/prepare_test_band/test_band_setup_status의 PUBLIC·anon·authenticated EXECUTE 제거 및 권한 확인 조회 포함. 기존 데이터 삭제 없음. 운영 DB에는 실행하지 않았으므로 SQL 적용은 별도 필요.
- 프로덕션 빌드(타입 검사 포함), ESLint, diff 공백 검사 통과. 이번 요청에서 단위/DB/브라우저 테스트는 추가하거나 실행하지 않음.

### 2026-11-11 공동작업자 계획 수정·화면 보완 병합
- 사용자 요청으로 원격을 갱신하고 fix/plan-edit-and-polish의 5개 커밋(6c95404~9ed5ba3)을 검토 후 master에 병합. 작업 전 변경 파일 없었으며 충돌 없음.
- 028은 같은 날짜 수정 시 확정 참석자 스냅샷/인원을 보존. 저장 화면도 같은 기준으로 표시하고 실제 변경이 있을 때만 저장 활성화. 날짜 변경 시 참석 재계산/부분 참석 동의 유지. SQL의 count(*) 정상 확인; 앞서 사용자에게 제공한 수정 SQL과 같은 동작.
- 계획 카드의 삭제 버튼/확인 팝업, 밴드·참석자·곡 정보를 포함한 공유 문구, PC 현재 메뉴 표시, 지난 날짜 체크 표시 제거 포함. 기존 아이폰 파일 공유 처리와 기기별 버튼 문구 유지.
- 프로덕션 빌드(타입 검사 포함), ESLint 및 staged diff 공백 검사 통과. 이번 요청에서는 단위/DB/브라우저 테스트를 실행하지 않음. 공동작업자가 추가한 테스트와 QA 스크립트는 함께 병합.
- 운영 DB에는 SQL을 실행하지 않음. 서울 DB에 028 적용이 필요하며, 앞서 드린 수정 SQL을 이미 적용했다면 중복 실행은 불필요.

### 2026-11-09 캘린더 선택 버튼 문구 정리
- 기기별로 고르기 쉽도록 버튼을 'Google 캘린더 · 갤럭시', 'Apple 캘린더 · 아이폰'으로 변경. Google 캘린더가 갤럭시 전용이라는 잘못된 제한 표현은 사용하지 않음.
- 기존 테스트의 버튼 이름 참조도 동기화. 문구 수정만 수행했으며 테스트는 추가하거나 실행하지 않음.

### 2026-11-09 아이폰 일정 URL 열기 실패 후속 수정
- 사용자가 아이폰의 Safari 스타일 창에서 'Safari가 이 파일을 다운로드할 수 없습니다' 오류를 제보. 앞선 HTTP inline 일정 URL만으로는 해당 환경의 가져오기 문제가 해결되지 않았음을 확인.
- iPhone/iPad/iPod 및 데스크톱 모드 iPad의 Apple·기타 캘린더 링크는 기본 이동을 취소하고 같은 탭 이벤트에서 파일 공유 실행. 공유 미지원/실패 시 일정 URL로 재이동하지 않고 화면에 안내. PC/Android는 기존 인증된 일정 URL 유지.
- Chrome에서 Safari로 파일을 직접 열면 해결된다는 안내를 제거. Apple 기본 Mail에 본인에게 보낸 첨부파일을 열어 가져오는 절차를 안내하고, 공유 메뉴가 캘린더 앱으로 바로 연결된다고 보장하지 않음.
- Next 프로덕션 빌드(타입 검사 포함) 통과. 이번 후속 수정에서 테스트 추가/실행 및 실제 아이폰 공유·Mail 가져오기 검증은 하지 않음. DB/SQL 변경 없음.

### 2026-11-09 아이폰 Chrome 캘린더 추가 호환
- 파일 다운로드만 하던 캘린더 버튼을 Google 캘린더, Apple·기타 캘린더 URL, 일정 파일 공유 선택 화면으로 변경. 아이폰 Chrome에서 다운로드만 되는 경우 Safari 재시도와 Apple 기본 Mail 첨부파일 가져오기 안내 제공.
- 일정 URL은 PIN 인증한 현재 밴드 멤버만 조회 가능. 비로그인 401, 다른 밴드 404, private/no-store 및 inline text/calendar 응답. 공개 일정이나 운영 DB 변경 없음. 추가 SQL 불필요.
- 공유 파일과 Google 링크의 한국 시간을 UTC로 일치시키고 자정/연말 넘김 처리. ICS의 CRLF 이스케이프와 UTF-8 75바이트 줄 접기로 긴 한글·이모지 메모 보존.
- lint, 타입 검사, 43개 파일 292개 테스트 및 프로덕션 빌드 통과. 임시 로컬 DB와 Chrome에서 일정 생성, 일정 URL의 인증/밴드 제한, 파일 내용, Google 링크 및 320/390/1280px 화면 확인. 처리되지 않은 JS 오류 없음.
- 실제 아이폰 Chrome/Safari와 Apple 캘린더의 네이티브 가져오기 동작은 실기기 미검증. 특정 브라우저가 반드시 캘린더 앱을 연다고 보장하지 않음. Mail 가져오기 참고: https://support.apple.com/en-mt/guide/iphone/ipha0d932e96/ios

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


## 2026-11-06 Optional single-band profile start (017)
- Added disabled-by-default singleton private site_entry setting, leader-only set_direct_band_entry, intentional public minimal default_band_entry_context, and authenticated direct PIN/registration wrappers. The UI toggle is under 밴드 관리 / 사이트 시작 화면. Root and default login redirect directly to the photographed existing profile/PIN page with no extra entry click. Code invite links and /login?standard=1 preserve original onboarding.
- No Auth guest or access mutation on render. On submit, guest identity is verified/created using existing guestClient, then one DB transaction locks session/site setting/band, prepares a scoped/versioned expiring direct grant and invokes existing personal-PIN or profile-registration RPC. Original per-member PIN rate limiting and canonical session identity remain. No hardcoded band ID/password, secrets in browser, or auth claims weakening.
- Setting changes serialize with direct entry and revoke outstanding direct grants. Disabled mode returns no public roster and stale PIN/signup forms are rejected. Existing PIN-verified sessions survive. A leader from another band cannot overwrite an already-selected start band. Public listing exposes only the explicitly opted-in band and no PIN/hash. Original membership/RLS restrictions remain.
- Local gateway extended solely to simulate public default context RPC under anon SQL role; all other unverified endpoints remain denied. Initial SQL check exposed test-only schema privilege lookup under anon; moved that privilege assertion to owner context. Old page mocks updated for added public context call/settings action. Application checks were not weakened to satisfy mocks.
- PASS lint/typecheck, 36 unit files /232 tests, CURRENT SQL170 assertions (including23 new), separately HISTORICAL through010300 assertions. QA-environment production build PASS19 routes. Browser and final normal-environment build results follow. No hosted SQL/deployment/commit/push or operating-user data changed.


## Final 017 validation — 2026-11-06
- PASS lint, typecheck, 36 unit files /232 tests. CURRENT SQL/RLS170 assertions; separately HISTORICAL through010300. All migrations through017 execute against disposable PGlite.
- PASS actual Chrome production-Next workflow:191 checks /zero uncaught JS exceptions. Existing six-width ten-route regression flows pass, including handoff, repertoire and removal. New toggle tests enable from leader settings, load site root directly into profile/PIN without code/password or an entry click, fit320/390/1280, reject incorrect personal PIN, accept correct PIN into canonical leader, create a regular member directly, hide setting from regular member, disable from leader settings and restore original code/password screen on stale direct URL.
- Direct-entry screenshots at390/1280 visually inspected; they use the existing photographed profile/PIN layout. Public page render creates no guest account; actual form submit performs the authenticated transaction. Hosted-provider Auth/REST/Realtime, physical Safari/iOS and multi-connection PostgreSQL concurrency remain unverified. Local SQL gateway simulates provider HTTP while executing real local migration/RLS/RPC logic.
- Final normal-environment production build (without QA overrides):PASS19 routes. Owned QA servers stopped. No hosted SQL, deployment, real user records, commit or push performed. Apply017 once AFTER016, redeploy, then leader toggles 밴드 관리 → 사이트 시작 화면 → 프로필 시작 화면 켜기. Default remains off until selected.


## 2026-11-06 Delete candidate/repertoire songs and skip confirmed voting (018)
- Added leader-only delete_band_song under the band's row lock, with explicit named confirmation dialog on song detail and consent checked in the server action. Success revalidates the app and redirects to /songs; failure stays in the dialog. Ordinary members have no delete control and RPC rejects member/other-band authority. Delete cascades live/historical votes and difficulties; independent plan song snapshots are retained and remain editable.
- User follow-up: confirmed repertoire needs no additional voting. Removed confirmed vote form/tally/pending prompts, excluded confirmed songs from unvoted page and recommendation waiting lists; replaced scoped home RPC pending count to exclude confirmed songs. Original votes remain stored for unconfirmation. Plan's existing explicit-confirmation eligibility bypass retained. No change to ordinary candidate recommendation prerequisites.
- PASS lint/typecheck, 36 unit files /234 assertions, CURRENT SQL185 assertions (15 new deletion/pending tests), separate HISTORICAL through010300 assertions. Production QA build PASS19 routes. Added optional QA_DELETE_SONG focus mode to existing Chrome harness, using normal fixture creation and real Next actions; result follows. No hosted SQL, deployment, commit/push or operating user records changed.


## Final 018 validation — 2026-11-06
- PASS lint/typecheck, 36 unit files /234 tests, CURRENT SQL185 assertions (15 new deletion/pending assertions), separately HISTORICAL through010300. Full initial->018 upgrade chain passes. Normal-environment production build restored:PASS19 routes. Diff whitespace check:PASS.
- Focused actual Chrome run QA_DELETE_SONG=1:15 checks PASS /zero uncaught JS errors. Normal five-member fixture created through Next actions; explicit repertoire confirmation removes vote form/tally and pending-list entry; confirmed song chosen into plan without new votes; delete dialog fits320/390/1280 and identifies song; cancel preserves song; confirm redirects to /songs and removes live song; plan snapshot still displays title. Mobile390 screenshot visually inspected.
- First browser attempt had an overbroad raw DOM selector matching Next's hidden retained detail page after a successful client redirect; corrected the test to inspect visible body text. No application fix needed for that selector failure. Second focus run passed completely; first attempt is not counted as passed. Browser report now records focused15 checks, not the previous full191 run.
- Local SQL gateway uses disposable PGlite/RLS/RPC with simulated Auth/REST; hosted Supabase Auth/Realtime, physical Safari/iOS and true concurrent Postgres remain unverified. Owned local servers stopped. No hosted data changes/deployment/commit/push. Apply018 once after017 and redeploy; no previous migration changes.


## 2026-11-06 Full desktop/mobile audit and two-month calendar
- User requested comprehensive PC/mobile verification, then limited calendars to two months. Interpreted as this and next calendar month (confirmed in commentary); shared pure twoMonthWindow(today) handles December rollover/leap years. All pickers, attendance recommendations and plan suggestions share the window. Existing saved out-of-window dates/plans remain preserved; edit picker opens within the new window without overwriting the existing hidden value. No SQL changes.
- Reproduced two actual calendar keyboard bugs with failing regression tests: focus trapped next to native disabled dates, and PageUp bypassing previous-month limits. Fixed by skipping disabled cells with bounded search, consistent month boundaries, retained focus and month-end clamping. Added year rollover/leap/window limits and cross-month focus regressions. All241 unit tests pass (37 files). Removed stale 回次/회차 marketing text from landing page, now 우리 밴드.
- Test harness now distinguishes native desktop metrics/mouse events (QA_DESKTOP=1) from mobile touch. Desktop mode runs entire functional workflow at1280px, with dedicated keyboard skip/limit checks. Mobile mode still checks10 routes at320/390/430/768/844/1280 plus workflows. Old pre-keyboard-fix mobile baseline191 passed, preserved separately; final post-fix results follow and are not inferred from that baseline.
- Initial lint/typecheck234 unit and current SQL185/separate historical300 passed; subsequent new unit regressions confirmed failure before fix then passed. Production build with configured local gateway passed19 routes. Local QA only; no production user data, deployed SQL, commits/push or deployment changed. Final browser/build results follow.


## 2026-11-06 Follow-ups during broad audit (019)
- User added skill on/off, optional rehearsal venue, and moving upcoming rehearsal above tasks. Added bands.skill_enabled defaultfalse (existing values retained) and leader-only transactional toggle that invalidates planning versions. Existing identity/settings/planning/attendance/home RPCs carry flag in current band scope; no extra network query on navigation. Member cards/inputs, home skill task, skill-pending alerts/burden labels hidden when off. Recommendation calculations ignore retained/missing skills when off; required votes/part difficulties preserved. Server new-song eligibility mirrors the flag.
- Added optional confirmed_plans.location(max200), create/edit/clear support, trimmed server validation, planned/archived cards and nearest-home summary display. Home reordered upcoming first. Extended eight-argument save RPC with legacy seven-argument wrapper preserving existing venue, grants and role/version/cap checks.
- Compatibility testing exposed missing old exact signature and attendance context parity; retained wrapper and matching lightweight flag fixed these before final checks. Existing simplified workflow explicitly enables skills when exercising old skill-on gates. New tests verify defaultoff/enable/disable/preserved skill/missing-skill gating, venue save/clear/limits/legacy preservation/member denial and home order.
- Current PASS: lint/typecheck, 37 unit files245 tests; current SQL202 assertions, historical through010300 separately; initial->019 migration chain and QA production build19 routes. Final browser checks follow. No hosted SQL/deployment/user data/commit/push changed. Apply019 after018 before deploying updated app.


## Final PC/mobile audit including019 — 2026-11-06
- PASS: lint, standalone typecheck, 37 unit files /245 tests; CURRENT SQL/RLS202 assertions; separately HISTORICAL through010300. All migrations initial->019 pass in disposable PGlite with upgrade fixtures. Normal-environment production build restored:PASS19 routes; final diff whitespace check:PASS. QA servers stopped.
- Actual final Chrome checks: MOBILE full199 + DESKTOP native-mouse/keyboard full141 + MOBILE focused deletion/venue20 + DESKTOP focused deletion/venue20 =380 PASS, all four runs zero uncaught JS exceptions. Mobile matrix covers10 menu routes at320/390/430/768/844/1280, including844x390 landscape. Desktop full functional run uses1280px/non-mobile metrics, touch emulation disabled and mouse events; not just a widened mobile viewport. Earlier pre019 baseline runs are not included in380.
- Final complete flows: padded code/password/PIN and bad-credential retries; profile creation and canonical login; multi/range dates, counts/names, disabled duplicate saved dates, nested modal Escape, edit/delete; two-month button/keyboard limits; desktop skipping disabled cells without selection; date-only plan creation/edit/delete, five upcoming plan cap, persisted venue/home-first order; votes/difficulty/negative reason/withdrawal/recast; new-member roster inclusion; ordinary-member restrictions; actual leader handoff and immediate former-leader revocation; independent repertoire/plan snapshots; explicit member removal cancel/confirm; direct-start toggle/PIN/signup/fallback.
- New skill checks: defaultoff hides member inputs and home card; leader enables and fields/card appear; disable hides again. SQL verifies prior values preserved, missing skills ignored only when off, role denial and context parity. Venue focus runs save/show nearest home first, edit, clear, then delete the live song while retaining the saved plan song snapshot. Optional venue limits and legacy7-argument API preservation are covered in SQL/action tests.
- Visually inspected final mobile390 and desktop1280 screenshots of upcoming rehearsal with venue, no skill task when off. Final full reports: .qa-artifacts/mobile/full-audit.json and desktop/full-audit.json. Focus reports: each deletion-venue-audit.json. Artifacts are ignored local files.
- Fixed actual bugs: keyboard focus stuck beside saved disabled dates, PageUp/PageDown crossing allowed month bounds; month-change focus and short-month day clamping corrected with regression tests. User-requested two-month window and new019 feature changes are included. Historical saved dates/plans retained; stale landing 회차 wording removed. No new reproducible application failure remained within this exercised scope.
- Limits: local production Next + disposable PostgreSQL-compatible PGlite/RLS/RPC with simulated Auth/REST; not hosted Supabase Auth/PostgREST/Realtime, physical iOS/Safari, other browser engines or true multi-connection PostgreSQL concurrency. Do not treat local passes as operating-site certification. No hosted SQL/deployment/user data/commit/push changed.
- Deployment: apply202611050019_optional_skill_and_plan_location.sql once AFTER018, then deploy app. This is required for location column/new skill flags. Calendar/home layout changes are application code. Old migrations remain unchanged;019 preserves old7-argument saves and venue values on legacy edits.


## 2026-11-06 optional song difficulty / migration020 audit
- Implemented: existing leader skill toggle also controls candidate/repertoire difficulty summaries and detail inputs/history. Default OFF, explicit band flag passed to both song-list sections and detail page. Recommendation and database plan eligibility skip skill/difficulty requirements only while OFF, retaining all-current-member voting/quorum rules. ON restores stored values; no data purge. Existing venue, saved snapshots, confirmed repertoire bypass, role/version/cap checks and legacy7-argument wrapper retained. New020 replaces only the difficulty eligibility predicate in the8-argument plan RPC;019 and earlier migrations unchanged.
- PASS lint, standalone typecheck,37 unit files /251 tests. Added OFF/ON candidate/confirmed list/detail rendering, recommendation missing-difficulty and vote requirements, form hide/restore saved difficulty/version tests. Older difficulty-form tests explicitly enable the feature, preserving refresh/success/version assertions.
- PASS migration initial->020, CURRENT SQL/RLS206 assertions; HISTORICAL through010300 assertions tested separately. SQL tests verify missing difficulty+skill accepted while OFF, missing difficulty rejected while ON even with assigned skill, enabled fully-rated acceptance, preserved stored values, voting still required, ordinary-member/anonymous denial and venue/legacy-client preservation.
- PASS production Next/Chrome functional regression: MOBILE158 + DESKTOP160 =318 checks, zero uncaught JS exceptions on each run. Desktop uses native mouse/keyboard with touch emulation disabled and minimum1280px; mobile uses touch/mobile emulation and320/390/430/768/844/1280 layout checks within the workflow. QA_FAST skips the separate60-route matrix; these318 are actual functional workflow assertions, not a new complete browser/device matrix. Flags tested OFF/ON on list/detail, unrated voted candidate plan-choice inclusion/exclusion, ordinary member hidden difficulty, retained vote editing, dates/plans/venue/snapshots, handoff/removal and direct-start/PIN login. Visually inspected OFF390/mobile and1280/desktop and ON1280 screenshot.
- Reports: banddecision-web/.qa-artifacts/mobile/optional-difficulty-audit.json and desktop/optional-difficulty-audit.json (ignored local artifacts). Normal-environment production build restored: PASS19 routes. Owned QA servers stopped. No hosted SQL/deployment/data changes or git commit/push.
- First PC launch request was rejected because automatic approval review timed out before execution; one retry succeeded. No unresolved approval blocker. Initial unit run had2 old tests assuming default-visible difficulty; explicit ON setup restored those tests without removing their assertions. No reproducible application error remained in the exercised scope.
- Limits: local disposable PGlite/RLS/RPC with simulated Auth/REST, real local Next server actions/cookies and Chrome; hosted Supabase/Auth/Realtime, physical phones/Safari and true multi-connection PostgreSQL concurrency remain unverified.
- Deploy: apply202611050020_optional_song_difficulty.sql once AFTER019, then redeploy app. Both DB and application changes are required. Existing migrations should not be rerun.


## 2026-11-06 로그인 안내 문구 정리
- 프로필/PIN 로그인 화면에서 기기에 30일 동안 로그인을 유지한다는 안내 문장을 제거했습니다. 로그인 유지 기간 자체는 변경하지 않았습니다.
- 하단 밴드 코드 접속 링크는 기존 코드·공용 비밀번호 로그인으로 이동하고, 접속 초기화는 현재 기기의 밴드 세션을 종료한 뒤 Auth 로그아웃하는 기존 동작임을 코드로 확인했습니다. 버튼은 유지했습니다.
- 이번 변경은 문구만 수정했습니다. 추가 테스트는 실행하지 않았으며 SQL 변경은 없습니다.


## 2026-11-06 Galaxy/Kakao in-app profile input report
- User reports Korean nickname entry failure in KakaoTalk in-app browser on Galaxy. Exact symptom/device/WebView version not supplied; no physical reproduction available. Source inspection found no nickname filtering, controlled-value rewriting or key handlers. Root cause is unconfirmed.
- Compatibility mitigation in shared ProfileFields: explicit text type/inputMode, disable nickname/part autofill, capitalization, autocorrect and spellcheck. Keep native uncontrolled input/composition; no per-keystroke rewriting or IME state hacks. Applies to code/direct registration and band creation.
- No SQL changes or deployment performed; no tests run for this report. Needs redeploy and retest on the reporting Galaxy/Kakao browser. External browser is a workaround/diagnostic, not proof of root cause.


## 2026-11-06 합주 메모 (021)
- 합주 계획 생성·수정에 선택 메모(최대 2,000자)를 추가했습니다. 예: 지난 합주의 부족한 점, 이번 연습 목표, 준비할 내용. 밴드장만 저장·수정하며 멤버 모두 읽을 수 있습니다. 메모를 비우고 저장하면 삭제됩니다.
- 계획 목록/지난 계획에서는 줄바꿈을 유지해 전체 메모를 보여주고, 홈의 다가오는 합주에서는 최대 3줄로 미리 보여줍니다. 전체 내용은 합주 계획 전체 보기에서 확인합니다. 입력 내용은 일반 텍스트로 렌더링합니다.
- **020 다음에 `202611050021_rehearsal_plan_memo.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 기존 메모는 빈 상태로 시작합니다. 7/8개 인자를 받는 구버전 저장 API는 새 9개 인자 API로 연결되어, 구버전 화면의 수정이 메모를 지우지 않도록 했습니다.
- 계획 저장은 기존 요청 한 번에 메모를 함께 저장합니다. 별도 메모 조회/저장 요청은 없습니다. 합주 계획 화면의 인증 확인 뒤 추천 자료 조회를 사용자/기존 계획 조회와 병렬화하여 순차 대기를 줄였습니다. 운영 지연시간은 측정하지 않았으므로 속도 개선 수치는 제시하지 않습니다.

- 기존 로그인 입력 호환성 변경은 그대로 보존했습니다. 이번 요청에서 테스트를 추가하거나 실행하지 않았습니다. 기존 테스트의 API 인자/조회 모형만 새 계약과 맞췄습니다. SQL021은 파일만 작성했으며 운영/로컬 DB에 실행하지 않았습니다. 배포·커밋·push도 하지 않았습니다.

- 정적 검증: TypeScript 검사·ESLint·프로덕션 빌드(19개 라우트) 통과. 조회 helper의 반환 타입 오류는 종류별 overload와 명시적 공통 반환 타입으로 수정 후 재확인했습니다. 저장 실패 시 React의 자동 form reset으로 메모/장소 초안이 지워지지 않게 했으며 성공 후에는 계획/밴드 버전 key로 새 저장 상태를 반영합니다.


## 2026-11-06 화면별 조회 경량화 (022)
- **021 다음에 `202611050022_lean_screen_queries.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 새 곡 조회 RPC와 확장된 홈 응답을 함께 사용하므로 SQL/앱을 모두 반영해야 합니다. SQL021의 memo 열이 필요합니다.
- 홈: 요약 RPC에 예정 계획 개수/가장 가까운 계획 한 건을 포함했습니다. 기존 홈 요약 + 전체 예정 계획 조회(본문 데이터 요청 2회)를 요약 요청 1회로 합쳤습니다. 나머지 예정 계획의 곡/메모, 모든 참석자 스냅샷은 홈에서 가져오지 않습니다. 가까운 계획의 메모는 미리보기용 600자만 전송하며 전체 원문은 계획 화면에 유지합니다.
- 합주곡 목록/추천: `band_song_context(null)`에서 곡·현재 멤버·투표 조건에 필요한 값만 가져옵니다. 불참 일정, 난이도 수정 이력, 반대 사유 원문은 목록에서 제외합니다. 실력 기능 OFF이면 난이도 테이블 집계도 실행하지 않습니다.
- 곡 상세: `band_song_context(곡ID)`로 해당 밴드의 해당 곡 한 건만 가져옵니다. 필요한 반대 사유/난이도 편집 이력은 상세 응답에 포함합니다. 다른 곡 전체나 불참 일정을 가져오지 않습니다. 추천·투표·수정/삭제 기능은 유지합니다.
- 밴드 관리: 멤버 명단 조회와 접속 설정 조회를 Promise.all로 병렬화하고 받은 설정을 하위 컴포넌트에 전달합니다. 같은 설정을 다시 조회하지 않습니다. 계획 목록은 select(*) 대신 실제 사용하는 열만 지정했습니다. 사용처가 없어진 멤버 수/홈 계획 조회 helper는 제거했습니다.
- 서버의 인증된 Auth/개인 PIN 세션 확인과 밴드·역할 검사는 유지합니다. 사용자별 데이터를 전역 캐시에 저장하지 않습니다. 새 곡 RPC는 인증된 역할만 실행할 수 있고 canonical actor의 현재 밴드로 제한됩니다. 기존 저장 RPC와 공개 계약은 삭제하지 않았습니다.
- 검증: TypeScript·ESLint·프로덕션 빌드(19개 라우트)·diff 공백 검사 통과. 이 요청에서 테스트를 추가/실행하거나 SQL을 DB에 적용하지 않았습니다. 기존 검증용 응답 모형만 새 계약에 맞췄습니다. 운영/실기기 지연시간과 SQL/RLS 실행은 미검증이며, 요청 감소는 코드 경로 기준입니다. 초/퍼센트 단축을 측정했다고 주장하지 않습니다. 배포·커밋·push 없음.


## 2026-11-06 홈 합주 카드 가독성
- 홈 다가오는 합주의 참석 인원 뒤에 붙던 곡 제목/곡 미정 문구를 제거했습니다. 합주 계획 페이지의 곡 목록은 유지합니다.
- 날짜에 한국어 요일을 추가하고 Asia/Seoul 정오를 명시해 날짜 경계에 따른 요일 오차를 피했습니다. 모바일은 날짜/시간을 두 줄로 표시하고 넓은 화면은 한 줄로 배치합니다. 장소·참석·메모는 각각 구분합니다. 추가 SQL은 없습니다.


## 2026-11-06 곡 상세 중복 이동 링크 제거
- 공통 뒤로/홈 이동 아래에 중복 표시되던 곡 상세의 ← 후보곡 링크와 미사용 Link import를 제거했습니다. 공통 내비게이션은 유지하며 SQL 변경은 없습니다. 테스트는 실행하지 않았습니다.


## 2026-11-06 중복 UI 및 불필요한 재조회 정리
- 공통 이동 영역의 같은 목적지 버튼/링크를 하나의 Next Link로 합쳤습니다. 상세 화면에는 부모 목록으로 가는 뒤로 링크만, 최상위 메뉴에는 홈 링크만 보입니다. 홈 이동은 기본 메뉴에도 있습니다. 내비게이션 대기 중 임시 홈 링크가 나타났다 사라지는 fallback과 곡 추천 화면의 중복 목록 링크도 제거했습니다.
- 일반 멤버의 합주 계획 페이지는 현재 권한을 확인한 뒤 확정 계획/스냅샷만 조회합니다. 편집 UI에만 필요한 전체 멤버 일정·곡 투표·난이도 추천 RPC와 추천 계산을 생략합니다. 조회를 생략한 데이터는 null로 구분하며 임의의 빈 추천 결과를 만들어 편집기에 넘기지 않습니다. 밴드장은 기존 편집 자료와 계획을 병렬 조회합니다. 인증/밴드/역할/버전 검사는 유지합니다.
- LiveRefresh의 window.focus 이벤트를 제거했습니다. 키보드·팝업 이후 단순 포커스 복귀로 불필요한 router.refresh가 실행되지 않습니다. 실제 밴드 변경, 숨겨졌던 페이지의 복귀, Realtime 재연결에는 갱신하며 이벤트 묶음 처리와 unmount 정리를 유지합니다. 밴드가 없는 상태에서는 Realtime 클라이언트를 만들지 않습니다.
- 새 SQL은 없습니다. 기존 022까지 적용한 앱의 Git push/재배포로 반영합니다. 운영 응답시간은 측정하지 않았으며 모든 느림이 해소되었다고 단정하지 않습니다. 테스트를 새로 추가하거나 실행하지 않았고 기존 이동 검증의 모형/선택자만 실제 화면과 맞췄습니다.

- 최종 정적 검증: npm run typecheck, npm run lint, npm run build(19개 라우트), git diff --check 통과. 운영 사이트/실기기 속도 측정 및 브라우저·SQL 테스트는 이번 요청에서 실행하지 않았습니다.


## 2026-11-06 추가 중복 링크 정리 및 곡 화면 병렬 조회
- 최상위 메뉴의 보조 홈 링크를 제거했습니다(기본 메뉴의 홈 사용). 곡/날짜 추천·곡 상세·세부 설정에는 공통 뒤로 링크 한 개만 남깁니다. 날짜 추천의 합주 날짜 정하기, 곡 추천의 합주 계획으로 링크는 기본 합주 계획 메뉴와 중복되어 제거했습니다. 상세의 곡 제목은 현재 화면으로 재이동하지 않는 제목으로 바꿨습니다. 홈의 합주 계획 전체 보기와 다른 기능으로 들어가는 추천 버튼 등 실제 작업 진입점은 유지합니다.
- 곡 목록/추천/상세도 loadVerifiedPlanningPage의 songs 모드를 사용합니다. 검증된 Auth 확인 뒤 canonical 사용자/멤버 확인과 경량 곡 RPC를 동시에 진행합니다. 결과의 밴드 일치 검사는 유지하며 인증 전 private RPC 호출이나 사용자 전역 캐시는 도입하지 않습니다. 곡 상세는 안전한 양의 정수 ID만 허용합니다.
- 이번 변경은 기존022의 band_song_context를 사용하므로 새 SQL은 없습니다. 022까지 적용한 뒤 앱을 재배포합니다. 운영 응답시간 측정과 브라우저/SQL/단위 테스트 실행은 하지 않았습니다. 기존 이동/미투표 페이지 검증용 모형만 새 경로에 맞췄습니다. 기존 조회 helper는 호출자와 검증 코드의 호환성을 위해 유지합니다.


## 2026-11-06 가능한 날짜 직접 등록 (023)
- **022 다음에 `202611050023_explicit_available_dates.sql`을 한 번 실행하고 최신 앱을 재배포하세요.** SQL/앱을 함께 반영해야 합니다. 열려 있던 기존 화면은 새로고침해 주세요.
- 일정 화면에서 참석 가능한 날짜를 선택한 뒤 **날짜 저장**을 누릅니다. 달력의 **N월 전체 선택**은 현재 표시 중인 달의 오늘 이후 날짜를 선택합니다. 지난 날과 이미 저장한 날은 제외하고, 다른 달의 미저장 선택은 보존합니다. 반복 선택은 중복을 만들지 않습니다. 여러 날짜/기간 선택과 저장 후 개별 수정·삭제도 가능합니다.
- 참석 인원과 추천은 가능한 날짜를 실제 저장한 현재 멤버만 계산합니다. 기록이 없는 날은 참석 인원에서 제외하며 미확인 상태는 표시하지 않습니다. 달력의 내 미저장 선택은 미리보기로만 반영됩니다. 아무도 등록하지 않은 날은 추천·계획 확정 대상이 아닙니다. 부분 참석 계획은 제외 멤버를 확인한 뒤 확정합니다.
- 새 `public.available_dates`와 별도 저장/수정/삭제 RPC를 사용합니다. 기존 `unavailable_dates`의 실제 밴드 기록을 자동 변환하거나 삭제하지 않습니다. **모든 멤버가 가능한 날짜를 새로 등록해야 합니다.** 기존 확정 계획·메모·장소·곡·참석 스냅샷은 자동 변경하지 않습니다. 기존 계획을 수정 저장할 때에는 새 가능 날짜 기준으로 참석 인원을 다시 계산합니다.
- 새 테이블은 밴드별 RLS와 SELECT 권한만 공개하며 쓰기는 canonical 사용자/활성 멤버를 재확인하는 RPC로 제한합니다. 밴드 잠금, 버전 검사, 5개 예정 계획 제한 및 역할 검사를 유지합니다. 기존 불가능 날짜 쓰기 RPC는 브라우저 권한을 회수하고, 밴드 버전을 올려 예전 기준으로 열린 확정 폼을 무효화합니다.
- 실제 밴드에 가능 날짜를 자동 입력하지 않습니다. 명시적으로 준비하는 5인 테스트 밴드만 샘플 가능 날짜를 한 번 생성하며, 이미 입력된 가능 날짜는 덮어쓰지 않습니다. 테스트 준비 화면도 새 방식에 맞췄습니다.
- 달력/계획은 날짜별 Set 집계를 재사용하여 월 전체 등록으로 날짜 수가 늘어도 각 셀에서 전체 기록을 반복 검색하지 않습니다. 추가 월 전체 선택 저장 요청은 없으며 기존 일괄 저장 한 번을 사용합니다.
- 이번 작업에서 테스트를 추가하거나 실행하지 않았습니다. 기존 단위/페이지 검증용 입력과 기대값 중 새 API/표시에 해당하는 부분만 맞췄습니다. SQL/RLS·브라우저·실기기 동작과 운영 속도는 미검증입니다. 운영 DB 적용·배포·커밋·push는 하지 않았습니다.

검증 결과 (023 최종 변경): `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` 모두 종료 코드 0. 프로덕션 빌드 19개 경로 생성 성공. DB SQL 적용 및 런타임/브라우저 테스트는 수행하지 않음.

### 2026-11-06 월 전체 선택 취소
- 선택 가능한 날짜가 모두 선택되면 버튼을 전체 선택 취소로 표시하고 해당 달의 미저장 선택만 해제. 다른 달과 저장된 날짜 유지.
- 타입 검사 및 diff 공백 검사 통과. 런타임 테스트 미수행.
- 023 소스 검토: 실사용 밴드의 기존 unavailable_dates 삭제/변환 없음. 새 화면은 available_dates만 조회하므로 이전 기록은 표시되지 않음. 운영 DB의 실제 보존 여부는 직접 확인하지 않음.

### 2026-11-06 기존 불가능 날짜 기반 일회성 가능 날짜 등록 SQL
- 사용자 첨부 기록 중 ff026dc1 밴드의 4명만 대상으로 실행일(서울)~2026-12-31의 나머지 날짜를 등록하는 supabase/manual/20261106_import_legacy_availability.sql 작성.
- 새 가능 날짜가 있는 멤버는 전체 건너뛰기. 밴드 잠금, 활성 소속 확인, 첨부/DB 불가능 날짜 모두 제외, 중복 충돌 무시. 다른 밴드/기존 기록/계획 스냅샷 유지.
- 수동 운영 SQL이며 자동 마이그레이션에 포함하지 않음. 운영 DB 실행 및 SQL 통합 테스트 미수행.

### 2026-11-06 기존 마지막 불가능 날짜 이후 가능 등록 해제
- 사용자 명시 승인 구간: 감자12/12~31, 다은12/3~31, 백종현11/26~12/31, 이재원12/21~31. 해당 구간 본인 신규 입력도 해제될 수 있음을 설명 후 승인받음.
- 수동 trim SQL 작성: 밴드 잠금, 지정 4명/활성 소속/고정 기간 한정 DELETE, 이름별 삭제 수 반환. 기존 불가능 날짜/다른 멤버/확정 스냅샷 유지. 원본 import도 첨부 마지막 불가능 날짜까지만 채우도록 변경.
- SQL 소스 검토 및 diff 공백 검사. 운영 DB 실행 및 통합 테스트는 수행하지 않음.

### 2026-11-06 큰 일정 달력에서 저장 날짜 명단 조회
- 저장된 날짜/지난 날짜를 선택 변경 없이 클릭 가능한 조회 전용 칸으로 분리. 큰 달력 클릭으로 아래 명단 날짜 갱신; 별도 명단 조회용 달력 팝업 제거.
- 전체 선택은 조회 전용 칸을 계속 제외, 기존 신규 날짜 다중/기간 선택 유지. 명단 조회에 DB 요청 추가 없음.
- 검증: `npm.cmd run typecheck`, `npm.cmd run lint`, `git diff --check` 모두 종료 코드 0. 브라우저/실기기 테스트 미수행. DB 마이그레이션 불필요.

### 2026-11-06 일정 달력 버튼 디자인 정리
- 날짜 선택 방식은 한 묶음의 탭형 버튼, 월 전체 선택은 우측 소형 보조 버튼으로 정리. 날짜 칸 간격/높이를 통일하고 저장 날짜 글자 대비와 hover/focus 유지. 저장 전 선택/저장됨 범례 추가.
- 타입 검사, 린트, diff 공백 검사 종료 코드 0. 브라우저 시각 확인/실기기 테스트 미수행. SQL 변경 없음.

### 2026-11-06 서울 이전 도구 D드라이브 설치
- 사용자 요청에 따라 Docker Desktop을 D:\Apps\Docker에 설치하고 WSL 가상디스크를 D:\DockerData에 생성. docker info로 Linux 엔진 29.9.2 실행 확인.
- 공식 GitHub 릴리스 Supabase CLI 3.0.0을 D:\Apps\SupabaseCLI에 설치. 공식 체크섬과 SHA256 일치 확인 후 실행 버전 및 db dump --help 확인.
- 공식 EDB PostgreSQL 17.11 바이너리를 D:\Apps\PostgreSQL17에 압축 해제. psql/pg_dump 버전 실행 확인, 서버 서비스는 생성하지 않음.
- 위 실행 파일 경로를 기존 항목을 보존하여 사용자 PATH에 추가. 기존 터미널은 다시 열어야 새 PATH 반영.
- SUPABASE_SEOUL_MIGRATION.md와 읽기 전용 seoul_migration_verify.sql 준비. 백업 폴더 .migration/를 Git 제외. 실제 DB 백업/복원, Supabase 프로젝트 생성, Vercel 전환은 수행하지 않음. 새 프로젝트와 DB 연결 정보가 다음 단계에 필요.

### 2026-11-06 서울 Supabase 실제 복원
- 사용자 제공 프로젝트와 Windows DPAPI 연결 정보를 사용해 기존 뭄바이 ejodiyhxkftgoaryfzrq를 읽기 전용 백업하고 빈 서울 wxtwuyexsjqxpqnxeheq에 복원. 버전은 양측 PostgreSQL 17.11, Vault 비밀/Storage 객체 0 확인.
- Auth 데이터, public/private 데이터, private.handle_new_user를 호출하는 auth.users 트리거, Realtime 설정 포함. 역할/스키마/데이터와 원본 지문을 Git 제외 .migration/seoul에 저장.
- 첫 복원은 이미 등록된 Realtime 테이블 중복 오류로 트랜잭션 롤백. 중복 등록을 건너뛰는 SQL로 수정 후 재복원 성공.
- 새 프로젝트의 추가 기본 테이블 권한(anon/authenticated의 Dxtm)을 발견해 대상 DB에만 원본 ACL을 재적용하고 기본 권한도 일치시킴.
- 앱 25개 테이블 + Auth users/identities 행 수와 전체 내용 해시 일치. 사용자36, 활성멤버6, 곡7, 가능날짜101, 계획2, 고아 연결0. 함수73/RLS정책21/테이블권한25/트리거12/Realtime10/기본권한3의 해시 일치.
- vercel.json의 함수 리전을 icn1으로 준비. 아직 commit/push/배포/Production 환경변수 전환 없음. 서울 Auth 익명 로그인 설정/API키/Vercel 전환 및 실제 웹 로그인 검증은 다음 단계.
- 서울 DB 읽기 전용 역할 검증: anon 공개 입장 명단6, anon 일정 쓰기 권한없음, PIN 세션없는 authenticated의 private planning context NULL 확인. PowerShell 구문/리전JSON/diff 공백 검사 완료. CLI가 생성한 supabase/.temp도 Git 제외.
- 서울 publishable key로 실제 HTTP Auth 설정/공개 입장 RPC/JWKS 확인. 익명 로그인 활성화와 ES256 서명 확인. 임시 익명 계정 SDK signup/getClaims 통과, PIN 미검증 planning/identity NULL 확인 후 표식+UUID가 일치하는 임시 Auth 계정 1개만 정리. 기존/서울 데이터 지문 재비교 통과.
- 서울 URL/공개 키를 Git 제외 .env.local에 설정. 타입/린트/프로덕션 빌드 모두 통과(19개 경로). Vercel 연결 인증 부재로 실제 배포/환경변수 수정은 실행하지 않음. 소유자 Vercel 설정 교체 후 Preview/PIN 검증과 Production 전환이 남음.

### 2026-11-09 실력 저장 후 선택값 복원 오류 수정
- 실력 저장 성공 뒤 공통 ActionForm의 form.reset()이 uncontrolled select를 이전 defaultValue로 되돌리는 오류를 회귀 테스트로 재현(4 저장 후 표시3). 이후 그대로 재저장하면 이전 실력이 다시 전송될 수 있었음.
- ActionForm에 resetOnSuccess(기본true) 옵션 추가. 실력 편집 폼만 false로 설정해 저장한 선택값 유지. 서버에서 skill이 바뀌면 select key를 통해 최신 값으로 동기화. 다른 생성 폼의 성공 후 초기화와 실패 시 입력 유지 동작은 유지. 추가 DB 조회/SQL 변경 없음.
- 새 회귀3개 포함 전체40파일280개 테스트 통과. 타입/린트/QA 프로덕션 빌드 통과. 임시 PGlite/로컬 Auth·REST 게이트웨이와 실제 Next/Chrome390px 터치·1280px 마우스에서 3→4→5, 그대로 재저장, 미설정 해제, 다시2설정, 다른 멤버 수정, 매번 새로고침 후 DB값/표시 일치 확인. JS예외0. 스크린샷/보고서는 Git 제외 .qa-artifacts/skill-save-*.
- 운영 DB 변경 없음. 실제 휴대기기·카카오톡 브라우저는 별도 미검증.
- 검사 서버 종료 후 QA 환경변수 없는 일반 환경의 프로덕션19경로 빌드도 통과. diff 공백 검사 통과.

### 2026-11-08 공동작업자 2단계 브랜치 병합 준비
- 사용자 요청으로 원격 fetch 후 feat/phase2-db의 커밋4개(6cb1fa5,32a694b,1b8ac9d,df2b420)를 확인. master(8ad6951)에 --no-ff --no-commit 병합하여 사용자 직접 커밋/푸시 대기 상태로 둠. 충돌 없음. 작성자 Git 설정은 Jpongebob으로 확인.
- 027 확정일 잠금/밴드장 참석자 수정/합주 시간/반대 사유 선택/작성자 곡 수정·삭제 및 대응 화면 변경. 기존 홈·긴 장소명 수정은 유지. 타입 검사/린트/프로덕션19경로 빌드 통과, staged diff 공백 검사 통과. 별도 단위/DB/브라우저 테스트와 운영 SQL은 이번 요청에서 실행하지 않음.
- 배포 전 서울027 적용 필요. 앞서 제공한SQL이 성공했다면 재실행하지 않고 supabase/checks/migration_status.sql로 읽기 전용 확인 가능. 사용자에게 한국어 병합 커밋 메시지와 소스트리 Commit→Push 순서 안내.

### 2026-11-07 새 UI PC·모바일 QA 및 수정
- 개편 후 전체 점검: 단위/컴포넌트/액션 38파일256개, 현재 DB225개와 역사적 DB300개 통과. 모바일 Chrome 225개 / PC Chrome 마우스·키보드166개 검사 통과, 각각 처리되지 않은 JS 예외0. 320/390/430/768/844/1280px 주요10경로 점검. 운영 DB 대신 임시 PGlite와 localhost Auth/REST 게이트웨이 사용.
- 일정 저장이 추가/삭제 RPC 두 개로 분리돼 두 번째 실패 시 일부만 저장되는 오류 수정. 026에서 밴드 잠금과 기존 입력검증/RPC를 한 트랜잭션으로 결합. 액션은 단일 RPC만 호출. 오류 시 날짜와 planning_version 원복을 삭제 트리거 실패 주입으로 확인. 중복/겹침/범위/타인 일정/익명 접근 포함18개 DB회귀 추가. 최종 모바일390px 터치로 단일 요청·재로딩 보존·역방향 저장·되돌리기 확인.
- 홈 이후 합주2개의 장소 누락을 회귀 테스트 실패로 재현 후 복원. 홈 곡 칩 숨김 복구. 긴 장소명은 홈/계획 카드 안에서 줄바꿈하도록 수정: 160자 공백 없는 장소가 모바일 레이아웃과 다음 입력창을 밀어내는 실제 오류 재현 후, 같은 장소로 계획3개 연속 생성 및320/390/1280px 최종 홈 집중 검사 통과.
- SQL 검사7개가025 이전 홈 통계를 기대해 실패한 것은 현재 메뉴/멤버설정/일정 보존 계약으로 갱신. 테스트를 제거하거나 기대값을 무조건 성공시키지 않음. 새로 실패했던 홈 장소 검사도 수정 후 통과.
- 상세 결과/적용법은 UI_QA_20261107.md. 서울 DB에202611070026_atomic_availability_changes.sql 적용 필요. SQL은 함수를 추가하며 운영 일정의 일괄 변경 없음. 운영 SQL은 자동 실행하지 않음. 실기기/카카오톡 OS키보드/Safari/운영Auth·Realtime/다중Postgres 연결 미검증.
- 마지막으로 이번 검사 서버 두 개를 종료하고 QA 환경변수 없는 새 셸에서 lint/typecheck/256개 단위 테스트/프로덕션19경로 빌드 통과. git diff --check 통과. 기존 .env.local과 운영 데이터 변경 없음.

### 2026-11-07 공동작업자 UI 다시 적용
- 사용자가 앞서 UI 병합을 취소하도록 요청해 3eda575를 만들고 푸시했으며, 이번 요청으로 해당 취소 커밋을 revert하여 UI 브랜치 4개 커밋(69a5112, 1a55e1d, 7a01f58, df0ad71)의 변경을 복원. 새 한국어 커밋으로 기록하고 강제 푸시 없이 master에 반영.
- 재적용 직후 git diff --exit-code df0ad71 -- 통과: 공동작업자 UI 브랜치와 추적 파일 일치. DB/마이그레이션 변경 없음.
- 타입/린트 통과. 첫 빌드는 로컬에 pretendard 패키지가 없어 실패했으며, npm install --ignore-scripts --no-audit --no-fund로 잠금 파일의 새 의존성 1개 설치 후 프로덕션 빌드 통과. package.json/package-lock.json은 UI 원본과 일치. 별도 테스트 및 Vercel 배포 상태 확인은 실행하지 않음.

### 2026-11-06 다가오는 합주 남은 일수
- 홈의 가까운 합주 및 이후 합주 날짜 옆에 D-N 배지 표시. 한국 기준 오늘은 seoulToday로 한 번 결정하고 날짜 문자열을 UTC 자정으로 환산해 달력 날짜 차이를 계산. 당일 D-DAY, 접근성 설명 제공. 좁은 화면은 줄바꿈 허용. 추가 DB 조회 및 SQL 변경 없음. 별도 테스트는 실행하지 않음.

### 2026-11-06 홈 권한 표시 간소화
- 홈에서 일반 계정의 '멤버' 배지 제거. 밴드장만 '밴드장' 배지 표시. 인원수 및 실제 권한 검증은 유지. DB 변경 없음. 조건부 렌더링 변경만 수행하고 별도 테스트는 실행하지 않음.

### 2026-11-06 합주 중심 홈 및 미투표 메뉴 배지
- 홈 '내가 할 일' 카드 제거. 가까운 합주 1개는 참석/장소/메모와 함께 크게 표시, 이후 합주 2개는 날짜/요일/시간/장소만 표시. 합주 없음 상태와 전체 보기 유지.
- 025에서 홈 RPC는 최대 3개 합주 요약을 날짜/확정시각/ID 순으로 제공. 일정 목록, 실력 통계, 곡 스냅샷 읽기 제거. 이전 클라이언트의 응답 모양은 기본값으로 유지하고, 새 클라이언트는 025 이전 응답이면 최근 합주 1개로 호환.
- 모바일 하단/PC 사이드바 합주곡 메뉴에 본인 미투표 수 배지 추가(0 숨김, 100 이상 99+). 새 band_pending_vote_count는 활성 PIN 확인 멤버의 미확정/미투표 곡만 집계. Suspense로 독립 로딩, React cache로 모바일/PC의 동일 요청 중복 방지. 오류 시 배지만 숨김.
- 타입 검사/린트/프로덕션 빌드 통과. 격리된 로컬 PGlite에서 전체 마이그레이션, 가까운 3개/전체 4개 집계, 600자 메모 제한, 미투표 집계 및 미인증 배우 데이터 비노출 확인. 운영 DB와 실제 휴대기기는 변경/확인하지 않음.
- 서울 Supabase에 202611050025_home_upcoming_plans.sql 적용 필요. 적용 전 웹은 기존 1개 합주를 표시하고 배지는 숨김. 운영 SQL 자동 실행하지 않음.

### 2026-11-06 홈 가능 날짜 목록 제거
- 홈 하단 '내 가능 날짜' 카드와 해당 날짜별 일정 이동 링크 제거. 일정 탭에서 날짜 확인/관리는 유지. DB 변경 없음. 이번 변경은 JSX 카드 삭제만 수행했으며 별도 테스트는 실행하지 않음.

### 2026-11-06 달력 색상 구분 및 저장 날짜 일괄 삭제
- 내 저장 가능 날짜는 초록색과 체크, 저장 전 선택은 파란색, 미등록은 흰색, 지난 날짜는 회색으로 구분. 범례 및 날짜 접근성 설명 정리. 저장 목록의 일반 날짜도 초록색으로 통일.
- 저장된 날짜의 '여러 날짜 삭제'에서 개별/월별/전체 선택 및 선택 취소, 선택 개수 표시, 삭제 전 날짜 목록 확인 제공. 확인 후 RPC 1회 호출. 처리 중 중복 제출 차단, 실패 시 선택 유지 및 오류 표시. 기존 개별 수정/삭제 유지.
- 024 마이그레이션은 인증된 자신의 멤버 ID를 서버에서 결정하고 밴드 잠금/활성 멤버 재검증 후 선택된 available_dates만 원자적으로 삭제. 빈 목록/잘못된 날짜/중복 거절. 기존 트리거의 planning_version 갱신 유지. 추가 읽기 조회 없음.
- 새 액션/컴포넌트 및 기존 달력/액션 테스트 39개 통과. 린트/타입 포함 프로덕션 빌드 통과. 로컬 임시 PGlite에서 전체 마이그레이션 적용 및 잘못된 입력 거절, 선택한 행만 삭제, 미선택/타인 날짜 보존, PIN 미확인/anon 거절 확인. 운영 DB 변경 및 배포는 하지 않음.
- 적용 순서: 서울 Supabase SQL Editor에서 supabase/migrations/202611050024_bulk_available_date_deletion.sql 실행 후 웹 코드 커밋/푸시. SQL 실행 전에는 새 일괄 삭제 기능을 사용할 수 없음.
- 실제 달력 컴포넌트/빌드 CSS의 Chrome 320/360/390/430/1280px 렌더 검사에서 저장/선택/미등록/지난 날짜의 배경 구분, 저장 체크 표시, 말줄임·가로 넘침 없음 확인. 390px 화면 시각 확인. 일괄 선택/확인/취소/오류 동작은 컴포넌트 테스트로 확인했으며 실제 휴대기기에서는 아직 확인하지 않음.

### 2026-11-06 모바일 달력 인원수 말줄임 제거
- 공용 DateCalendar의 truncate 표시를 제거. 모바일은 '가능'과 '2/6명'을 줄로 나누고 PC는 기존 한 줄 유지. 인원수만 표시하는 계획 달력과 저장 날짜 수정 안내도 글자를 자르지 않도록 자동 줄바꿈. 접근성 설명과 날짜 선택 동작 유지. DB 조회 추가 없음.
- 실제 컴포넌트를 서버 렌더링하고 이번 Next 빌드 CSS를 사용해 Chrome 320/360/390/430/1280px에서 렌더 확인. 한자리/두자리 참석 수의 말줄임·가로 넘침 없음, 모바일 줄 분리 및 PC 한 줄 유지 확인. 390/1280px 스크린샷 시각 확인. 산출물은 Git 제외 .qa-artifacts에 보관.
- 타입 검사/린트/프로덕션 빌드 통과. 기존 date-calendar 테스트9개 통과. 실제 휴대기기 및 운영 배포는 수행하지 않음.
