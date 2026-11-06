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

비밀번호와 전체 연결 문자열은 채팅, Git, 로그 파일에 남기지 않는다. Supabase Dashboard의 Connect 화면에서 Session pooler 연결 문자열을 복사해 현재 PowerShell 세션의 환경변수로만 설정한다.

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

## 현재 블로커

- 서울 리전의 새 Supabase 프로젝트 정보가 아직 제공되지 않았다.
- 기존/신규 DB 연결 문자열은 프로젝트 소유자가 Dashboard에서 받아 로컬 환경변수로 입력해야 한다.

공식 참고: [리전 변경](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z), [CLI 백업 및 복원](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Auth 사용자 이전](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects).
