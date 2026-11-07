import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {DeleteSongForm} from '@/components/delete-song-form';
import {SongVoteFields} from '@/components/song-vote-fields';
import {withdrawSongVoteAction,setSongConfirmationAction} from '@/app/live-actions';
import {Card,CardTitle} from '@/components/ui/card';
import {ActionForm} from '@/components/action-form';
import {difficultyAction} from '@/app/actions';
import {recommendSongs,type Participant,type SongInput} from '@/services/recommendations';

const chipBase='shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold';
function VoteBar({yes,no,total}:{yes:number;no:number;total:number}){
 const pct=(n:number)=>total?(n/total*100).toFixed(1)+'%':'0%';
 return <span aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-surface-2"><span className="bg-[#2e9e63]" style={{width:pct(yes)}}/><span className="bg-faint" style={{width:pct(no)}}/></span>;
}
function MyVoteChip({choice}:{choice?:'yes'|'no'}){
 if(!choice)return <span className={chipBase+' border border-warn-line bg-warn-bg py-[3px] text-warn-ink'}>미투표</span>;
 return <span className={chipBase+' '+(choice==='yes'?'bg-plan-bg text-plan-ink':'bg-surface-2 text-ink-2')}>내 투표 · {choice==='yes'?'찬성':'반대'}</span>;
}

// 합주곡 list cards (detailed=false) and the song detail screen (detailed=true).
export function SongList({
  memberId,participants,songs,detailed=false,difficultyEnabled=false,emptyText,canManage=false,
}:{
  bandId:string;memberId:string;participants:Participant[];songs:SongInput[];detailed?:boolean;difficultyEnabled?:boolean;emptyText?:string;canManage?:boolean;register?:boolean;
}){
 const parts=[...new Map(participants.map(p=>[p.partKey,p])).values()];
 const canVote=participants.some(p=>p.id===memberId),total=participants.length;
 const status=new Map(recommendSongs(participants,songs,difficultyEnabled).map(r=>[r.id,r]));
 const difficultyLine=(song:SongInput)=>parts.map(p=>p.part+' '+(song.difficulties[p.partKey]??'미등록')).join(' · ');
 if(songs.length===0)return <Card><CardTitle>{emptyText??'아직 등록된 후보곡이 없어요'}</CardTitle><p className="mt-2 text-[15px] text-muted">{emptyText?'전체 곡에서 내 투표를 확인하거나 바꿀 수 있어요.':'오른쪽 위 \'곡 추가\'로 첫 후보곡을 올려 보세요.'}</p></Card>;
 if(!detailed)return <section aria-label="곡 목록" className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">{songs.map(song=>{
  const yes=song.votes.filter(v=>v.choice==='yes').length,no=song.votes.filter(v=>v.choice==='no').length,mine=song.votes.find(v=>v.memberId===memberId);
  const passed=!song.confirmedAt&&status.get(song.id)?.status==='eligible',inline=!song.confirmedAt&&canVote&&!mine;
  const head=<span className="flex items-start gap-2.5"><span className="flex min-w-0 grow flex-col"><span className="flex flex-wrap items-center gap-1.5"><span className="break-words text-base font-bold">{song.title}</span>{passed&&<span className="whitespace-nowrap rounded-md bg-brand-tint px-1.5 py-0.5 text-[13px] font-bold text-brand-ink">통과</span>}{song.confirmedAt&&<span className="whitespace-nowrap rounded-md bg-plan-bg px-1.5 py-0.5 text-[13px] font-bold text-plan-ink">확정곡</span>}</span><span className="break-words text-[15px] text-muted">{song.artist}</span></span>{!song.confirmedAt&&<MyVoteChip choice={mine?.choice}/>}<ChevronRight size={20} aria-hidden="true" className="shrink-0 self-center text-faint"/></span>;
  const stats=!song.confirmedAt&&<><VoteBar yes={yes} no={no} total={total}/><span className="text-[13px] text-muted">찬성 {yes} · 반대 {no} · 응답 {yes+no}/{total}</span></>;
  return <div key={song.id} data-song-id={song.id} className={'flex flex-col gap-2.5 border-b border-line p-4 last:border-b-0 '+(inline?'bg-[#fffbf5]':'')}>
   <Link href={`/songs/${song.id}`} className="flex flex-col gap-2.5 text-ink">{head}{stats}{song.confirmedAt&&<span className="text-[13px] text-muted">추가 투표 없이 합주 계획에서 바로 고를 수 있어요{difficultyEnabled?' · '+difficultyLine(song):''}</span>}{!song.confirmedAt&&difficultyEnabled&&<span className="text-[13px] text-muted">{difficultyLine(song)}</span>}</Link>
   {inline&&<SongVoteFields key={memberId} songId={song.id} compact/>}
  </div>;
 })}</section>;

 return <div className="flex flex-col gap-3">{songs.map(song=>{
  const yes=song.votes.filter(v=>v.choice==='yes').length,no=song.votes.filter(v=>v.choice==='no').length,mine=song.votes.find(v=>v.memberId===memberId);
  const passed=!song.confirmedAt&&status.get(song.id)?.status==='eligible',requiredYes=Math.ceil(2*total/3);
  return <div key={song.id} data-song-id={song.id} className="flex flex-col gap-3">
   <section className="flex flex-col gap-1.5 px-1"><span className={'self-start whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-bold '+(song.confirmedAt?'bg-plan-bg text-plan-ink':passed?'bg-brand-tint text-brand-ink':'bg-seg text-ink-2')}>{song.confirmedAt?'확정곡':passed?'투표 통과':'후보곡'}</span><h1 className="break-words text-2xl font-extrabold leading-8">{song.title}</h1><p className="break-words text-[17px] font-semibold text-ink-2">{song.artist}</p></section>
   {song.confirmedAt&&<p className="rounded-2xl bg-plan-bg px-4 py-3 text-[15px] font-semibold text-plan-ink">확정곡이에요. 추가 투표 없이 합주 계획에서 바로 고를 수 있어요.</p>}
   {!song.confirmedAt&&canVote&&<Card aria-label="내 투표" className="flex flex-col gap-3 p-4"><div className="flex items-center justify-between"><h2 className="text-[17px] font-bold">내 투표</h2><span className={'rounded-full px-2.5 py-1 text-[13px] font-bold '+(mine?'bg-brand-tint text-brand-ink':'bg-surface-2 text-muted')}>{mine?(mine.choice==='yes'?'찬성으로':'반대로')+' 저장됨':'아직 안 함'}</span></div>
    <SongVoteFields key={memberId} songId={song.id} choice={mine?.choice} reason={mine?.reason}/>
    {mine&&<ActionForm action={withdrawSongVoteAction} submit="내 투표 취소" variant="ghost" className="gap-1"><input type="hidden" name="song_id" value={song.id}/></ActionForm>}</Card>}
   {!song.confirmedAt&&<Card aria-label="투표 현황" className="flex flex-col gap-2.5 p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[17px] font-bold">투표 현황</h2><span className="text-[15px] font-semibold text-ink-2">찬성 {yes} · 반대 {no} · 응답 {yes+no}/{total}</span></div><VoteBar yes={yes} no={no} total={total}/><p className="text-sm text-muted">모두 투표하고 찬성이 {requiredYes}명(2/3) 이상이면 &apos;통과&apos;예요.</p>
    <ul className="flex flex-col">{participants.map(p=>{const v=song.votes.find(x=>x.memberId===p.id);return <li key={p.id} className="flex items-start gap-2.5 border-t border-line py-2"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-ink-2">{p.id===memberId?'나':[...p.nickname][0]}</span><span className="flex min-w-0 grow flex-col"><span className="text-base font-semibold">{p.id===memberId?'나':p.nickname} <span className="text-sm font-medium text-muted">{p.part}</span></span>{v?.choice==='no'&&v.reason&&<span className="break-words text-[15px] text-muted">“{v.reason}”</span>}</span><span className={chipBase+' '+(v?.choice==='yes'?'bg-plan-bg text-plan-ink':v?.choice==='no'?'bg-surface-2 text-ink-2':'border border-dashed border-line-strong bg-white py-[3px] text-muted')}>{v?.choice==='yes'?'찬성':v?.choice==='no'?'반대':'아직'}</span></li>;})}</ul></Card>}
   {difficultyEnabled&&<Card className="p-4"><details open><summary className="cursor-pointer text-[17px] font-bold">파트별 난이도 <span className="text-[15px] font-normal text-muted">{difficultyLine(song)}</span></summary><div className="mt-3">
    {parts.length?<div className="grid gap-2 sm:grid-cols-2">{parts.map(part=>{const meta=song.difficultyMeta?.[part.partKey];return <ActionForm key={part.partKey} action={difficultyAction} submit={`${part.part} 난이도 저장`} variant="secondary" className="rounded-xl bg-surface-2 p-3">
     <input type="hidden" name="song_id" value={song.id}/><input type="hidden" name="part_key" value={part.partKey}/><input type="hidden" name="expected_version" value={meta?.version??0}/>
     <label className="text-[15px] font-semibold">{part.part}<select key={meta?.version??0} name="difficulty" defaultValue={song.difficulties[part.partKey]??''} required className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-2"><option value="" disabled>난이도 선택</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
     {meta&&<p className="text-[13px] text-muted">마지막 수정: {meta.updatedBy??'알 수 없는 멤버'} · {new Date(meta.updatedAt).toLocaleString('ko-KR')} · v{meta.version}</p>}
    </ActionForm>;})}</div>:<p className="text-[15px] text-muted">등록된 밴드 파트가 없어요.</p>}
   </div></details></Card>}
   {canManage&&<Card aria-label="곡 관리" className="flex flex-col gap-2.5 p-4"><h2 className="text-[17px] font-bold">곡 관리</h2><p className="text-sm text-muted">확정·삭제는 밴드장만 할 수 있어요.</p>
    <ActionForm action={setSongConfirmationAction} submit={song.confirmedAt?'확정 해제':'이 곡 확정하기'} variant="secondary" className="gap-2"><input type="hidden" name="song_id" value={song.id}/><input type="hidden" name="confirmed" value={song.confirmedAt?'false':'true'}/><p className="text-sm text-muted">{song.confirmedAt?'해제하면 후보곡으로 돌아가요. 이미 정한 합주 계획은 그대로예요.':'밴드장이 정한 곡은 투표 결과와 상관없이 합주 계획에 넣을 수 있어요.'}</p></ActionForm>
    <DeleteSongForm songId={song.id} title={song.title} artist={song.artist}/></Card>}
  </div>;
 })}</div>;
}
