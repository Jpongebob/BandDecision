# Supabase 서울 리전 이전

현재 프로젝트의 Auth 사용자 UUID는 `profiles`, `bands`, `band_members`와 연결되어 있다. 새 프로젝트에 마이그레이션 SQL만 다시 적용하면 기존 멤버가 끊기므로 `auth`, `public`, `private` 데이터를 포함한 전체 논리 백업·복원을 사용한다.

## 1. 새 프로젝트 준비

1. Supabase에서 빈 프로젝트를 만들고 리전을 **Northeast Asia (Seoul), `ap-northeast-2`**로 선택한다.
2. 새 프로젝트의 Authentication 설정에서 **Allow anonymous sign-ins**를 켠다.
3. 현재 운영 사이트 주소를 Auth Site URL로 설정한다.
4. 새 프로젝트에는 기존 `supabase/migrations`를 먼저 실행하지 않는다. 전체 복원 파일에 스키마와 데이터가 함께 들어간다.
5. 기존 프로젝트는 이전 검증이 끝날 때까지 삭제하거나 정지하지 않는다.

## 2. 설치된 로컬 도구

- Docker Desktop: `D:\Apps\Docker`, 엔진 29.9.2 동작 확인
- Docker 가상디스크: `D:\DockerData`
- Supabase CLI 3.0.0: `D:\Apps\SupabaseCLI`
- PostgreSQL 클라이언트 17.11: `D:\Apps\PostgreSQL17\pgsql\bin` (`psql`, `pg_dump` 실행 확인)

사용자 PATH에 위 실행 경로를 추가했다. 설치 전부터 열려 있던 터미널이나 IDE는 다시 열어야 변경된 PATH를 인식할 수 있다. PostgreSQL 서버 서비스는 생성하지 않았다.

비밀번호와 전체 연결 문자열은 채팅, Git, 로그 파일에 남기지 않는다. 기존/서울 프로젝트 각각의 Connect 화면에서 Session pooler URI(5432)를 준비하고 아래 입력 도구를 실행한다. URI의 `[YOUR-PASSWORD]`는 그대로 두고, 비밀번호는 별도 숨김 프롬프트에 입력한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare-region-connections.ps1
```

도구는 `.migration/seoul/connections.clixml`에 현재 Windows 사용자만 복호화할 수 있는 DPAPI 방식으로 비밀번호를 저장한다. DB에는 접속하지 않는다. 이후 백업·복원 단계에서 이 파일을 읽어 연결 문자열을 조립할 수 있다. 아래 환경변수 예시는 직접 작업하는 경우의 대안이며 출력이나 로그를 남기지 않는다.

```powershell
$env:BANDDECISION_OLD_DB_URL = Read-Host '기존 DB 연결 문자열'
$env:BANDDECISION_NEW_DB_URL = Read-Host '서울 DB 연결 문자열'
```

## 3. 운영 쓰기 중단 및 백업

전환 직전에 멤버에게 잠시 사용 중단을 알린다. 백업과 Vercel 전환 사이에 작성된 데이터는 새 프로젝트에 포함되지 않는다.

```powershell
New-Item -ItemType Directory -Force .migration\seoul | Out-Null
supabase db dump --remote="$env:BANDDECISION_OLD_DB_URL" -f .migration\seoul\roles.sql --role-only
supabase db dump --remote="$env:BANDDECISION_OLD_DB_URL" -f .migration\seoul\schema.sql
supabase db dump --remote="$env:BANDDECISION_OLD_DB_URL" -f .migration\seoul\data.sql --use-copy --data-only -x storage.buckets_vectors,storage.vector_indexes
```

`.migration/`은 비밀 또는 사용자 데이터가 포함될 수 있으므로 Git에 추가하지 않는다.

## 4. 서울 프로젝트로 복원

```powershell
psql --single-transaction --variable ON_ERROR_STOP=1 `
  --file .migration\seoul\roles.sql `
  --file .migration\seoul\schema.sql `
  --command 'SET session_replication_role = replica' `
  --file .migration\seoul\data.sql `
  --dbname "$env:BANDDECISION_NEW_DB_URL"
```

복원 중 `supabase_admin` 소유권 또는 `cli_login_postgres` 권한 오류가 발생하면 임의로 계속하지 말고 공식 Supabase 복원 안내의 해당 오류 처리 절차를 적용한다.

## 5. 검증 및 웹 전환

