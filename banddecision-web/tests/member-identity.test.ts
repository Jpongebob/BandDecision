import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
import { getCurrentUser } from '../src/lib/supabase/server';

function client(identity: unknown, rpcError: unknown = null, signedIn = true) {
  return {
    auth: { getClaims: vi.fn(async () => (signedIn ? { data: { claims: { sub: 'device-id', is_anonymous: true } }, error: null } : { data: null, error: null })) },
    rpc: vi.fn(async () => ({ data: identity, error: rpcError })),
  };
}
type Database = Parameters<typeof getCurrentUser>[0];
describe('canonical member identity', () => {
  it('queries band data as the PIN-verified member instead of the device Auth ID', async () => {
    const db = client({ id: 'member-id', nickname: '기타', admin_unlocked: false });
    expect(await getCurrentUser(db as unknown as Database)).toMatchObject({ id: 'member-id', nickname: '기타', adminUnlocked: false });
  });
  it('rejects a guest without a verified identity', async () => {
    expect(await getCurrentUser(client(null) as unknown as Database)).toBeNull();
  });
  it('fails closed rather than falling back to a raw device ID when identity resolution fails', async () => {
    expect(await getCurrentUser(client(null, { message: 'DB unavailable' }) as unknown as Database)).toBeNull();
  });
  it('rejects a session whose JWT fails signature verification without querying identity data', async () => {
    const db = client({ id: 'member-id', nickname: '기타', admin_unlocked: false });
    db.auth.getClaims.mockResolvedValueOnce({ data: null, error: { message: 'Invalid JWT signature' } } as never);
    expect(await getCurrentUser(db as unknown as Database)).toBeNull();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('does not query private identity data without a verified Auth user', async () => {
    const db = client(null, null, false);
    expect(await getCurrentUser(db as unknown as Database)).toBeNull();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
