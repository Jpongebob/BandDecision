import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
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
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
import { beginBandAccessAction, memberPinLoginAction, registerBandProfileAction, unlockBandAdminAction } from '../src/app/band-login-actions';

function form(values: Record<string, string>) {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'device', is_anonymous: true } }, error: null });
  mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  mocks.signInAnonymously.mockResolvedValue({ error: null });
});
describe('band login actions', () => {
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
  it('does not report administrator unlock success when the DB rejects the PIN', async () => {
    mocks.rpc.mockResolvedValue({ data: { error: 'BAD_PIN' }, error: null });
    const result = await unlockBandAdminAction({}, form({ admin_pin: '123456' }));
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
