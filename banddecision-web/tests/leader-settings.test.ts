// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ role: 'leader', filter: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: async () => ({ data: { code: 'ABCDEF1234', role: state.role, admin_unlocked: false }, error: null }),
    from: () => {
      const q = { select: () => q, eq: (key: string, value: string) => {
        state.filter(key, value);
        return q;
      }, then: (resolve: (x: unknown) => unknown) => Promise.resolve({ data: [] }).then(resolve) };
      return q;
    },
  }),
}));
vi.mock('@/app/actions', () => ({ createInviteAction: vi.fn() }));
vi.mock('@/app/band-login-actions', () => ({ setMemberSkillEnabledAction: vi.fn(),setDirectBandEntryAction: vi.fn(), changeMemberPinAction: vi.fn(), configureBandLoginAction: vi.fn() }));
vi.mock('@/components/action-form', () => ({ ActionForm: ({ submit, children }: { submit: string; children: React.ReactNode }) => createElement('div', null, children, createElement('button', null, submit)) }));
import { BandAccessSettings } from '../src/components/band-access-settings';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('leader settings without administrator elevation', () => {
  it('reuses the already scoped roster without repeating a database query',async()=>{
    state.role='leader';render(await BandAccessSettings({bandId:'our-band',roster:[{id:'m',user_id:'u',profiles:{nickname:'Member'}}]}));
    expect(screen.getByText('Member')).toBeTruthy();expect(state.filter).not.toHaveBeenCalled();
  });

  it('shows leader tools and no unlock form even when the legacy flag is false', async () => {
    state.role = 'leader';
    render(await BandAccessSettings({ bandId: 'our-band' }));
    expect(screen.getByRole('button', { name: '간편 초대 링크 만들기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '선택한 멤버 PIN 초기화' })).toBeTruthy();
    expect(screen.queryByText('관리자 권한 잠금 해제')).toBeNull();
    expect(state.filter).toHaveBeenCalledWith('band_id', 'our-band');
  });
  it('does not expose leader tools to ordinary members', async () => {
    state.role = 'member';
    render(await BandAccessSettings({ bandId: 'our-band' }));
    expect(screen.queryByRole('button', { name: '간편 초대 링크 만들기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '선택한 멤버 PIN 초기화' })).toBeNull();
    expect(state.filter).not.toHaveBeenCalled();
  });
});
