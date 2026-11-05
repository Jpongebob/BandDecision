import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }));
import { GET } from '../src/app/auth/callback/route';

beforeEach(() => mocks.exchange.mockResolvedValue({ error: null }));
describe('email callback return origin', () => {
  it('keeps malicious backslash redirects on the application origin', async () => {
    const response = await GET(new NextRequest('https://band.example/auth/callback?code=test&next=' + encodeURIComponent('/\\evil.example')));
    expect(response.headers.get('location')).toBe('https://band.example/dashboard');
  });
  it('preserves the intended legacy invitation after code exchange', async () => {
    const response = await GET(new NextRequest('https://band.example/auth/callback?code=test&next=' + encodeURIComponent('/join/invite-token')));
    expect(response.headers.get('location')).toBe('https://band.example/join/invite-token');
  });
});
