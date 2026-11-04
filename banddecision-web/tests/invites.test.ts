import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ rpc: state.rpc })) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
import { createInviteAction } from '../src/app/actions';

const band = '20000000-0000-4000-8000-000000000001';
function form(bandId = band) { const data = new FormData(); data.set('band_id', bandId); return data; }
function setup(settings: { code: string | null; role: string; admin_unlocked: boolean }, identityBand = band) {
  state.rpc.mockImplementation(async (name: string) => {
    if (name === 'current_band_identity') return { data: { band_id: identityBand }, error: null };
    if (name === 'band_login_settings') return { data: settings, error: null };
    if (name === 'create_invite') return { data: [{ token: 'legacy-token' }], error: null };
    throw new Error('Unexpected RPC: ' + name);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://band.example');
  setup({ code: 'AB12CD34EF', role: 'leader', admin_unlocked: true });
});
afterEach(() => vi.unstubAllEnvs());

describe('invitation authentication mode', () => {
  it('invites code-enabled bands directly into the email-free code flow without a password in the URL', async () => {
    const result = await createInviteAction({}, form());
    expect(result).toEqual({ success: 'https://band.example/login?code=AB12CD34EF' });
    const link = new URL(result.success!);
    expect([...link.searchParams.keys()]).toEqual(['code']);
    expect(state.rpc.mock.calls.some(([name]) => name === 'create_invite')).toBe(false);
  });
  it.each([
    { code: 'AB12CD34EF', role: 'member', admin_unlocked: false },
    { code: 'AB12CD34EF', role: 'leader', admin_unlocked: false },
  ])('rejects invitation generation without an elevated leader: %j', async settings => {
    setup(settings);
    const result = await createInviteAction({}, form());
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
    expect(state.rpc.mock.calls.some(([name]) => name === 'create_invite')).toBe(false);
  });
  it('rejects a forged band ID even for an elevated leader of another band', async () => {
    const result = await createInviteAction({}, form('20000000-0000-4000-8000-000000000002'));
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
  });
  it('fails closed instead of silently falling back to an email invitation if settings cannot be loaded', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: 'DB offline' } });
    expect((await createInviteAction({}, form())).error).toBeTruthy();
    expect(state.rpc.mock.calls.some(([name]) => name === 'create_invite')).toBe(false);
  });
  it('retains one-use email invitations only for bands without code login', async () => {
    setup({ code: null, role: 'leader', admin_unlocked: true });
    expect(await createInviteAction({}, form())).toEqual({ success: 'https://band.example/join/legacy-token' });
    expect(state.rpc).toHaveBeenCalledWith('create_invite', { p_band: band });
  });
  it('does not emit an invalid or injected stored band code', async () => {
    setup({ code: 'https://other.example', role: 'leader', admin_unlocked: true });
    expect((await createInviteAction({}, form())).error).toBeTruthy();
  });
});
