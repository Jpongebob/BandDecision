import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = cache(async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
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

// Resolve the PIN-verified canonical profile. Raw anonymous Auth IDs are device sessions only.
export const getCurrentUser = cache(async function getCurrentUser(client: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data, error: identityError } = await client.rpc('current_band_identity');
  const identity = data as { id: string; nickname: string; band_id: string | null; admin_unlocked: boolean; code_enabled?: boolean } | null;
  if (identityError || !identity) return null;
  return { id: identity.id, email: user.email, nickname: identity.nickname,
    is_anonymous: user.is_anonymous, adminUnlocked: identity.admin_unlocked, codeLoginEnabled: identity.code_enabled ?? Boolean(user.is_anonymous) };
});
