import {createClient} from '@/lib/supabase/server';
import {cache} from 'react';

const loadCount=cache(async()=>{
 try{
 const db=await createClient();if(!db)return 0;
 const{data,error}=await db.rpc('band_pending_vote_count');
 return !error&&typeof data==='number'&&Number.isInteger(data)&&data>0?data:0;
 }catch{return 0;}
});

// Rendered in Suspense so the menu and page never wait for this optional count.
export async function PendingVoteBadge(){
 const data=await loadCount();if(!data)return null;
 return <span aria-label={'미투표 '+data+'곡'} className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{data>99?'99+':data}</span>;
}
