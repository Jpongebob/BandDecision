// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({rpc:async()=>({data:null,error:null})}), getCurrentUser: async () => null }));
vi.mock('@/app/actions', () => ({ signOutAction: vi.fn() }));
vi.mock('@/app/band-login-actions', () => ({ beginBandAccessAction: vi.fn(async () => ({})) }));
import LoginPage from '../src/app/login/page';
afterEach(cleanup);
describe('code-only onboarding', () => {
  it('offers band code/password and band creation without any email entry', async () => {
    const view = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByLabelText('밴드 코드')).toBeTruthy();
    expect(screen.getByRole('link', { name: '새 밴드 만들기' }).getAttribute('href')).toBe('/bands/new');
    expect(view.container.querySelector('input[type="email"]')).toBeNull();
    expect(screen.queryByText('기존 이메일 로그인')).toBeNull();
  });
  it('preserves shareable band-code invite prefilling', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({code:'abcdef1234'}) }));
    expect((screen.getByLabelText('밴드 코드') as HTMLInputElement).value).toBe('ABCDEF1234');
  });
});
