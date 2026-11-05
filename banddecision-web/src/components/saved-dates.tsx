'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ActionForm} from '@/components/action-form';
import {editAvailabilityAction,deleteAvailabilityAction} from '@/app/live-actions';
import {Card,CardTitle} from '@/components/ui/card';
import {CalendarPicker} from '@/components/date-calendar';
type Counts={attending:number;absent:number};
export function SavedDates({dates,today,counts}:{dates:{date:string}[];today:string;counts:(day:string)=>Counts}){
 const[selected,setSelected]=useState<string|null>(null),dialog=useRef<HTMLDialogElement>(null),title=useId();
 const months=useMemo(()=>{const groups=new Map<string,string[]>();for(const row of [...dates].sort((a,b)=>a.date.localeCompare(b.date))){const month=row.date.slice(0,7);groups.set(month,[...(groups.get(month)??[]),row.date]);}return [...groups];},[dates]);
 useEffect(()=>{if(selected&&!dates.some(row=>row.date===selected)){dialog.current?.close();}},[dates,selected]);
 function close(){dialog.current?.close();setSelected(null);}
 return <Card><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>저장된 날짜</CardTitle><span className="text-sm text-slate-500">총 {dates.length}일</span></div><p className="mt-2 text-sm text-slate-500">날짜를 누르면 수정하거나 삭제할 수 있습니다.</p>
 {months.length===0?<p className="mt-4 text-sm">저장된 날짜가 없습니다.</p>:<div className="mt-4 space-y-5">{months.map(([month,days])=><section key={month} aria-label={month+' 저장된 날짜'}><h3 className="mb-2 text-sm font-bold">{month.slice(0,4)}년 {Number(month.slice(5))}월 <span className="ml-1 text-xs font-normal text-slate-500">{days.length}일</span></h3><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{days.map(day=>{const weekday=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(day+'T12:00:00+09:00')),n=counts(day);return <button key={day} type="button" data-saved-date={day} aria-label={day+' '+weekday+'요일 · 참석 '+n.attending+'명 · 불참 '+n.absent+'명 · 수정 또는 삭제'} aria-haspopup="dialog" onClick={()=>{setSelected(day);dialog.current?.showModal();}} className="min-h-16 min-w-0 rounded-xl border border-blue-100 bg-blue-50/40 px-1 py-2 text-center hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600"><span className="block text-sm font-bold">{Number(day.slice(8))}일 <span className="text-xs font-normal text-slate-500">({weekday})</span></span><span className="mt-1 block text-[10px] text-slate-600">참석 {n.attending} · 불참 {n.absent}</span></button>;})}</div></section>)}</div>}
 <dialog ref={dialog} aria-labelledby={title} onClose={e=>{if(e.target===e.currentTarget)setSelected(null);}} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/40"><div className="mb-4 flex items-center justify-between gap-3"><h2 id={title} className="font-bold">저장된 날짜 수정</h2><button type="button" onClick={close} className="min-h-11 px-2 text-sm font-semibold text-blue-700">닫기</button></div>
 {selected&&<div key={selected} data-saved-editor={selected}><p className="mb-4 text-sm font-semibold">{selected}</p><ActionForm action={editAvailabilityAction} submit="수정 저장"><input type="hidden" name="old_date" value={selected}/><SavedDatePicker value={selected} today={today}/></ActionForm><div className="mt-5 border-t pt-4"><ActionForm action={deleteAvailabilityAction} submit="날짜 삭제"><input type="hidden" name="date" value={selected}/></ActionForm></div></div>}</dialog></Card>;
}
function SavedDatePicker({value,today}:{value:string;today:string}){
 const[date,setDate]=useState(value);return <div><input type="hidden" name="date" value={date}/><p className="text-sm">날짜</p><CalendarPicker label="날짜 변경" today={value<today?value:today} value={date} onChange={setDate} disabled={day=>day<today&&day!==value}/></div>;
}
