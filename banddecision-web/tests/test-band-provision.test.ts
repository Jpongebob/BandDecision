import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const s=vi.hoisted(()=>({create:vi.fn(),signup:vi.fn(),rpc:vi.fn(),signout:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:s.create}));
import { prepareTestMembers } from '../src/lib/test-band-provision';
type Leader=Parameters<typeof prepareTestMembers>[0];
const leaderRpc=vi.fn();
function leader(members:{slot:string}[]=[],prepared=false){
 leaderRpc.mockImplementation(async(name:string)=>name==='test_band_setup_status'?{data:{code:'ABCDEF1234',members,prepared},error:null}:{data:{ok:true},error:null});
 return {rpc:leaderRpc} as unknown as Leader;
}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('ENABLE_TEST_BANDS','true');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','test-public-key');
 s.signup.mockResolvedValue({data:{user:{id:'new-auth-user'}},error:null});
 s.rpc.mockResolvedValue({data:{ok:true},error:null});s.signout.mockResolvedValue({error:null});
 s.create.mockReturnValue({auth:{signInAnonymously:s.signup,signOut:s.signout},rpc:s.rpc});
});
afterEach(()=>vi.unstubAllEnvs());
describe('real Auth API test-member preparation',()=>{
 it('creates four isolated authenticated accounts then atomically prepares the five-person round',async()=>{
  expect(await prepareTestMembers(leader(),'password','246810')).toBeNull();
  expect(s.signup).toHaveBeenCalledTimes(4);
  expect(s.create.mock.calls[0][2].auth.persistSession).toBe(false);
  expect(s.rpc).toHaveBeenCalledWith('register_test_member',{p_slot:'guitar2',p_pin:'246810'});
  expect(s.rpc).toHaveBeenCalledWith('begin_band_access',{p_code:'ABCDEF1234',p_password:'password'});
  expect(leaderRpc).toHaveBeenCalledWith('prepare_test_band');
  expect(s.signout).toHaveBeenCalledTimes(4);
 });
 it('resumes only missing slots without duplicating existing members',async()=>{
  expect(await prepareTestMembers(leader([{slot:'guitar2'},{slot:'bass'}]),'password','246810')).toBeNull();
  expect(s.signup).toHaveBeenCalledTimes(2);
 });
 it('does not rewrite a prepared test round',async()=>{
  expect(await prepareTestMembers(leader([],true),'password','246810')).toBeNull();
  expect(s.signup).not.toHaveBeenCalled();expect(leaderRpc).not.toHaveBeenCalledWith('prepare_test_band');
 });
 it('stops on provider rate limiting and does not prepare an incomplete roster',async()=>{
  const db=leader();s.signup.mockResolvedValue({error:{code:'over_request_rate_limit',status:429}});
  expect(await prepareTestMembers(db,'password','246810')).toBeTruthy();
  expect(s.signup).toHaveBeenCalledOnce();expect(leaderRpc).not.toHaveBeenCalledWith('prepare_test_band');
 });
 it('rejects a non-test band without creating any accounts',async()=>{
  leaderRpc.mockResolvedValue({data:null,error:null});
  expect(await prepareTestMembers({rpc:leaderRpc} as unknown as Leader,'password','246810')).toBeTruthy();
  expect(s.signup).not.toHaveBeenCalled();
 });
});
