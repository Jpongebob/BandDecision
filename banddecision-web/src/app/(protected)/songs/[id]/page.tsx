import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage} from '@/lib/live-planning';
import {SongList} from '@/components/song-list';
export default async function SongDetailPage({params}:{params:Promise<{id:string}>}){
 const{id}=await params;const songId=Number(id);if(!/^\d+$/.test(id)||!Number.isSafeInteger(songId)||songId<1)notFound();
 const db=await createClient();if(!db)return null;
 const page=await loadVerifiedPlanningPage(db,'songs',false,songId);if(!page)notFound();
 const{data,member:me}=page,song=data.songs.find(s=>s.id===songId);if(!song)notFound();
 return <div className="mx-auto max-w-xl"><SongList difficultyEnabled={data.skill_enabled===true} detailed canManage={me.role==='leader'} bandId={me.band_id} memberId={me.id} participants={data.members} songs={[song]}/></div>;
}
