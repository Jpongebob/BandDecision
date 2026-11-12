'use client';
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';

export type BoardRow={id:string;label:string;month:number;day:number;weekday:string;time:string;sub:string;tags:React.ReactNode};
// PC (lg and up): the plans as a short list on the left and the chosen one in full on the right.
// Details are rendered on the server; only the chosen one is mounted.
export function PlanBoard({rows,details,pastRows,pastDetails,empty}:{rows:BoardRow[];details:React.ReactNode[];pastRows:BoardRow[];pastDetails:React.ReactNode[];empty:React.ReactNode}){
 const[sel,setSel]=useState<{past:boolean;id:string|null}>({past:false,id:null});
 const[showPast,setShowPast]=useState(false);
 // Keep the choice by id; after a delete or a new plan fall back to the first upcoming one.
 const index=(sel.past?pastRows:rows).findIndex(r=>r.id===sel.id);
 const past=sel.past&&index>=0,current=index>=0?index:0;
 const detail=past?pastDetails[current]:details[current]??null;
 const item=(r:BoardRow,i:number,isPast:boolean)=>{
  const on=past===isPast&&current===i&&(isPast||rows.length>0);
  return <button type="button" key={r.id} data-plan-row={r.id} aria-pressed={on} aria-label={r.label} onClick={()=>setSel({past:isPast,id:r.id})} className={'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left '+(on?'bg-brand-tint before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-brand':'hover:bg-surface-2')}>
   <span aria-hidden="true" className="flex w-[42px] shrink-0 flex-col items-center leading-tight"><span className="text-[11px] font-semibold text-muted">{r.month}월</span><span className={'text-[22px] font-extrabold tracking-tight '+(on?'text-brand-ink':isPast?'text-ink-2':'text-ink')}>{r.day}</span><span className="text-[11px] font-semibold text-muted">{r.weekday}</span></span>
   <span className="flex min-w-0 grow flex-col gap-0.5"><span className="truncate text-sm font-bold">{r.time}</span><span className="truncate text-[13px] text-muted">{r.sub}</span></span>
   <span className="flex shrink-0 flex-col items-end gap-1">{r.tags}</span>
  </button>;
 };
 return <div className="hidden lg:grid lg:grid-cols-[348px_minmax(0,1fr)] lg:items-start lg:gap-5">
  <section aria-label="합주 목록" className="flex flex-col rounded-2xl bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
   <h2 className="px-3 pb-1.5 pt-3 text-xs font-bold text-muted">예정된 합주</h2>
   {rows.length?rows.map((r,i)=>item(r,i,false)):<p className="px-3 pb-3 text-sm text-muted">아직 정해진 합주가 없어요.</p>}
   {pastRows.length>0&&<>
    <button type="button" aria-expanded={showPast} onClick={()=>setShowPast(v=>!v)} className="mx-1.5 mt-2 flex min-h-11 items-center justify-between rounded-lg border-t border-line px-1.5 text-[13px] font-semibold text-muted">지난 합주 {pastRows.length}개<ChevronDown size={16} aria-hidden="true" className={showPast?'rotate-180':''}/></button>
    {showPast&&pastRows.map((r,i)=>item(r,i,true))}
   </>}
  </section>
  <section aria-label="합주 상세" className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">{rows.length||past?detail:empty}</section>
 </div>;
}
