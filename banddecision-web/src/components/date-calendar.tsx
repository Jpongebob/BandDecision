'use client';
import {twoMonthWindow} from '@/lib/calendar-window';
import {useId,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';

const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
export function dateRange(start:string,end:string){
 const first=start<end?start:end,last=start<end?end:start,days:string[]=[];
 for(let time=Date.parse(first+'T00:00:00Z');time<=Date.parse(last+'T00:00:00Z')&&days.length<367;time+=86400000)days.push(iso(new Date(time)));
 return days;
}
type Props={today:string;selected:string[];onSelect:(date:string)=>void;onSelectMonth?:(dates:string[])=>void;disabled?:(date:string)=>boolean;annotation?:(date:string)=>string;secondaryAnnotation?:(date:string)=>string;annotationLabel?:(date:string)=>string;label?:string};
export function DateCalendar({today,selected,onSelect,onSelectMonth,disabled,annotation,secondaryAnnotation,annotationLabel,label='날짜 달력'}:Props){
 const{firstMonth,lastMonth}=twoMonthWindow(today);
 const initial=(selected[0]||today).slice(0,7);
 const[month,setMonth]=useState(initial<firstMonth?firstMonth:initial>lastMonth?lastMonth:initial);const grid=useRef<HTMLDivElement>(null);
 const year=Number(month.slice(0,4)),index=Number(month.slice(5,7))-1,first=new Date(Date.UTC(year,index,1)),count=new Date(Date.UTC(year,index+1,0)).getUTCDate();
 const selectableDays=onSelectMonth?Array.from({length:count},(_,i)=>month+'-'+pad(i+1)).filter(day=>!(disabled?.(day)??day<today)):[];
 const monthSelected=selectableDays.length>0&&selectableDays.every(day=>selected.includes(day));
 function move(amount:number){const target=iso(new Date(Date.UTC(year,index+amount,1))).slice(0,7);if(target<firstMonth||target>lastMonth)return;setMonth(target);}
 function keyboard(e:KeyboardEvent<HTMLButtonElement>,day:string){
  const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-new Date(day+'T00:00:00Z').getUTCDay(),End:6-new Date(day+'T00:00:00Z').getUTCDay()};
  let target:string,step:number;
  if(e.key==='PageUp'||e.key==='PageDown'){
   e.preventDefault();step=e.key==='PageUp'?-1:1;
   const last=new Date(Date.UTC(year,index+step+1,0)).getUTCDate();
   target=iso(new Date(Date.UTC(year,index+step,Math.min(Number(day.slice(8)),last))));
  }else{
   if(!(e.key in delta))return;e.preventDefault();
   target=iso(new Date(Date.parse(day+'T00:00:00Z')+delta[e.key]*86400000));
   step=e.key==='Home'?1:e.key==='End'?-1:e.key==='ArrowUp'?-7:e.key==='ArrowDown'?7:Math.sign(delta[e.key])||1;
  }
  // Native disabled buttons cannot receive focus: skip them without selecting a date.
  for(let attempts=0;attempts<366;attempts++){
   if(target.slice(0,7)<firstMonth||target.slice(0,7)>lastMonth)return;
   if(!(disabled?.(target)??target<today)){
    if(target.slice(0,7)!==month)setMonth(target.slice(0,7));
    requestAnimationFrame(()=>grid.current?.querySelector<HTMLButtonElement>('[data-day="'+target+'"]')?.focus());return;
   }
   target=iso(new Date(Date.parse(target+'T00:00:00Z')+step*86400000));
  }
 }
 return <section data-calendar-month={month} aria-label={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:p-3"><div className="mb-2 flex items-center justify-between gap-2"><button type="button" aria-label="이전 달" onClick={()=>move(-1)} disabled={month<=firstMonth} className="grid size-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={18}/></button><h3 aria-live="polite" className="text-sm font-bold">{year}년 {index+1}월</h3><button type="button" aria-label="다음 달" onClick={()=>move(1)} disabled={month>=lastMonth} className="grid size-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={18}/></button></div>
 {onSelectMonth&&<button type="button" disabled={selectableDays.length===0} aria-pressed={monthSelected} onClick={()=>onSelectMonth(selectableDays)} className="mb-2 min-h-11 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 disabled:opacity-40">{index+1}월 {monthSelected?'전체 선택 취소':'전체 선택'}</button>}
 <div className="grid grid-cols-7 text-center text-xs text-slate-500" aria-hidden="true">{['일','월','화','수','목','금','토'].map(d=><span key={d} className="py-2">{d}</span>)}</div>
 <div ref={grid} className="grid grid-cols-7 gap-0.5">{Array.from({length:first.getUTCDay()},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:count},(_,i)=>{const day=month+'-'+pad(i+1),chosen=selected.includes(day),blocked=disabled?.(day)??day<today,note=annotation?.(day),secondary=secondaryAnnotation?.(day),description=annotationLabel?.(day)??[note,secondary].filter(Boolean).join(' · ');return <button type="button" key={day} data-day={day} aria-label={day+(description?' · '+description:'')} aria-pressed={chosen} aria-current={day===today?'date':undefined} disabled={blocked} onKeyDown={e=>keyboard(e,day)} onClick={()=>onSelect(day)} className={'flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border px-0.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-blue-600 '+(chosen?'border-blue-600 bg-blue-600 text-white':blocked?'border-transparent bg-slate-50 text-slate-300':'border-slate-100 text-slate-900 hover:border-blue-400 hover:bg-blue-50')}><span className="text-sm font-semibold">{i+1}</span>{note&&<span className="max-w-full truncate text-[9px] sm:text-[10px]">{note}</span>}{secondary&&<span className="max-w-full truncate text-[9px] sm:text-[10px]">{secondary}</span>}</button>;})}</div></section>;
}
export function CalendarPicker({value,onChange,today,label,annotation,disabled,hint}:{value:string;onChange:(date:string)=>void;today:string;label:string;annotation?:(date:string)=>string;disabled?:(date:string)=>boolean;hint?:string}){
 const dialog=useRef<HTMLDialogElement>(null),id=useId();const[opened,setOpened]=useState(false);
 function close(){dialog.current?.close();setOpened(false);}
 return <div className="min-w-0"><button type="button" aria-haspopup="dialog" aria-expanded={opened} onClick={()=>{setOpened(true);dialog.current?.showModal();}} className="mt-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-left text-sm"><span>{value||'달력에서 날짜 선택'}</span><CalendarDays size={19} aria-hidden="true"/></button>
 <dialog ref={dialog} aria-labelledby={id} onCancel={()=>setOpened(false)} onClose={()=>setOpened(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl backdrop:bg-slate-900/40 sm:p-5">
 <div className="mb-3 flex items-center justify-between gap-3"><h2 id={id} className="font-bold">{label}</h2><button type="button" onClick={close} className="min-h-11 px-3 text-sm font-semibold text-blue-700">닫기</button></div>{opened&&<DateCalendar key={value||today} today={today} selected={value?[value]:[]} annotation={annotation} disabled={disabled} onSelect={day=>{onChange(day);close();}}/>}{(hint||annotation)&&<p className="mt-3 text-xs text-slate-600">{hint??'참석 가능으로 등록한 인원입니다. 등록한 멤버가 없는 날은 선택할 수 없습니다. 다음 달도 확인할 수 있습니다.'}</p>}</dialog></div>;
}
