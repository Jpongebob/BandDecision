'use client';
import {useState,useTransition} from 'react';
import {setPlanAttendance} from '@/app/live-actions';
import {dayLabel,timeRangeLabel} from '@/lib/day-format';

export type AttendanceMember={id:string;nickname:string;part:string;leader:boolean;noDates:boolean};
type Toast={previous:string[];version:number};
const seg='min-h-11 min-w-[58px] rounded-[10px] px-2.5 text-[15px] ';
const off=seg+'border border-line-strong bg-white font-semibold text-ink-2';
// 참석자 수정 (밴드장): 단톡방 등 앱 밖에서 들은 불참을 반영한다. 저장하면 그 멤버의 달력도 같이 바뀐다.
export function PlanAttendanceEditor({plan,members,attending}:{plan:{id:string;version:number;date:string;start:string;end:string};members:AttendanceMember[];attending:string[]}){
 const key=plan.version+':'+attending.join(',');
 const[seen,setSeen]=useState(key),[saved,setSaved]=useState(attending),[current,setCurrent]=useState(attending),[version,setVersion]=useState(plan.version);
 const[toast,setToast]=useState<Toast|null>(null),[error,setError]=useState(''),[pending,start]=useTransition();
 // Fresh server data (after a save or from another device) replaces the local copy.
 if(seen!==key){setSeen(key);setSaved(attending);setCurrent(attending);setVersion(plan.version);}
 const on=(id:string)=>current.includes(id);
 const changed=members.filter(m=>on(m.id)!==saved.includes(m.id));
 const count=members.filter(m=>on(m.id)).length;
 function set(id:string,value:boolean){setToast(null);setError('');setCurrent(c=>value?[...new Set([...c,id])]:c.filter(x=>x!==id));}
 function save(next:string[],undo:boolean){
  start(async()=>{
   const result=await setPlanAttendance({plan:plan.id,version,attending:next});
   if(!result.ok){setError(result.error??'저장하지 못했어요.');return;}
   const previous=saved;setSaved(next);setCurrent(next);setVersion(result.version!);
   setToast(undo?null:{previous,version:result.version!});
  });
 }
 return <div className="flex flex-col">
 <p className="text-[15px] text-ink-2">{dayLabel(plan.date)} · {timeRangeLabel(plan.start,plan.end)}</p>
 <div className="mb-1 mt-3 flex flex-wrap items-center justify-between gap-2"><span className="whitespace-nowrap rounded-full bg-plan-bg px-2.5 py-1 text-[13px] font-bold text-plan-ink">{count}/{members.length}명 참석</span><span className="text-sm text-ink-2">단톡방 등으로 받은 불참을 여기서 바꿔요</span></div>
 <ul aria-label="참석 여부" className="flex flex-col">{members.map(m=>{const yes=on(m.id),moved=yes!==saved.includes(m.id);return <li key={m.id} data-attendance-member={m.id} className="flex items-center gap-2.5 border-b border-line py-2.5">
  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[15px] font-bold text-ink-2">{[...m.nickname][0]}</span>
  <span className="flex min-w-0 grow flex-col"><span className="flex flex-wrap items-center gap-1.5"><b className="text-base font-bold">{m.nickname}</b><span className="text-sm text-muted">{m.part}</span>{m.leader&&<span className="rounded-md bg-brand-tint px-1.5 text-[13px] font-bold text-brand-ink">밴드장</span>}{moved&&<span className="rounded-md border border-dashed border-faint bg-white px-1.5 text-[13px] font-bold text-ink-2">바뀜</span>}</span>
   {m.noDates&&<span className="text-sm text-ink-2"><span aria-hidden="true" className="mb-px mr-1.5 inline-block size-2.5 rounded-full border-2 border-pending align-middle"/>{Number(plan.date.slice(5,7))}월 날짜를 아직 안 냈어요</span>}</span>
  <span role="radiogroup" aria-label={m.nickname+' 참석 여부'} className="flex shrink-0 gap-1">
   <button type="button" role="radio" aria-checked={yes} disabled={pending} onClick={()=>set(m.id,true)} className={yes?seg+'border-2 border-[#12a150] bg-plan-bg font-bold text-plan-ink':off}>참석</button>
   <button type="button" role="radio" aria-checked={!yes} disabled={pending} onClick={()=>set(m.id,false)} className={!yes?seg+'border-2 border-ink-2 bg-surface-2 font-bold text-ink':off}>불참</button>
  </span></li>;})}</ul>
 <p className="mt-3 text-sm text-muted">저장하면 그 멤버 일정 달력의 이 날도 함께 바뀌어요.</p>
 {error&&<p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
 {changed.length>0&&count===0&&<p role="alert" className="mt-2 text-sm font-semibold text-danger">참석하는 멤버가 한 명은 있어야 해요.</p>}
 {changed.length>0?<div className="sticky bottom-0 -mx-5 -mb-6 mt-3 flex items-center gap-2 border-t border-line bg-white px-5 pb-6 pt-3">
  <span className="flex min-w-0 grow flex-col"><span className="text-base font-bold">{changed.length}명 바뀜</span><span className="truncate text-sm text-ink-2">{changed.map(m=>m.nickname+' → '+(on(m.id)?'참석':'불참')).join(', ')}</span></span>
  <button type="button" disabled={pending} onClick={()=>{setCurrent(saved);setError('');}} className="min-h-12 px-3 text-base font-semibold text-ink-2">초기화</button>
  <button type="button" disabled={pending||count===0} onClick={()=>save(current,false)} className="min-h-12 min-w-20 rounded-xl bg-brand px-[18px] text-base font-bold text-white enabled:hover:bg-brand-ink disabled:bg-surface-2 disabled:text-faint">{pending?'저장 중…':'저장'}</button>
 </div>:toast&&<div role="status" className="sticky bottom-6 mt-3 flex items-center justify-between gap-2 rounded-[14px] bg-ink py-1 pl-4 pr-1 text-white shadow-[0_8px_24px_rgba(16,24,40,0.24)]"><span className="text-base font-semibold">참석자를 저장했어요</span><button type="button" disabled={pending} onClick={()=>save(toast.previous,true)} className="min-h-11 rounded-lg px-3.5 text-base font-bold text-[#93b4ff] enabled:hover:bg-white/10">되돌리기</button></div>}
 </div>;
}
