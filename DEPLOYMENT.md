# Supabase 및 Vercel 배포

## Supabase 설정

1. Supabase 프로젝트를 준비하고 Auth 이메일 가입/확인을 설정합니다.
2. Authentication → URL Configuration에서 Site URL을 실제 도메인으로 설정하고 다음 redirect URL을 허용합니다.
   - `http://localhost:3000/auth/callback`
   - `https://<배포 도메인>/auth/callback`
3. 로컬 개발은 Supabase CLI로 실행합니다.

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

4. 원격 DB 적용은 프로젝트를 링크한 다음 마이그레이션을 검토하고 실행합니다.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`supabase/migrations/`의 SQL을 변경하기 전에는 별도 개발 DB에서 RLS 테스트를 실행하세요. 이 저장소에는 실서비스 URL이나 키가 포함되어 있지 않습니다.

## 권한 설계

- 브라우저/SSR에는 Supabase anon key만 사용하고 직접 쓰기는 허용하지 않습니다.
- 데이터 쓰기는 authenticated 세션의 RPC로 처리합니다. 각 `SECURITY DEFINER` 함수는 `search_path=''`와 `auth.uid()`/밴드 역할 검증을 사용합니다. 비로그인 `inspect_invite`는 토큰에 해당하는 밴드명과 유효 여부만 반환합니다.
- `private` 스키마는 `supabase/config.toml`의 API 노출 목록에 없습니다. 공개 스키마의 쓰기 함수는 권한 검사를 통과해야 하며, 모든 테이블은 RLS를 활성화합니다.
- Realtime 구독은 이벤트를 다시 읽으라는 신호로만 사용합니다. 밴드 테이블 SELECT의 RLS가 데이터를 보호합니다.
- `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`를 두지 않습니다. 현재 앱은 service role 키를 사용하지 않습니다.

## Vercel

1. 저장소를 Vercel에 연결하고 Root Directory를 `banddecision-web`로 설정합니다.
2. Preview와 Production에 각각 환경 변수를 등록합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (각 환경의 사이트 URL)
3. 배포 후 Supabase Auth 허용 redirect URL에 Vercel 도메인을 추가합니다.
4. Preview 계정으로 신규 가입/이메일 확인/로그인, 교차 밴드 RLS, 모바일/데스크톱, Realtime을 확인한 후 Production으로 승격합니다.

이 작업에서는 Supabase 계정, Vercel 권한, 실제 도메인이 연결되지 않아 원격 마이그레이션과 배포를 수행하지 않았습니다.
