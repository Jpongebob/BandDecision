import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), prepare: vi.fn(),
  getUser: vi.fn(),
  signInAnonymously: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error('redirect:' + path); }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser, signInAnonymously: mocks.signInAnonymously },
  })),
}));
vi.mock('@/lib/test-band-provision',()=>({prepareTestMembers:mocks.prepare}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
import { directMemberPinLoginAction,directRegisterBandProfileAction,setDirectBandEntryAction,beginBandAccessAction, memberPinLoginAction, registerBandProfileAction, createCodeBandAction, configureBandLoginAction, createTestBandAction } from '../src/app/band-login-actions';

function form(values: Record<string, string>) {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepare.mockResolvedValue(null);
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'device', is_anonymous: true } }, error: null });
  mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  mocks.signInAnonymously.mockResolvedValue({ error: null });
});
describe('band login actions', () => {
  it.each([
    [{ code: 'anonymous_provider_disabled', status: 422 }, '익명 로그인이 꺼져'],
    [{ code: 'signup_disabled', status: 422 }, '새 사용자 생성이 차단'],
    [{ code: 'captcha_failed', status: 400 }, 'CAPTCHA'],
    [{ status: 429 }, '요청 제한'],
    [{ status: 401 }, '연결 키'],
    [{ code: 'unexpected_failure', status: 500 }, '트리거'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, '연결하지 못했습니다'],
    [{ code: 'unknown_reason', status: 422 }, 'unknown_reason'],
  ])('shows a useful, sanitized Auth failure before any band RPC: %j', async (failure, expected) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.signInAnonymously.mockResolvedValue({ error: { ...failure, message: 'PRIVATE_PROVIDER_DETAILS' } });
    const result = await beginBandAccessAction({}, form({ code: 'AB12CD34EF', password: '1234' }));
    expect(result.error).toContain(expected);
    expect(result.error).toContain('인증 오류:');
    expect(result.error).not.toContain('PRIVATE_PROVIDER_DETAILS');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('creates an Auth guest before the band-password RPC when no session exists', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(beginBandAccessAction({}, form({ code: ' ab12cd34ef ', password: '1234' }))).rejects.toThrow('redirect:/login/member');
    expect(mocks.signInAnonymously).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('begin_band_access', { p_code: 'AB12CD34EF', p_password: '1234' });
  });
  it('does not replace an existing email account with a guest', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { is_anonymous: false } }, error: null });
    const result = await beginBandAccessAction({}, form({ code: 'AB12CD34EF', password: 'shared-password' }));
    expect(result.error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.signInAnonymously).not.toHaveBeenCalled();
  });
  it('does not advance to member selection on failed band credentials', async () => {
    mocks.rpc.mockResolvedValue({ data: { error: 'BAD_BAND_CREDENTIALS' }, error: null });
    expect((await beginBandAccessAction({}, form({ code: 'AB12CD34EF', password: 'incorrect' }))).error).toContain('밴드 코드');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('ignores client-supplied role, actor and band IDs during profile registration', async () => {
    await expect(registerBandProfileAction({}, form({ nickname: '베이스', part: '베이스', pin: '001234', role: 'leader', user_id: 'victim', band_id: 'other-band' }))).rejects.toThrow('redirect:/dashboard');
    expect(mocks.rpc).toHaveBeenCalledWith('register_band_profile', { p_nickname: '베이스', p_part: '베이스', p_pin: '001234' });
  });
  it('does not accept an invalid PIN before calling the server', async () => {
    const result = await memberPinLoginAction({}, form({ member: '00000000-0000-4000-8000-000000000001', pin: '12345' }));
    expect(result.error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

});


describe('isolated test band creation action', () => {
 it('rejects a shared demo PIN equal to the leader personal PIN',async()=>{
  expect((await createTestBandAction({},form({nickname:'Me',password:'test1234',pin:'112233',member_pin:'112233'}))).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('retains the created test band and offers resumable setup when provisioning is interrupted',async()=>{
  mocks.rpc.mockResolvedValue({data:{ok:true},error:null});
  mocks.prepare.mockResolvedValue('rate limited');
  await expect(createTestBandAction({},form({nickname:'Me',password:'test1234',pin:'112233',member_pin:'246810'}))).rejects.toThrow('redirect:/bands/test?notice=setup_incomplete');
 });
 it('validates credentials before starting an anonymous session', async () => {
   expect((await createTestBandAction({}, form({nickname:'Me',password:'123',pin:'112233',member_pin:'246810'}))).error).toBeTruthy();
   expect(mocks.rpc).not.toHaveBeenCalled();
   expect(mocks.signInAnonymously).not.toHaveBeenCalled();
 });
 it('uses the transactional fixture RPC then enters the new leader dashboard', async () => {
   mocks.rpc.mockResolvedValue({data:{ok:true,code:'ABCDEF1234'},error:null});
   await expect(createTestBandAction({},form({nickname:'My test',password:'test1234',pin:'112233',member_pin:'246810'}))).rejects.toThrow('redirect:/dashboard');
   expect(mocks.rpc).toHaveBeenCalledWith('create_test_band',{p_nickname:'My test',p_password:'test1234',p_pin:'112233'});
   expect(mocks.revalidatePath).toHaveBeenCalledWith('/','layout');
 });
 it('does not redirect or report success when an existing band blocks fixture creation', async () => {
   mocks.rpc.mockResolvedValue({data:{error:'ALREADY_SIGNED_IN'},error:null});
   const result=await createTestBandAction({},form({nickname:'My test',password:'test1234',pin:'112233',member_pin:'246810'}));
   expect(result.error).toBeTruthy();
   expect(result.success).toBeUndefined();
   expect(mocks.revalidatePath).not.toHaveBeenCalled();
 });
});

it('creates a normal band using only a shared password and personal PIN',async()=>{await expect(createCodeBandAction({},form({name:'Our band',nickname:'Me',part:'기타',password:'1234',pin:'001234'}))).rejects.toThrow('redirect:/settings/band');expect(mocks.rpc).toHaveBeenCalledWith('create_code_band',{p_name:'Our band',p_nickname:'Me',p_part:'기타',p_password:'1234',p_pin:'001234'});});
it('rotates shared password without collecting an administrator PIN',async()=>{expect((await configureBandLoginAction({},form({password:'next1234'}))).success).toBeTruthy();expect(mocks.rpc).toHaveBeenCalledWith('configure_band_login',{p_password:'next1234'});});

describe('optional direct profile start',()=>{
 it('creates guest identity only on submit and verifies personal PIN through direct RPC',async()=>{
  mocks.getUser.mockResolvedValue({data:{user:null},error:null});
  await expect(directMemberPinLoginAction({},form({member:'f3000000-0000-4000-8000-000000000001',pin:' 112 233 '}))).rejects.toThrow('redirect:/dashboard');
  expect(mocks.signInAnonymously).toHaveBeenCalledOnce();
  expect(mocks.rpc).toHaveBeenCalledWith('direct_member_pin_login',{p_member:'f3000000-0000-4000-8000-000000000001',p_pin:'112233'});
 });
 it('does not request a band grant on malformed PIN input',async()=>{
  expect((await directMemberPinLoginAction({},form({member:'bad',pin:'123'}))).error).toBeTruthy();expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('handles mode disabled while form was open without redirecting to dashboard',async()=>{
  mocks.rpc.mockResolvedValue({data:{error:'DIRECT_ENTRY_DISABLED'},error:null});
  expect((await directMemberPinLoginAction({},form({member:'f3000000-0000-4000-8000-000000000001',pin:'112233'}))).error).toContain('밴드 코드');expect(mocks.redirect).not.toHaveBeenCalled();
 });
 it('registers new profile using current configured band only',async()=>{
  await expect(directRegisterBandProfileAction({},form({nickname:'New',part:'드럼',pin:'246810'}))).rejects.toThrow('redirect:/dashboard');
  expect(mocks.rpc).toHaveBeenCalledWith('direct_register_band_profile',{p_nickname:'New',p_part:'드럼',p_pin:'246810'});
 });
 it('validates on/off state and calls leader-authorized settings RPC',async()=>{
  expect((await setDirectBandEntryAction({},form({enabled:'yes'}))).error).toBeTruthy();expect(mocks.rpc).not.toHaveBeenCalled();
  expect((await setDirectBandEntryAction({},form({enabled:'true'}))).success).toBeTruthy();expect(mocks.rpc).toHaveBeenCalledWith('set_direct_band_entry',{p_enabled:true});
  expect((await setDirectBandEntryAction({},form({enabled:'false'}))).success).toBeTruthy();expect(mocks.rpc).toHaveBeenCalledWith('set_direct_band_entry',{p_enabled:false});
 });
});
