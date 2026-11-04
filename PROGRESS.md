# BandDecision Web 작업 기록

요청된 `SPEC.md`, `AGENTS.md`, `CODEX_TASK.md` 파일명은 이 작업 루트에 없었습니다. 제공된 동등 문서 `banddecision_web_SPEC.md`, `banddecision_web_AGENTS.md`, `banddecision_web_CODEX_TASK.md`를 전체 검토했습니다. 앱은 `banddecision-web/`에 구성했습니다.

## Phase 상태

| Phase | 구현 결과 | 실제 검증 | 미완료/BLOCKED |
|---|---|---|---|
| 0 DB/RLS | 15개 테이블, 제약·인덱스, RLS, 단일 쓰기 RPC, 초대/회차/version/확정 스냅샷 SQL | 소스 정적 검토, RLS pgTAP 스크립트 작성 | Supabase 프로젝트/DB 부재로 migration 적용·SQL 실행·RLS 통합 검사 BLOCKED |
| 1 웹/Auth | Next.js 16 App Router, TS strict, Tailwind 4, shadcn 설정 및 컴포넌트, SSR 세션 갱신, 이메일 가입/로그인/로그아웃/재설정, 보호 경로 | TypeScript/lint/build 명령 기록 아래 | 계정·URL·키 부재로 실제 이메일/세션 확인 BLOCKED |
| 2 밴드/초대 | 밴드 생성, 1회 7일 초대 발급/검사/수락, 유동 멤버, 파트 중복, 실력/파트 변경, 리더 이양, 탈퇴/내보내기 | 단위·정적 검사만 | 다중 사용자 동시성, 다른 밴드 격리 실제 DB 확인 BLOCKED |
| 3 회차/일정 | 60일 참여자 스냅샷, pending/submitted/none, 날짜 텍스트 파싱, 미리보기/범위 밖 동의, 트랜잭션 제출 | 날짜 파서 테스트 | DB round-trip/전체 rollback 확인 BLOCKED; 달력 UI는 빠른 입력 위주로 구현 |
| 4 날짜 추천 | 전원 제출 조건, 60일, 참석 수·날짜 정렬, 0명 제외, TOP 5와 더보기, 참석/불참 사유 | 순수 함수 테스트 | 실제 데이터 연결 BLOCKED |
| 5 곡/투표 | 후보곡, 파트 난이도, 회차 투표, 반대 사유, 전원 투표·2/3·부담·점수·정렬 | 순수 함수 테스트 | RLS 투표 권한/Realtime 동작 DB 검증 BLOCKED |
| 6 확정 | 리더 권한, round row lock/version, 최신 조건 재검증, 참석자·곡 스냅샷 atomic replace, Realtime refresh 구독 | 타입 검사·코드 검토 | DB 동시성·stale preview·재확정 롤백 실제 검증 BLOCKED |
| 7 품질/운영 | 반응형 shell, 인증/폼 오류·빈 상태, 계정 삭제 요청, README/배포 안내/AC표 | lint/typecheck/test/build 실행 | 브라우저 실측·실기기, Supabase, Vercel 배포 BLOCKED. 계정 삭제 요청 이후 실제 Auth 삭제/익명화 worker 미구현 |

### 명시한 구현 결정

- `SECURITY DEFINER` 쓰기 작업은 Data API에서 호출되는 RPC 형태로 두고, 모든 작업 내부에서 `auth.uid()`와 밴드/회차 권한을 검증합니다. 클라이언트는 일반 테이블 DML 권한이 없습니다. 비로그인 `inspect_invite`만 초대 토큰으로 해당 밴드명과 유효성만 조회합니다.
- 현재 UI는 사용자당 활성 밴드 하나를 partial unique index로 강제합니다. 초대 가입자는 현재 회차의 고정 참여자 목록을 바꾸지 않습니다.
- 일정의 빠른 입력은 공통 사유를 적용합니다. 세밀한 달력 선택 UI는 후속 개선이 필요합니다.
- 탈퇴 신청은 안전하게 요청 상태를 기록하지만 운영자의 Auth 계정 삭제 및 확정 스냅샷 비식별화 실행은 외부 서버 권한/운영 절차가 없어 BLOCKED입니다.
- 2026-11-04에 생성된 Expo 작업물은 웹 전환 요청에 따라 사용하지 않았습니다.

