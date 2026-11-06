'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRefreshScheduler } from '@/lib/refresh-scheduler';

export function LiveRefresh({bandId=null}:{bandId?:string|null}) {
  const router = useRouter();
  useEffect(() => {
    if(!bandId)return;
    let client;
    try { client = createClient(); } catch { return; }
    let wasHidden=document.visibilityState==='hidden';
    const refresh=createRefreshScheduler(()=>{
      if(document.visibilityState==='hidden'){wasHidden=true;return;}
      router.refresh();
    });
    const schedule=()=>{
      if(document.visibilityState==='hidden'){wasHidden=true;return;}
      refresh.schedule();
    };
    const visibilityChanged=()=>{
      if(document.visibilityState==='hidden'){wasHidden=true;return;}
      if(wasHidden){wasHidden=false;refresh.schedule();}
    };
    // All planning writes bump the band revision: avoid a refresh for every child row.
    let subscribed=false;
    const channel=client.channel('banddecision:'+bandId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table:'bands', filter:'id=eq.'+bandId }, schedule).subscribe(status=>{
        if(status==='SUBSCRIBED'){if(subscribed)schedule();subscribed=true;}
      });
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      refresh.dispose();
      document.removeEventListener('visibilitychange', visibilityChanged);
      if(channel)void client.removeChannel(channel);
    };
  }, [router,bandId]);
  return null;
}
