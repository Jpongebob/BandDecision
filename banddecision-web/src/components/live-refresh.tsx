'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRefreshScheduler } from '@/lib/refresh-scheduler';

export function LiveRefresh({bandId=null}:{bandId?:string|null}) {
  const router = useRouter();
  useEffect(() => {
    let client;
    try { client = createClient(); } catch { return; }
    const refresh = createRefreshScheduler(() => router.refresh());
    const schedule = () => {
      if (document.visibilityState !== 'hidden') refresh.schedule();
    };
    // All planning writes bump the band revision: avoid a refresh for every child row.
    const channel = bandId ? client.channel('banddecision:'+bandId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table:'bands', filter:'id=eq.'+bandId }, schedule).subscribe() : null;
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      refresh.dispose();
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', schedule);
      if(channel)void client.removeChannel(channel);
    };
  }, [router,bandId]);
  return null;
}
