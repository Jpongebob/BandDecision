import Link from 'next/link';
import {getActiveMember} from '@/lib/band-context';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {loadLivePlanning} from '@/lib/live-planning';
import {SongList} from '@/components/song-list';
import {Card,CardTitle} from '@/components/ui/card';
export default async function SongsPage({searchParams=Promise.resolve({})}:{searchParams?:Promise<{view?:string}>}={}){
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;
 const{data:me,error}=await getActiveMember(db,user.id,user.bandContext);if(error)throw new Error('DATA_LOAD_FAILED');if(!me)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const[data,params]=await Promise.all([loadLivePlanning(db,me.band_id,'songs'),searchParams]);const unvoted=params.view==='unvoted',visible=unvoted?data.songs.filter(song=>!song.confirmedAt&&!song.votes.some(v=>v.memberId===me.id)):data.songs;
 const confirmed=data.songs.filter(song=>song.confirmedAt),candidates=visible.filter(song=>!song.confirmedAt);const leader=me.role==='leader';
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">합주곡</h1><p className="mt-2 text-sm text-slate-500">{data.skill_enabled?'현재 멤버들의 투표와 파트 난이도로 추천합니다.':'현재 멤버들의 투표로 추천합니다.'} 내 투표는 수정할 때까지 유지됩니다.</p><Link href="/songs/recommendations" className="mt-3 inline-block text-sm font-semibold text-blue-700">곡 추천 보기 →</Link></div><div className="flex gap-4 text-sm font-semibold"><Link href="/songs">전체 곡</Link><Link href="/songs?view=unvoted">미투표 곡만 보기</Link></div>{unvoted&&<p className="text-sm text-slate-600">내가 아직 투표하지 않은 곡 {visible.length}개입니다.</p>}{!unvoted&&<section aria-label="확정곡" className="space-y-3"><h2 className="text-xl font-bold">확정곡 · {confirmed.length}곡</h2><p className="text-sm text-slate-500">밴드장이 결정한 곡입니다. 합주 계획에 넣을 수 있습니다.</p>{confirmed.length?<SongList difficultyEnabled={data.skill_enabled===true} register={false} canManage={leader} bandId={me.band_id} memberId={me.id} participants={data.members} songs={confirmed}/>:<p className="text-sm text-slate-500">아직 확정된 곡이 없습니다. 곡 상세에서 밴드장이 확정할 수 있습니다.</p>}</section>}<h2 className="text-xl font-bold">{unvoted?'미투표 곡':'후보곡'}</h2><SongList difficultyEnabled={data.skill_enabled===true} canManage={leader} emptyText={unvoted?'미투표 곡이 없습니다':undefined} bandId={me.band_id} memberId={me.id} participants={data.members} songs={unvoted?visible:candidates}/></div>;
}
