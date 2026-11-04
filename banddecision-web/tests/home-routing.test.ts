import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createClient: vi.fn(async () => ({})),
  redirect: vi.fn((path: string) => { throw new Error('redirect:' + path); }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient, getCurrentUser: mocks.getCurrentUser }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import Home from '../src/app/page';
import LoginPage from '../src/app/login/page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 'actor', nickname: '멤버' });
});
describe('authenticated home entry', () => {
  it('opens the dashboard directly from the site root for a signed-in member', async () => {
    await expect(Home()).rejects.toThrow('redirect:/dashboard');
  });
  it('does not show the login form again when an authenticated member opens /login', async () => {
    await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/dashboard');
  });
  it('preserves explicit invite context so another logged-in profile can switch safely', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ code: 'AB12CD34EF' }) });
    expect(page).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
