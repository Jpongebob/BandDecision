import Link from 'next/link';
import {VoteBar} from '@/components/vote-bar';
import {recommendSongs,type Participant,type SongInput} from '@/services/recommendations';
import {difficultyAverageLabel} from '@/lib/difficulty';

// PC (lg and up): the songs as a table; a row opens its detail beside the table (?song=id).
export function SongTable({songs,participants,memberId,difficultyEnabled,selected,hrefFor,emptyText}:{songs:SongInput[];participants:Participant[];memberId:string;difficultyEnabled:boolean;selected:number|null;hrefFor:(id:number)=>string;emptyText:string}){
 const total=participants.length,status=new Map(recommendSongs(participants,songs,difficultyEnabled).map(r=>[r.id,r])),partKeys=participants.map(p=>p.partKey);
 const cols='grid grid-cols-[minmax(0,1fr)_136px_88px_84px] items-center gap-3 px-[18px]';
 return <section aria-label="곡 표" className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
  <div aria-hidden="true" className={cols+' h-10 border-b border-line text-xs font-bold text-muted'}><span>곡</span><span>투표</span><span>난이도</span><span>내 투표</span></div>
  {songs.length===0?<p className="px-[18px] py-8 text-sm text-muted">{emptyText}</p>:songs.map(song=>{
   const yes=song.votes.filter(v=>v.choice==='yes').length,no=song.votes.filter(v=>v.choice==='no').length,mine=song.votes.find(v=>v.memberId===memberId);
   const passed=!song.confirmedAt&&status.get(song.id)?.status==='eligible',on=selected===song.id;
   return <Link key={song.id} href={hrefFor(song.id)} scroll={false} data-song-row={song.id} aria-current={on?'true':undefined} className={cols+' relative min-h-[62px] border-b border-line py-2 last:border-b-0 '+(on?'bg-brand-tint before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand':!song.confirmedAt&&!mine?'bg-[#fffbf5] hover:bg-surface-2':'hover:bg-surface-2')}>
    <span className="flex min-w-0 flex-col gap-0.5"><span className="flex min-w-0 items-center gap-1.5"><b className="truncate text-[15px] font-bold">{song.title}</b>{passed&&<span className="shrink-0 rounded-md bg-brand-tint px-1.5 py-0.5 text-xs font-bold text-brand-ink">통과</span>}{song.confirmedAt&&<span className="shrink-0 rounded-md bg-plan-bg px-1.5 py-0.5 text-xs font-bold text-plan-ink">확정곡</span>}</span><span className="truncate text-[13px] text-muted">{song.artist}{song.createdByNickname?' · '+song.createdByNickname+' 올림':''}</span></span>
    {song.confirmedAt?<span className="text-xs text-muted">투표 없이 고를 수 있어요</span>:<span className="flex flex-col gap-1 text-xs font-semibold text-muted"><VoteBar yes={yes} no={no} total={total}/>찬성 {yes} · 반대 {no} · {yes+no}/{total}</span>}
    <span className={'text-[13px] '+(difficultyEnabled?'font-semibold text-ink-2':'text-faint')}>{difficultyEnabled?difficultyAverageLabel(song.difficulties,partKeys).replace('평균 난이도','평균').replace('난이도 미입력','미입력'):'—'}</span>
    <span className="justify-self-start">{song.confirmedAt?<span className="text-xs text-faint">—</span>:mine?<span className={'rounded-md px-2 py-0.5 text-xs font-bold '+(mine.choice==='yes'?'bg-plan-bg text-plan-ink':'bg-seg text-ink-2')}>{mine.choice==='yes'?'찬성':'반대'}</span>:<span className="rounded-md bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn-ink">미투표</span>}</span>
   </Link>;})}
 </section>;
}
