'use client';
import {useRef,useState,useTransition} from 'react';
import {Check,ChevronDown,ChevronRight,Lock,SquareCheck,Trash2,X} from 'lucide-react';
import {saveAvailabilityChanges} from '@/app/live-actions';
import {dayLabel,shortDayLabel} from '@/lib/day-format';
import type {PlanDay} from '@/components/schedule-planner';

type Toast={text:string;restore:string[]};
// 가능한 날짜 목록 (bottom sheet): months fold open, single removal is undoable, several can be removed at once.
export function SavedDatesSheet({today,endDate,saved,count,total,plans,label}:{today:string;endDate:string;saved:string[];count:(day:string)=>number;total:number;plans:Map<string,PlanDay>;label:string}){
 const dialog=useRef<HTMLDialogElement>(null),[pending,start]=useTransition();
 const upcoming=saved.filter(d=>d>=today&&d<=endDate);
 const months=[...new Set(upcoming.map(d=>d.slice(0,7)))];
 const[open,setOpen]=useState<Record<string,boolean>>({[today.slice(0,7)]:true}),[bulk,setBulk]=useState(false),[picked,setPicked]=useState<string[]>([]);
 const[toast,setToast]=useState<Toast|null>(null),[error,setError]=useState('');
 function removeDays(days:string[]){
  if(!days.length||pending)return;setError('');
  start(async()=>{
   const result=await saveAvailabilityChanges({add:[],remove:days});
   if(!result.ok){setError(result.error??'빼지 못했어요.');return;}
   setPicked([]);setBulk(false);setToast({text:days.length===1?shortDayLabel(days[0])+'을 뺐어요':days.length+'일을 뺐어요',restore:days});
  });
 }
 function undo(){const t=toast;if(!t)return;start(async()=>{const result=await saveAvailabilityChanges({add:t.restore,remove:[]});if(!result.ok){setError(result.error??'되돌리지 못했어요.');return;}setToast(null);});}
 const toggle=(days:string[])=>setPicked(p=>{const all=days.every(d=>p.includes(d));return all?p.filter(d=>!days.includes(d)):[...new Set([...p,...days])].sort();});
 return <>
 <button type="button" aria-haspopup="dialog" onClick={()=>{setToast(null);setError('');dialog.current?.showModal();}} className="inline-flex min-h-11 items-center gap-0.5 text-[15px] font-bold text-brand-ink">{label}<ChevronRight size={18} aria-hidden="true"/></button>
 <dialog ref={dialog} aria-labelledby="saved-title" onClose={()=>{setBulk(false);setPicked([]);}} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="sheet">
 <div className="flex max-h-[inherit] flex-col">
 <div aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-line-strong"/>
 <div className="flex items-center justify-between py-1 pl-5 pr-3"><h2 id="saved-title" className="text-xl font-extrabold">가능한 날짜 <span className="text-brand-ink">{upcoming.length}개</span></h2><button type="button" aria-label="닫기" onClick={()=>dialog.current?.close()} className="grid size-11 place-items-center rounded-xl text-ink-2"><X size={22}/></button></div>
 <div className="flex items-center justify-between gap-2 px-5 pb-2"><span className="text-[15px] text-muted">{bulk?'뺄 날짜를 고르세요':'추가는 달력에서 해요'}{upcoming.some(d=>plans.has(d))&&' · 합주 확정일은 잠겨 있어요'}</span>{upcoming.length>0&&<button type="button" aria-pressed={bulk} onClick={()=>{setBulk(b=>!b);setPicked([]);}} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[15px] font-bold text-ink">{bulk?'취소':<><SquareCheck size={16} aria-hidden="true"/>여러 개 빼기</>}</button>}</div>
 <div className="flex flex-col gap-2.5 overflow-y-auto px-5 pb-28">
 {months.length===0&&<p className="py-6 text-center text-[15px] text-muted">아직 저장한 날짜가 없어요. 달력에서 날짜를 두 번 눌러 추가하세요.</p>}
 {months.map(m=>{const days=upcoming.filter(d=>d.startsWith(m)),removable=days.filter(d=>!plans.has(d)),isOpen=open[m]??false,allPicked=removable.length>0&&removable.every(d=>picked.includes(d));return <section key={m} aria-label={Number(m.slice(5))+'월'} className="shrink-0 overflow-hidden rounded-2xl border border-line">
  <button type="button" aria-expanded={isOpen} onClick={()=>setOpen(o=>({...o,[m]:!isOpen}))} className="flex h-14 w-full items-center gap-2.5 bg-[#f9fafb] pl-4 pr-3 text-left"><span className="text-[17px] font-bold">{Number(m.slice(5))}월</span><span className="whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-sm font-bold text-ink-2">{days.length}개</span><span className="grow"/><span className="text-sm font-semibold text-muted">{isOpen?'접기':'펼치기'}</span><ChevronDown size={20} aria-hidden="true" className={'shrink-0 text-muted transition-transform '+(isOpen?'rotate-180':'')}/></button>
  {isOpen&&<div className="pl-4 pr-3">{bulk&&removable.length>0&&<button type="button" onClick={()=>toggle(removable)} className="min-h-11 w-full border-t border-line text-left text-[15px] font-semibold text-brand-ink">{allPicked?'이 달 선택 해제':'이 달 전체 선택'}</button>}{days.map(d=>{const plan=plans.has(d),on=picked.includes(d);return <div key={d} className="flex items-center gap-2 border-t border-line py-2">
   {bulk&&plan&&<span className="grid size-11 shrink-0 place-items-center text-plan-ink"><Lock size={16} aria-hidden="true"/></span>}
   {bulk&&!plan&&<button type="button" role="checkbox" aria-checked={on} aria-label={dayLabel(d)+' 선택'} onClick={()=>toggle([d])} className={'grid size-11 shrink-0 place-items-center'}><span className={'grid size-[22px] place-items-center rounded-md border-2 '+(on?'border-danger bg-danger text-white':'border-line-strong')}>{on&&<Check size={14} strokeWidth={3}/>}</span></button>}
   <span className="flex min-w-0 grow flex-col"><span className="flex flex-wrap items-center gap-1.5"><span className="text-base font-bold">{dayLabel(d)}</span>{plan&&<span className="whitespace-nowrap rounded-md bg-plan-bg px-1.5 py-0.5 text-[13px] font-bold text-plan-ink">합주 확정</span>}</span><span className="text-[15px] text-muted">{count(d)}/{total}명 참석</span></span>
   {!bulk&&plan&&<span role="img" aria-label={dayLabel(d)+'은 합주가 확정돼서 뺄 수 없어요'} className="grid size-11 shrink-0 place-items-center text-plan-ink"><Lock size={18}/></span>}
   {!bulk&&!plan&&<button type="button" data-remove-date={d} disabled={pending} onClick={()=>removeDays([d])} aria-label={dayLabel(d)+' 빼기'} className="grid size-11 shrink-0 place-items-center rounded-xl border border-danger-line bg-white text-danger disabled:opacity-50"><Trash2 size={18}/></button>}
  </div>;})}</div>}
 </section>;})}
 {error&&<p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
 </div>
 {bulk&&<div className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-5 pb-6 pt-3"><button type="button" disabled={!picked.length||pending} onClick={()=>removeDays(picked)} className="min-h-[52px] w-full rounded-[14px] bg-danger text-[17px] font-bold text-white disabled:bg-surface-2 disabled:text-faint">{pending?'빼는 중…':'선택한 '+picked.length+'개 빼기'}</button></div>}
 {toast&&!bulk&&<div role="status" className="absolute inset-x-5 bottom-6 flex items-center justify-between gap-2 rounded-[14px] bg-ink py-1 pl-4 pr-1 text-white shadow-[0_8px_24px_rgba(16,24,40,0.24)]"><span className="text-base font-semibold">{toast.text}</span><button type="button" onClick={undo} disabled={pending} className="min-h-11 px-3.5 text-base font-bold text-[#93b4ff]">되돌리기</button></div>}
 </div>
 </dialog></>;
}