1. 기존 프로젝트와 서울 프로젝트에서 `banddecision-web/supabase/checks/seoul_migration_verify.sql`을 각각 실행하고 개수와 UUID를 비교한다. `orphan_*` 값은 모두 0이어야 한다.
2. 서울 프로젝트에서 Realtime publication의 `band_song_votes` 등록을 확인한다.
3. Vercel Preview에 새 프로젝트의 URL과 publishable/anon key를 설정한다.
4. 직접 입장, 기존 멤버 PIN 로그인, 일정 조회, 가능 날짜 저장, 곡 투표, 밴드장 계획 저장을 Preview에서 확인한다.
5. 기존 JWT 서명과 새 프로젝트 서명이 다르므로 기존 브라우저 세션은 유지되지 않을 수 있다. 사용자는 새 프로젝트에서 익명 세션을 다시 만든 뒤 기존 프로필과 PIN으로 한 번 로그인하면 된다.
6. 검증이 끝난 뒤 Production의 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 서울 프로젝트 값으로 교체하고 재배포한다.
7. 전환 후에도 기존 인도 프로젝트는 복구 기간 동안 보존한다.

## 2026-11-06 복원 결과와 남은 전환

- 기존 `ejodiyhxkftgoaryfzrq`에서 서울 `wxtwuyexsjqxpqnxeheq`로 역할·스키마·전체 데이터를 복원했다. 기존 DB는 변경하지 않았다.
- 로컬 `.migration/seoul/`에 백업, 암호화된 연결 정보와 검증 결과를 보관했다. Git 제외 상태를 유지한다.
- 앱 테이블 25개와 auth.users/auth.identities의 행 수·내용 해시가 일치한다. Auth 사용자 36, 활성 멤버 6, 곡 7, 가능 날짜 101, 확정 계획 2. 고아 프로필·멤버·밴드장 0.
- 함수 73개, RLS 정책 21개, 테이블 권한 25개, 트리거 12개, Realtime 테이블 10개, public/private의 postgres 기본 권한이 일치한다.
- 첫 복원은 중복 publication 등록으로 롤백되었다. 이미 등록된 테이블을 건너뛰도록 보완한 두 번째 복원이 성공했다.
- 새 프로젝트 기본 권한의 추가분을 기존 DB 권한으로 보정했다. 실제 적용한 SQL은 로컬 `reconcile-permissions.sql`에 보관하며 복원 도구가 파일이 있으면 함께 적용한다.
- 웹의 vercel.json을 서울 `icn1`으로 준비했다. Git commit/push 및 Vercel 배포는 하지 않았다. 운영 웹은 기존 환경변수로 뭄바이 DB에 연결되어 있다.
- 서울 프로젝트의 Allow anonymous sign-ins, Site URL, API 키와 Vercel 환경변수 전환은 프로젝트 소유자 설정이 필요하다. 실제 웹/PIN 로그인 검증과 Production 전환은 아직 하지 않았다.
- 최종 웹 전환 직전에 `scripts/region-migration.ps1 -Phase Verify`를 다시 실행한다. 기존 DB에 신규 입력이 생겨 내용이 달라졌다면 최신 데이터 동기화 후 전환한다.

## 2026-11-06 서울 API 및 로컬 웹 확인

- 사용자 제공 publishable key로 Auth 설정의 익명 로그인 활성화, 공개 입장 명단 6명, ES256 JWKS를 확인했다.
- 임시 익명 기기를 생성해 실제 Supabase SDK signInAnonymously와 getClaims를 검증했다. PIN 미검증 기기의 planning/identity RPC가 NULL을 반환함을 확인했다. 해당 migration_probe UUID 계정 1개만 삭제하고 다시 데이터 지문 일치를 확인했다.
- Git 제외 `.env.local`에 서울 URL과 공개 키를 설정했다. 타입 검사·린트·Next 프로덕션 빌드(19개 경로)가 통과했다.
- Vercel 프로젝트 연결/인증은 이 체크아웃에 없다. 소유자가 Vercel Settings > Environment Variables에서 NEXT_PUBLIC_SUPABASE_URL을 https://wxtwuyexsjqxpqnxeheq.supabase.co, NEXT_PUBLIC_SUPABASE_ANON_KEY를 서울 publishable key로 변경해야 한다. NEXT_PUBLIC_SITE_URL은 기존 운영 도메인 유지.
- vercel.json의 icn1 변경을 환경변수 전환과 함께 배포한다. Preview에서 본인 프로필/PIN으로 확인한 뒤 Production을 전환한다. 실제 개인 PIN 로그인과 운영 배포는 아직 미검증이다.

공식 참고: [리전 변경](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z), [CLI 백업 및 복원](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Auth 사용자 이전](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects).
