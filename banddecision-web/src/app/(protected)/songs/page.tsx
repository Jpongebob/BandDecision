import Link from 'next/link';
import {ChevronRight,Star} from 'lucide-react';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage} from '@/lib/live-planning';
import {SongList} from '@/components/song-list';
import {SongTable} from '@/components/song-table';
import {AddSongSheet} from '@/components/add-song-sheet';
import {Card,CardTitle} from '@/components/ui/card';
import {recommendSongs} from '@/services/recommendations';
type View='confirmed'|'candidates'|'unvoted';
export default async function SongsPage({searchParams=Promise.resolve({})}:{searchParams?:Promise<{view?:string;song?:string}>}={}){
 const db=await createClient();if(!db)return null;
 const params=await searchParams;
 // PC: ?song=id shows that song beside the table (its own lean detail query, like the phone detail page).
 const songId=/^\d{1,15}$/.test(params.song??'')&&Number(params.song)>0?Number(params.song):null;
 const[page,detail]=await Promise.all([loadVerifiedPlanningPage(db,'songs'),songId?loadVerifiedPlanningPage(db,'songs',false,songId).catch(()=>null):Promise.resolve(null)]);
 if(!page)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const{data,member:me}=page,leader=me.role==='leader';
 const view:View=params.view==='unvoted'||params.view==='confirmed'?params.view:'candidates';
 const confirmed=data.songs.filter(s=>s.confirmedAt),candidates=data.songs.filter(s=>!s.confirmedAt),unvoted=candidates.filter(s=>!s.votes.some(v=>v.memberId===me.id));
 const passed=recommendSongs(data.members,data.songs,data.skill_enabled===true).filter(s=>!s.confirmedAt&&s.status==='eligible').length;
 const shown=view==='confirmed'?confirmed:view==='unvoted'?unvoted:candidates;
 const tab=(v:View,label:string,count:number)=><Link href={v==='candidates'?'/songs':'/songs?view='+v} aria-current={view===v?'page':undefined} className={'flex min-h-11 items-center justify-center gap-1.5 rounded-[9px] text-base '+(view===v?'bg-white font-bold text-brand-ink shadow-[0_1px_3px_rgba(16,24,40,0.12)]':'font-semibold text-ink-2')}>{label}{v==='unvoted'&&count>0?<span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-danger px-1.5 text-[13px] font-bold text-white">{count}</span>:<span className="tabular-nums">{count}</span>}</Link>;
 const detailSong=detail?.data.songs.find(x=>x.id===songId)??null;
 const pcHref=(id:number)=>'/songs?'+(view==='candidates'?'':'view='+view+'&')+'song='+id;
 return <div className="mx-auto flex max-w-xl flex-col gap-3 lg:max-w-none lg:gap-4">
 <div className="flex items-start justify-between gap-3 px-1"><div><h1 className="text-2xl font-extrabold leading-8">합주곡</h1><p className="mt-1 text-base text-muted">투표로 함께 고르고, 밴드장이 확정해요.</p></div><AddSongSheet bandId={me.band_id}/></div>
 {passed>0&&<Link href="/songs/recommendations" className="flex items-center gap-3 rounded-2xl bg-brand-tint px-4 py-3.5 text-ink"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><Star size={20} aria-hidden="true"/></span><span className="flex min-w-0 grow flex-col"><span className="text-base font-bold">투표 통과 {passed}곡</span><span className="text-[15px] text-ink-2">모두 투표했고 찬성이 2/3 이상이에요. 밴드장이 합주에 넣을 수 있어요.</span></span><ChevronRight size={20} aria-hidden="true" className="shrink-0 text-brand-ink"/></Link>}
 <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_404px] lg:items-start lg:gap-5">
 <div className="flex min-w-0 flex-col gap-3">
 <nav aria-label="곡 분류" className="grid grid-cols-3 gap-1 rounded-xl bg-seg p-1">{tab('confirmed','확정곡',confirmed.length)}{tab('candidates','후보곡',candidates.length)}{tab('unvoted','미투표',unvoted.length)}</nav>
 {view==='unvoted'&&<p className="px-1 text-[15px] text-muted">내가 아직 투표하지 않은 곡 {unvoted.length}개예요.</p>}
 <div className="lg:hidden"><SongList difficultyEnabled={data.skill_enabled===true} canManage={leader} emptyText={view==='unvoted'?'미투표 곡이 없어요':view==='confirmed'?'아직 확정된 곡이 없어요':undefined} bandId={me.band_id} memberId={me.id} participants={data.members} songs={shown}/></div>
 <div className="hidden lg:block"><SongTable songs={shown} participants={data.members} memberId={me.id} difficultyEnabled={data.skill_enabled===true} selected={detailSong?.id??null} hrefFor={pcHref} emptyText={view==='unvoted'?'미투표 곡이 없어요':view==='confirmed'?'아직 확정된 곡이 없어요':'아직 등록된 후보곡이 없어요'}/></div>
 {view!=='confirmed'&&shown.length>0&&<div aria-hidden="true" className="flex flex-wrap gap-3.5 px-1 text-[13px] text-muted"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-[#2e9e63]"/>찬성</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[3px] bg-faint"/>반대</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[3px] border border-line-strong bg-surface-2"/>미응답</span></div>}
 </div>
 <aside aria-label="고른 곡" className="hidden min-w-0 lg:sticky lg:top-6 lg:block">{detail&&detailSong?<SongList difficultyEnabled={detail.data.skill_enabled===true} detailed canManage={leader} bandId={me.band_id} memberId={me.id} userId={page.user.id} participants={detail.data.members} songs={[detailSong]}/>:<Card className="flex min-h-48 flex-col justify-center gap-1.5 p-6 text-center"><p className="text-base font-bold">곡을 고르면 여기에서 볼 수 있어요</p><p className="text-sm text-muted">왼쪽 표에서 곡을 누르면 투표와 곡 정보가 열려요</p></Card>}</aside>
 </div>
 </div>;
}
