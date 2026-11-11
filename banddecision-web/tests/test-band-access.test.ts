import {afterEach,describe,expect,it,vi} from 'vitest';
const s=vi.hoisted(()=>({client:vi.fn(),notFound:vi.fn(()=>{throw new Error('NOT_FOUND');})}));
vi.mock('next/navigation',()=>({notFound:s.notFound,redirect:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:s.client,getCurrentUser:vi.fn()}));
import {testBandsEnabled} from '../src/lib/test-band-access';
import {addTestMembersAction,createTestBandAction} from '../src/app/band-login-actions';
import TestBandPage from '../src/app/bands/test/page';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const env=(flag:string|undefined,url:string)=>{if(flag!==undefined)vi.stubEnv('ENABLE_TEST_BANDS',flag);vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',url);};

describe('test bands are local QA only',()=>{
 it('needs both the flag and a loopback Supabase address',()=>{
  env(undefined,'http://127.0.0.1:54321');vi.stubEnv('ENABLE_TEST_BANDS','');expect(testBandsEnabled()).toBe(false);
  env('false','http://127.0.0.1:54321');expect(testBandsEnabled()).toBe(false);
  env('true','https://abcdefgh.supabase.co');expect(testBandsEnabled()).toBe(false);
  for(const url of ['http://localhost:54321','http://127.0.0.1:54329','http://[::1]:54321']){env('true',url);expect(testBandsEnabled()).toBe(true);}
 });
 it('the page is not found and the actions stop before any database call when blocked',async()=>{
  env('true','https://abcdefgh.supabase.co');
  await expect(TestBandPage()).rejects.toThrow('NOT_FOUND');
  const form=new FormData();
  expect((await createTestBandAction({},form)).error).toBe('테스트 밴드 기능은 사용할 수 없습니다.');
  expect((await addTestMembersAction({},form)).error).toBe('테스트 밴드 기능은 사용할 수 없습니다.');
  expect(s.client).not.toHaveBeenCalled();
 });
});
