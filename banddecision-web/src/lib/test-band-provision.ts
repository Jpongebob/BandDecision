import { createClient as createIsolatedClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonymousSignInError } from '@/lib/auth-errors';
import { bandLoginErrors } from '@/lib/band-login-validation';
export type TestSetup = { code: string; prepared: boolean; members: {slot:string;nickname:string;part:string}[] };
export async function prepareTestMembers(leader: SupabaseClient, password: string, pin: string): Promise<string|null> {
 const {data,error}=await leader.rpc('test_band_setup_status');
 const setup=data as TestSetup|null;
 if(error||!setup)return '테스트 밴드의 밴드장으로 접속해 주세요.';
 if(setup.prepared)return null;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return 'Supabase 연결 설정을 확인해 주세요.';
 const existing=new Set(setup.members.map(member=>member.slot));
 for(const slot of ['guitar2','bass','drums','vocal']){
  if(existing.has(slot))continue;
  // Real anonymous Auth accounts, isolated from the leader's cookies; no service-role key.
  const member=createIsolatedClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try {
   const signup=await member.auth.signInAnonymously();
   if(signup.error)return anonymousSignInError(signup.error);
   const access=await member.rpc('begin_band_access',{p_code:setup.code,p_password:password});
   if(access.error||access.data?.error)return bandLoginErrors[access.data?.error]??'공용 비밀번호와 접속 상태를 확인해 주세요.';
   const joined=await member.rpc('register_test_member',{p_slot:slot,p_pin:pin});
   if(joined.data?.error==='TEST_PIN_MISMATCH')return '앞서 준비한 테스트 멤버와 같은 공통 PIN을 입력하세요.';
   if(joined.error||joined.data?.error)return bandLoginErrors[joined.data?.error]??'테스트 멤버를 준비하지 못했습니다. 같은 화면에서 다시 이어서 준비하세요.';
  } catch {
   return '테스트 멤버 접속 중 연결이 끊겼습니다. 같은 화면에서 다시 이어서 준비하세요.';
  } finally {
   // These are anchor identities; keep their records, discard provisioning sessions.
   await Promise.allSettled([member.rpc('end_band_session')]);
   await Promise.allSettled([member.auth.signOut({scope:'local'})]);
  }
 }
 const prepared=await leader.rpc('prepare_test_band');
 if(prepared.error||prepared.data?.error)return '5인 테스트 회차를 준비하지 못했습니다. 실제 멤버가 섞이지 않았는지 확인하고 다시 시도하세요.';
 return null;
}
