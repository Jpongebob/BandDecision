import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getActiveMember} from '@/lib/band-context';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {loadLivePlanning} from '@/lib/live-planning';
import {SongList} from '@/components/song-list';
export default async function SongDetailPage({params}:{params:Promise<{id:string}>}){
 const{id}=await params;if(!/^\d+$/.test(id))notFound();
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;
 const{data:me,error}=await getActiveMember(db,user.id,user.bandContext);if(error)throw new Error('DATA_LOAD_FAILED');if(!me)notFound();
 const data=await loadLivePlanning(db,me.band_id),song=data.songs.find(s=>s.id===Number(id));if(!song)notFound();
 return <div className="space-y-4"><Link href="/songs" className="text-sm font-semibold text-blue-700">← 후보곡</Link><SongList difficultyEnabled={data.skill_enabled===true} detailed canManage={me.role==='leader'} bandId={me.band_id} memberId={me.id} participants={data.members} songs={[song]}/></div>;
}
