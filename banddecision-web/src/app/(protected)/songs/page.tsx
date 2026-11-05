import Link from 'next/link';
import {getActiveMember} from '@/lib/band-context';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {loadLivePlanning} from '@/lib/live-planning';
import {SongList} from '@/components/song-list';
import {Card,CardTitle} from '@/components/ui/card';
export default async function SongsPage(){
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;
 const{data:me,error}=await getActiveMember(db,user.id,user.bandContext);if(error)throw new Error('DATA_LOAD_FAILED');if(!me)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const data=await loadLivePlanning(db,me.band_id);
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">합주곡</h1><p className="mt-2 text-sm text-slate-500">현재 멤버들의 투표와 파트 난이도로 추천합니다. 내 투표는 수정할 때까지 유지됩니다.</p><Link href="/songs/recommendations" className="mt-3 inline-block text-sm font-semibold text-blue-700">곡 추천 보기 →</Link></div><SongList bandId={me.band_id} memberId={me.id} participants={data.members} songs={data.songs}/></div>;
}
