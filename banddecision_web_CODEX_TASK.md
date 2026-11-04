# Codex 전체 개발 일괄 요청문 — BandDecision Web v3.1

아래 블록을 그대로 Codex 채팅 첫 메시지로 붙여 넣거나, **"프로젝트 루트의 CODEX_TASK.md를 읽고 이 작업을 수행해"**라고 전달한다. 이 문서는 단계별 승인 없이 가능한 모든 개발을 **한 번의 작업 요청**으로 진행하도록 명시한다.

---

## Codex에게 보낼 명령

BandDecision이라는 밴드 합주 의사결정 **반응형 웹서비스를 처음부터 완성도 높은 동작 가능한 상태까지 구현**해 주세요.

### 1. 먼저 읽을 파일

- `SPEC.md`: 반드시 전체를 읽으세요. **기능·알고리즘·DB·보안·AC01~AC60의 최종 계약**입니다.
- `AGENTS.md`: 코딩, 보안, 테스트, 진행 기록 규칙입니다.
- `CODEX_TASK.md`: 지금 요청한 전체 개발 범위와 종료 조건입니다.

프로젝트 루트에 코드가 없으면 신규 Next.js 프로젝트를 생성하세요. 기존 코드가 있으면 먼저 상태를 확인하고 안전하게 이어서 구현하세요.

### 2. 기술과 제품 범위

- **Next.js App Router + React + TypeScript(strict)**
- **Tailwind CSS + shadcn/ui**
- **Supabase Auth + PostgreSQL + RLS + Realtime**
- **Vercel 배포 준비**
- 앱 설치 필요 없는 모바일 우선 반응형 웹 (PC 사용 가능)
- Expo/React Native/Java 콘솔 앱은 이번 구현에 사용하지 마세요.
- 멤버 수는 고정값 6명이 아닌 **유동 N명**. 같은 파트 여러 멤버 지원.
- 밴드장과 일반 멤버 역할 분리. 각 멤버가 자기 불가능 날짜와 자기 투표를 입력.
- 회차별 60일 날짜 추천, N명 제출 확인, TOP 5+전체 보기.
- 후보곡 난이도·투표·추천: N명 전원투표, 찬성 `ceil(2N/3)`, 점수 `찬성×3−총 부담×2`.
- 밴드장만 합주 날짜와 1개 이상의 곡을 **서버 최신 정보로 재검증 후 확정**.
- RLS/초대 1회용 토큰/원자적 데이터 갱신/확정 스냅샷이 필수입니다.

### 3. 전체 단계 **모두 한 번에 수행**

**Phase 0.** 기능 계약 검토, 상세 PostgreSQL 테이블·관계·index·check 제약, Supabase SQL 마이그레이션, RLS 정책, 인증된 RPC/서버 함수 설계와 구현.

**Phase 1.** Next.js 프로젝트 초기화, Tailwind/shadcn/ui, Supabase SSR Auth, 이메일 회원가입/로그인/로그아웃/비밀번호 재설정, 닉네임 프로필, 보호 경로.

**Phase 2.** 밴드 생성, 밴드장 권한, 일회용 초대 링크, 가입/중복 방지, 유동 멤버 목록, 같은 파트 중복 허용, 실력 변경, 멤버 탈퇴·내보내기·리더 이양의 보안 검증.

**Phase 3.** 60일 기획 회차 생성, 참여자 스냅샷, 회차 무효화, 불가능 날짜 달력/빠른 입력/사유/수정/일괄 저장, `pending/submitted/none` 제출 상태.

**Phase 4.** 날짜 추천 알고리즘과 모바일 TOP 5/전체 조회, 참석·불참 상세, 부분 참석 경고, 유효 기간/동률/0명 제외 처리.

**Phase 5.** 후보곡 등록, 파트별 난이도, 회차별 멤버 찬반 투표/반대 사유, 곡 추천 자격·부담·점수·정렬 및 UI.

**Phase 6.** 밴드장 날짜/곡 선택, 확인 화면, `expected_version` 기반 경쟁 상태 방지, 서버 원자적 재검증, 확정된 참석자·곡의 독립 스냅샷, 최신 1건 조회, 실시간 변경 반영.

**Phase 7.** 폼 예외/로딩/빈 상태/반응형 UI/접근성/계정 삭제, 단위·통합 테스트, RLS 테스트 안내, 린트·타입·빌드 검증, README/환경변수·Vercel·Supabase 배포 문서.

