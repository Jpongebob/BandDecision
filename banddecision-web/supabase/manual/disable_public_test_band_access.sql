-- 운영 Supabase SQL Editor에서 실행. 기존 밴드/멤버 데이터는 삭제하지 않습니다.
-- 로컬 QA DB에는 적용하지 않습니다. 운영에서 테스트 전용 RPC 직접 호출도 차단합니다.
begin;
revoke execute on function public.create_test_band(text,text,text) from public,anon,authenticated;
revoke execute on function public.register_test_member(text,text) from public,anon,authenticated;
revoke execute on function public.prepare_test_band() from public,anon,authenticated;
revoke execute on function public.test_band_setup_status() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

-- 결과 4행이 모두 true이면 브라우저용 역할의 실행 권한이 제거된 상태입니다.
select signature,
 not has_function_privilege('anon',signature,'EXECUTE')
 and not has_function_privilege('authenticated',signature,'EXECUTE') as blocked
from (values
 ('public.create_test_band(text,text,text)'),
 ('public.register_test_member(text,text)'),
 ('public.prepare_test_band()'),
 ('public.test_band_setup_status()')
) functions(signature);
