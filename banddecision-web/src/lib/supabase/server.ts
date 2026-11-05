import type { BandSnapshot } from '@/lib/band-context';
import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { io } from 'next/cache';

export const createClient = cache(async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  // Exclude SDK clock reads from prerendering without forcing navigation-only I/O.
  await io();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; src/proxy.ts refreshes them.
        }
      },
    },
  });
});

// Share only inside the current React server request. Never cache a verified user globally.
export const getVerifiedAuthUser=cache(async(client:NonNullable<Awaited<ReturnType<typeof createClient>>>)=>{
 const{data:{user},error}=await client.auth.getUser();return error?null:user;
});

// Resolve the PIN-verified canonical profile. Raw anonymous Auth IDs are device sessions only.
export const getCurrentUser = cache(async function getCurrentUser(client: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  const user = await getVerifiedAuthUser(client);
  if (!user) return null;
  const { data, error: identityError } = await client.rpc('current_band_identity');
  const identity = data as { id: string; nickname: string; band_id: string | null; admin_unlocked: boolean; code_enabled?: boolean; context_version?: number; member?: BandSnapshot['member']; band?: BandSnapshot['band'] } | null;
  if (identityError || !identity) return null;
  const bandContext: BandSnapshot | undefined = identity.context_version === 1
    ? { actorId: identity.id, member: identity.member ?? null, band: identity.band ?? null } : undefined;
  return { id: identity.id, nickname: identity.nickname, bandContext,
    is_anonymous: user.is_anonymous, adminUnlocked: identity.admin_unlocked, codeLoginEnabled: identity.code_enabled ?? Boolean(user.is_anonymous) };
});