**중요: Phase 0~1까지만 하고 완료하지 마세요.** 외부 승인 없이 가능한 코드/SQL/테스트/문서 작업을 전부 연속적으로 진행하세요. 단계별 승인 요청이나 "다음 단계 진행할까요?" 질문 없이 **Phase 7까지 진행**하는 것이 이번 요청의 핵심입니다.

### 4. 실제 구현 우선, 안전한 예외

- 계획 문서만 만들고 구현을 끝내면 안 됩니다. 실제 라우트, 폼, 쿼리, migration, 서버 RPC, 테스트를 작성하세요.
- 외부 Supabase 프로젝트 URL/키가 없으면 `.env.example`, 로컬 모킹/단위 테스트, 실제 SQL 파일, 설정 안내까지 만들고 가능한 코드를 완료하세요. **없는 비밀키를 만들거나 실제 연동에 성공했다고 주장하지 마세요.**
- 실제 유료 리소스 생성, 타인의 데이터 파괴, 실서비스 DB migration, 공개 배포 등은 명시적인 사용자의 승인 없이 실행하지 마세요. 나머지 개발은 계속하세요.
- 사소한 애매함은 SPEC.md를 최대한 일관되게 해석하여 진행하고 `PROGRESS.md`에 기록하세요. 중요한 권한/보안 정책을 약화하는 임의 변경은 금지합니다.
- 구현한 척하는 placeholder, 더미 화면만 있는 메뉴, 성공 메시지만 내는 API를 완성 기능으로 보고하지 마세요.
- 사용자에게 요구되지 않은 기능(채팅/결제/음원 스트리밍 등)을 추가하지 마세요.

### 5. 필수 산출물

- 실행 가능한 Next.js 소스코드 전체
- `supabase/migrations/*.sql` (제약, 인덱스, RLS, RPC 포함)
- `.env.example` 및 `.gitignore`
- `README.md` (설치, 개발 실행, 테스트, 계정·DB 연결)
- `DEPLOYMENT.md` (Supabase 초기화, 인증 redirect URL, Vercel 환경 변수와 배포)
- `PROGRESS.md` (Phase별 실제 구현/검증, 미구현·BLOCKED 기록)
- 단위 테스트(날짜 계산/곡 점수/동률/입력 예외)와 가능한 API/권한 통합 테스트
- `SPEC.md` AC01~AC60 검증 상태표

### 6. 필수 검사와 완료 보고

실행 가능한 환경이라면 아래 검사를 직접 수행하세요.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

가능하다면 Supabase 로컬 DB/migration 검사 및 권한 정책 테스트도 실행하세요. 실행 불가하면 필요한 설정·명령·사유를 보고하고 `BLOCKED`로 표시하세요.

최종 보고는 한국어로 작성하여 **실제로 동작하는 기능**, **실제로 수행한 테스트 결과**, **외부 설정이 없어서 검증하지 못한 기능**, **로컬 실행법**, **Vercel 배포 방법**을 명확히 구분해 주세요.

**작업 목표:** 앱스토어용 앱이 아닌, URL만 공유하면 밴드 멤버들이 모바일/PC에서 접속해 실제로 사용할 수 있는 BandDecision 웹서비스의 전체 구현입니다.


## v3.1 song permissions update

- Any active band member may register a candidate song and create or edit per-part difficulty for songs in their own band. The band leader retains member management and final plan confirmation.
- Difficulty writes use an authenticated membership-checked RPC and optimistic `expected_version`; store `updated_by`, `updated_at`, and a monotonically increasing version. Reject stale writes rather than overwriting another member's change.
- A difficulty change refreshes the active round's recommendation version but never mutates an already confirmed plan snapshot.
- Direct table DML remains revoked. RLS policies and server RPC checks must prevent cross-band access. Availability and votes remain self-only.
- Add tests for ordinary-member song creation, difficulty create/edit, modifier/time/version metadata, stale conflict rejection, and cross-band denial.

## v3.2 band-code login update (2026-11-05)

Default onboarding uses band code/shared password followed by member profile/6-digit PIN. Creation issues a random band code and distinct personal/admin PINs. Keep Supabase Auth device sessions and canonical server-side identity mappings, RLS ownership, same-band isolation, hashed secrets, persistent failed-attempt throttling, and revocation. Leader management and final confirmation require a 30-minute administrator elevation for code sessions. Preserve email login at /login/email for existing account migration and recovery. Do not rewrite existing profile IDs or rehearsal snapshots. Add a new migration, meaningful action/unit and database authorization tests, and setup documentation. Do not claim integration success without actual verification.
