'use client';
import {useActionState,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Check} from 'lucide-react';
import {ActionForm} from '@/components/action-form';
import {editAvailabilityAction,deleteAvailabilityAction,deleteAvailabilityDatesAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import {Card,CardTitle} from '@/components/ui/card';
import {CalendarPicker} from '@/components/date-calendar';

type Counts={attending:number;absent:number};
const modalClass='fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/40';
const controlClass='min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50';
export function SavedDates({dates,today,counts}:{dates:{date:string}[];today:string;counts:(day:string)=>Counts}){
 const[selected,setSelected]=useState<string|null>(null),dialog=useRef<HTMLDialogElement>(null),title=useId();
 const[bulk,setBulk]=useState(false),[picked,setPicked]=useState<string[]>([]),confirmation=useRef<HTMLDialogElement>(null),confirmTitle=useId();
 const existing=useMemo(()=>new Set(dates.map(row=>row.date)),[dates]);
 const chosen=picked.filter(day=>existing.has(day)),chosenSet=new Set(chosen);
 const[state,remove,pending]=useActionState(async(previous:FormState,form:FormData)=>{
  const result=await deleteAvailabilityDatesAction(previous,form);
  if(result.success){setPicked([]);setBulk(false);confirmation.current?.close();}
  return result;
 },{});
 const months=useMemo(()=>{const groups=new Map<string,string[]>();for(const row of [...dates].sort((a,b)=>a.date.localeCompare(b.date))){const month=row.date.slice(0,7);groups.set(month,[...(groups.get(month)??[]),row.date]);}return [...groups];},[dates]);
 useEffect(()=>{if(selected&&!dates.some(row=>row.date===selected)){dialog.current?.close();}},[dates,selected]);
 function close(){dialog.current?.close();setSelected(null);}
 function toggleDays(days:string[]){
  if(pending)return;
  setPicked(current=>{const next=new Set(current.filter(day=>existing.has(day))),all=days.every(day=>next.has(day));for(const day of days){if(all)next.delete(day);else next.add(day);}return [...next].sort();});
 }
 const allSelected=dates.length>0&&chosen.length===dates.length;
 return <Card>
 <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>저장된 날짜</CardTitle><span className="text-sm text-slate-500">총 {dates.length}일</span>{!bulk&&dates.length>0&&<button type="button" className={controlClass} onClick={()=>setBulk(true)}>여러 날짜 삭제</button>}</div>
 <p className="mt-2 text-sm text-slate-500">{bulk?'삭제할 날짜를 선택하세요. 전체 또는 월별로 선택할 수 있습니다.':'참석 가능한 날짜입니다. 날짜를 누르면 수정하거나 삭제할 수 있습니다.'}</p>
 {state.success&&!bulk&&<p role="status" className="mt-3 text-sm text-emerald-700">{state.success}</p>}
 {bulk&&<div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" className={controlClass} disabled={pending||dates.length===0} aria-pressed={allSelected} onClick={()=>toggleDays(dates.map(row=>row.date))}>{allSelected?'전체 선택 취소':'전체 선택'}</button><span role="status" className="text-sm font-semibold">{chosen.length}일 선택</span><button type="button" className={controlClass+' ml-auto'} disabled={pending} onClick={()=>{setBulk(false);setPicked([]);}}>취소</button></div>}
 {months.length===0?<p className="mt-4 text-sm">저장된 날짜가 없습니다.</p>:<div className="mt-4 space-y-5">{months.map(([month,days])=><section key={month} aria-label={month+' 저장된 날짜'}>
 <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">{month.slice(0,4)}년 {Number(month.slice(5))}월 <span className="text-xs font-normal text-slate-500">{days.length}일</span></h3>{bulk&&<button type="button" className={controlClass} disabled={pending} aria-label={month+' '+(days.every(day=>chosenSet.has(day))?'선택 취소':'전체 선택')} aria-pressed={days.every(day=>chosenSet.has(day))} onClick={()=>toggleDays(days)}>{days.every(day=>chosenSet.has(day))?'이 달 선택 취소':'이 달 전체 선택'}</button>}</div>
 <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{days.map(day=>{const weekday=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(day+'T12:00:00+09:00')),n=counts(day),checked=chosenSet.has(day);return <button key={day} type="button" data-saved-date={day} disabled={pending} aria-pressed={bulk?checked:undefined} aria-label={day+' '+weekday+'요일 · 참석 '+n.attending+'명 · 참석 제외 '+n.absent+'명 · '+(bulk?'삭제 날짜 선택':'수정 또는 삭제')} aria-haspopup={bulk?undefined:'dialog'} onClick={()=>{if(bulk){toggleDays([day]);return;}setSelected(day);dialog.current?.showModal();}} className={'min-h-16 min-w-0 rounded-xl border px-1 py-2 text-center focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 '+(bulk?(checked?'border-rose-500 bg-rose-50 text-rose-900':'border-slate-300 bg-white text-slate-900'):'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-600')}>
 <span className="flex items-center justify-center gap-1 text-sm font-bold">{bulk&&<span aria-hidden="true" className={'flex size-4 shrink-0 items-center justify-center rounded border '+(checked?'border-rose-600 bg-rose-600 text-white':'border-slate-400')}>{checked&&<Check className="size-3"/>}</span>}{Number(day.slice(8))}일 <span className="text-xs font-normal">({weekday})</span></span><span className="mt-1 block text-[10px]">참석 {n.attending} · 참석 제외 {n.absent}</span></button>;})}</div></section>)}</div>}
 {bulk&&<button type="button" disabled={chosen.length===0||pending} className="mt-5 min-h-11 w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white disabled:opacity-50" onClick={()=>confirmation.current?.showModal()}>선택한 {chosen.length}일 삭제</button>}
 <dialog ref={confirmation} aria-labelledby={confirmTitle} className={modalClass} onCancel={event=>{if(pending)event.preventDefault();}}>
 <h2 id={confirmTitle} className="font-bold">선택한 {chosen.length}일을 삭제할까요?</h2><p className="mt-2 text-sm text-slate-600">삭제한 날짜는 내 참석 가능한 날짜에서 제외됩니다.</p><ul className="my-4 max-h-40 overflow-y-auto text-sm">{chosen.map(day=><li key={day} className="py-1">{day}</li>)}</ul>
 <form action={remove} onReset={event=>event.preventDefault()}><input type="hidden" name="dates_json" value={JSON.stringify(chosen)}/><input type="hidden" name="confirm_delete_dates" value="yes"/>{state.error&&<p role="alert" className="mb-3 text-sm text-rose-700">{state.error}</p>}<div className="flex gap-2"><button type="button" disabled={pending} className={controlClass+' flex-1'} onClick={()=>confirmation.current?.close()}>취소</button><button type="submit" disabled={pending||chosen.length===0} className="min-h-11 flex-1 rounded-lg bg-rose-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{pending?'삭제 중…':'삭제하기'}</button></div></form></dialog>
 <dialog ref={dialog} aria-labelledby={title} onClose={e=>{if(e.target===e.currentTarget)setSelected(null);}} className={modalClass}><div className="mb-4 flex items-center justify-between gap-3"><h2 id={title} className="font-bold">저장된 날짜 수정</h2><button type="button" onClick={close} className="min-h-11 px-2 text-sm font-semibold text-blue-700">닫기</button></div>
 {selected&&<div key={selected} data-saved-editor={selected}><p className="mb-4 text-sm font-semibold">{selected}</p><ActionForm action={editAvailabilityAction} submit="수정 저장"><input type="hidden" name="old_date" value={selected}/><SavedDatePicker value={selected} today={today} savedDates={dates}/></ActionForm><div className="mt-5 border-t pt-4"><ActionForm action={deleteAvailabilityAction} submit="날짜 삭제"><input type="hidden" name="date" value={selected}/></ActionForm></div></div>}</dialog></Card>;
}
function SavedDatePicker({value,today,savedDates}:{value:string;today:string;savedDates:{date:string}[]}){
 const[date,setDate]=useState(value);return <div><input type="hidden" name="date" value={date}/><p className="text-sm">날짜</p><CalendarPicker label="날짜 변경" today={today} value={date} onChange={setDate} annotation={day=>day===value?'기존 날짜':savedDates.some(row=>row.date===day)?'저장됨':''} hint="이미 저장된 다른 날짜는 선택할 수 없습니다. 변경할 날짜는 이번 달과 다음 달에서 고르세요. 날짜를 바꾸지 않으면 기존 날짜가 유지됩니다." disabled={day=>(day<today&&day!==value)||(day!==value&&savedDates.some(row=>row.date===day))}/></div>;
}
