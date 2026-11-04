'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRefreshScheduler } from '@/lib/refresh-scheduler';

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    let client;
    try { client = createClient(); } catch { return; }
    const refresh = createRefreshScheduler(() => router.refresh());
    const schedule = () => {
      if (document.visibilityState !== 'hidden') refresh.schedule();
    };
    const channel = client.channel('banddecision-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, schedule).subscribe();
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      refresh.dispose();
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', schedule);
      void client.removeChannel(channel);
    };
  }, [router]);
  return null;
}
