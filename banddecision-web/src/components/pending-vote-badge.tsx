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
 return <span aria-label={'미투표 '+data+'곡'} className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-danger px-1.5 text-[13px] font-bold leading-none text-white">{data>99?'99+':data}</span>;
}
