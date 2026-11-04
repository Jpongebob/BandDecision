# BandDecision Web

모바일 브라우저 우선 반응형 밴드 합주 계획 서비스입니다. Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui 스타일 컴포넌트, Supabase SSR Auth/PostgreSQL/RLS/Realtime을 사용합니다.

## 프로젝트 위치

앱 코드는 `banddecision-web/`에 있습니다. 개발 명령은 해당 폴더에서 실행합니다. 입력으로 제공된 사양은 루트의 `banddecision_web_SPEC.md`, `banddecision_web_AGENTS.md`, `banddecision_web_CODEX_TASK.md`입니다.

## 로컬 실행

1. Node.js 20 이상을 준비합니다.
2. `banddecision-web/.env.example`을 `.env.local`로 복사하고 Supabase URL, anon key, 사이트 URL을 설정합니다.
3. `cd banddecision-web`
4. `npm install`
5. `npm run dev`
6. 브라우저에서 `http://localhost:3000`을 엽니다.

설정 없이도 랜딩·인증 화면은 열리며, 인증된 밴드 화면은 Supabase 설정 안내를 표시합니다. 실제 로그인과 데이터 변경은 Supabase 프로젝트가 필요합니다.

## 검사

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

단위 테스트는 일정 텍스트 파서와 날짜/곡 추천 함수를 다룹니다. DB 권한 테스트는 `supabase/tests/database/security.test.sql`에 있고 Supabase 로컬 DB가 필요합니다.

## 구현 범위와 제한

- 밴드 생성·초대 링크 발급/사용, 리더 관리, 멤버 탈퇴, 실력·파트 수정
- 60일 회차, 불가능 날짜 입력/제출, 날짜 추천, 곡·난이도·투표, 점수 추천, 계획 확인/확정 스냅샷
- 모든 데이터 테이블 RLS, 직접 DML 차단, 권한 확인 RPC, 회차 잠금/version, Realtime 재조회
- 계정 삭제는 신청 기록을 만드는 단계까지 구현했습니다. 실제 Auth 사용자 삭제와 개인정보 익명화 작업은 서버 운영 절차가 연결되어 있지 않아 아직 수행되지 않습니다.

Phase별 검증 상태는 루트 `PROGRESS.md`를 확인하세요.