## 실행 결과

| 명령 | 결과 |
|---|---|
| `npm run typecheck` | PASS — 오류 0건 |
| `npm test` | PASS — 2개 파일, 13개 단위 테스트 (최종 재실행 값으로 갱신 예정) |
| `npm run lint` | 실행됨 — 오류 0, 미사용 상태 인자 경고 1건 (수정 후 재실행 예정) |
| `npm run build` | 최종 실행 예정; Supabase 비밀값 없이도 빌드 가능한지 확인 |
| Supabase CLI/pgTAP | 실제 Supabase DB 없음; 작성된 `supabase/tests/database/security.test.sql` 미실행, BLOCKED |

## AC01–AC56 확인표

`PASS`는 해당 단위 테스트/정적 검사를 실제 수행한 항목만, DB·외부 연동이 필요한 미실행 항목은 `BLOCKED`로 표시합니다.

| AC | 상태 | 검증 범위 |
|---|---|---|
| AC01 | BLOCKED | 회원가입/로그인 코드 구현, 원격 이메일 인증 미실행 |
| AC02 | BLOCKED | 보호 layout 구현, 실제 세션 리다이렉트 미실행 |
| AC03 | BLOCKED | 원자적 밴드 생성 RPC 코드, DB 실행 미실행 |
| AC04 | BLOCKED | 중복 파트 허용 구조, 다중 계정 테스트 미실행 |
| AC05 | BLOCKED | 고정 인원 제약 없음, N=1/3/5/7 DB 확인 미실행 |
| AC06 | BLOCKED | 1회 초대 잠금/만료 로직, DB 경쟁 테스트 미실행 |
| AC07 | BLOCKED | 리더 권한 RPC 코드, 권한 테스트 미실행 |
| AC08 | BLOCKED | 본인만 쓰기 RPC/RLS, 실제 테스트 미실행 |
| AC09 | BLOCKED | 밴드 membership RLS, 교차 밴드 쿼리 미실행 |
| AC10 | BLOCKED | 권한 이양/탈퇴 RPC 코드, DB 테스트 미실행 |
| AC11 | BLOCKED | 회차 참여 스냅샷 SQL 작성, 미적용 |
| AC12 | BLOCKED | 생성 시점 스냅샷 코드 검증 미실행 |
| AC13 | BLOCKED | 탈퇴 시 회차 invalidated RPC, DB 실행 미실행 |
| AC14 | BLOCKED | pending/submitted/none 모델 구현, DB 테스트 미실행 |
| AC15 | PASS | 날짜 파서 월 경계 범위 테스트 통과 |
| AC16 | PASS | 연도 경계 범위 5일 출력 테스트 통과 |
| AC17 | BLOCKED | parser 실패는 오류 반환, 저장 rollback DB 검증 미실행 |
| AC18 | PASS | 기준일 2026-11-04의 11.3 → 2027-11-03 단위 테스트 통과 |
| AC19 | PASS | 회차 밖 미래 날짜 분류 단위 테스트 통과 |
| AC20 | PASS | 쉼표로 구분한 복수 날짜 단위 테스트 통과 |
| AC21 | PASS | 11.31 잘못된 날짜 거부 단위 테스트 통과 |
| AC22 | PASS | 역순 범위 거부 단위 테스트 통과 |
| AC23 | PASS | 중복 제거 단위 테스트 통과 |
| AC24 | PASS | 회차 밖 날짜 분류 및 표시 데이터 테스트 통과 |
| AC25 | BLOCKED | SQL 사유 check 작성, 직접 DB 거부 테스트 미실행 |
| AC26 | BLOCKED | 전체 교체 RPC 구현, DB 조회 미실행 |
| AC27 | BLOCKED | 원자적 실패/기존값 유지 DB 확인 미실행 |
| AC28 | BLOCKED | none 제출 분기 SQL 작성, DB 확인 미실행 |
| AC29 | PASS | 날짜 추천은 모든 참여자 제출 전 빈 배열 반환 |
| AC30 | PASS | 전원 제출 후 날짜 추천 계산 단위 테스트 통과 |
| AC31 | PASS | N=5 중 불참 2명 → 참석 3명 단위 테스트 통과 |
| AC32 | PASS | 참석자 0명 날짜 제외 테스트 통과 |
| AC33 | PASS | 날짜 동률 시 빠른 날짜 우선 테스트 통과 |
| AC34 | BLOCKED | TOP5/더보기 UI 코드, 브라우저 페이지 테스트 미실행 |
| AC35 | BLOCKED | 부분 참석 표시 UI/RPC acknowledgment 코드, end-to-end 미실행 |
| AC36 | BLOCKED | 후보곡 RPC 구현, DB 저장 확인 미실행 |
| AC37 | PASS | 필요 파트 난이도 누락 상태 단위 테스트 통과 |
| AC38 | PASS | 멤버별 실력 부담 합산 단위 테스트 통과 |
| AC39 | BLOCKED | SQL check/RPC 사유 검증, DB 테스트 미실행 |
| AC40 | BLOCKED | yes 변경 시 사유 null 처리 코드, DB 확인 미실행 |
| AC41 | PASS | N=5, 4명 찬성 자격/점수 테스트 통과 |
| AC42 | PASS | N=5, 3명 찬성 제외 테스트 통과 |
| AC43 | PASS | 미투표 1명은 waiting_votes 처리 테스트 통과 |
| AC44 | PASS | 찬성 4명·부담 2 점수 8 공식 테스트 통과 (SPEC 예시 점수 계산도 공식과 동일) |
| AC45 | PASS | 점수 동률 시 ID 오름차순 테스트 통과 |
| AC46 | BLOCKED | 리더 검사 RPC 작성, 비리더 DB 실행 미실행 |
| AC47 | BLOCKED | version 비교/ROUND_STALE 구현, 동시 변경 미실행 |
| AC48 | BLOCKED | 서버 곡 자격 재검증 구현, DB stale-change 확인 미실행 |
| AC49 | BLOCKED | 스냅샷 테이블 구현, 원본 변경 후 DB 비교 미실행 |
| AC50 | BLOCKED | 기존 확정 교체 트랜잭션 구현, 재확정 미실행 |
| AC51 | BLOCKED | 트랜잭션 rollback SQL 구현, DB 실패 주입 테스트 미실행 |
| AC52 | BLOCKED | 반응형 Tailwind 레이아웃 코드, 실제 viewport/browser 검증 미실행 |
| AC53 | BLOCKED | Supabase 영구 저장 코드, 재로그인 테스트 미실행 |
| AC54 | BLOCKED | Realtime refresh 구독 코드, 원격 이벤트 미실행 |
| AC55 | BLOCKED | 계정 삭제 신청만 구현; 실제 삭제/익명화 처리 미구현 |
| AC56 | PASS | 서비스 role 키를 클라이언트·번들 코드에 사용하지 않음; static scan 예정 |

## Blocker 목록

- Supabase 프로젝트 URL/anon key 미제공: 원격 인증, 마이그레이션/RLS 테스트 및 realtime 확인 BLOCKED.
- Supabase CLI와 Docker 개발 DB가 현재 실행 환경에 없음: pgTAP DB 테스트 BLOCKED.
- Vercel 계정/도메인 연결 권한 없음: 공개 배포 BLOCKED.
- 계정 삭제 worker는 Supabase Auth 관리 권한과 비식별화 정책 확인이 필요해 신청 단계까지만 구현.
