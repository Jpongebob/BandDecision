'use client';
import {useActionState,useMemo,useState} from 'react';
import {addAvailabilityAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import {SavedDates} from '@/components/saved-dates';
import {Card,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {DateCalendar,dateRange} from '@/components/date-calendar';

type SavedDate={date:string};
export function AvailabilityForm({today,savedDates,members,available,memberId}:{today:string;savedDates:SavedDate[];members:{id:string;nickname:string;part:string}[];available:{memberId:string;date:string}[];memberId:string}){
 const[detailDay,setDetailDay]=useState(today),[dates,setDates]=useState<string[]>([]),[mode,setMode]=useState<'multiple'|'range'>('multiple'),[anchor,setAnchor]=useState(''),[rangeError,setRangeError]=useState('');
 const[state,save,pending]=useActionState(async(previous:FormState,form:FormData)=>{const result=await addAvailabilityAction(previous,form);if(result.success){setDates([]);setAnchor('');}return result;},{});
 const saved=useMemo(()=>new Set(savedDates.map(d=>d.date)),[savedDates]);
 const attendance=useMemo(()=>{
  const active=new Set(members.map(m=>m.id)),byDate=new Map<string,Set<string>>();
  for(const row of available){if(!active.has(row.memberId))continue;const ids=byDate.get(row.date)??new Set<string>();ids.add(row.memberId);byDate.set(row.date,ids);}
  if(active.has(memberId))for(const day of dates){const ids=byDate.get(day)??new Set<string>();ids.add(memberId);byDate.set(day,ids);}
  return {total:active.size,byDate};
 },[members,available,memberId,dates]);
 function counts(day:string){const attending=attendance.byDate.get(day)?.size??0;return {attending,absent:attendance.total-attending};}
 function choose(day:string){
  if(pending)return;setDetailDay(day);
  if(saved.has(day)||day<today)return;
  setRangeError('');
  if(mode==='multiple'){setDates(current=>current.includes(day)?current.filter(d=>d!==day):[...current,day].sort());return;}
  if(!anchor){setAnchor(day);setDates([day]);return;}
  const range=dateRange(anchor,day);
  if(range.length<=366){setDates(range.filter(d=>!saved.has(d)));setAnchor('');}else setRangeError('한 번에 최대 366일을 선택할 수 있습니다.');
 }
 function chooseMonth(days:string[]){
  if(pending||days.length===0)return;setDates(current=>{const selected=new Set(current),monthDays=new Set(days);return days.every(day=>selected.has(day))?current.filter(day=>!monthDays.has(day)):[...new Set([...current,...days])].sort();});setAnchor('');setMode('multiple');setRangeError('');
 }
 return <div className="space-y-5"><Card><CardTitle>가능한 날짜 추가</CardTitle><p className="mt-2 text-sm text-slate-600">참석할 수 있는 날짜를 선택하고 저장하세요. 저장한 날짜만 참석 가능 인원에 포함됩니다.</p>
 <form action={save} onReset={event=>event.preventDefault()} className="mt-4 space-y-3"><input type="hidden" name="dates_json" value={JSON.stringify(dates.map(date=>({date})))}/>
 <div className="inline-flex max-w-full gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="날짜 선택 방식">{([['multiple','여러 날짜'],['range','기간 선택']] as const).map(([value,label])=><button key={value} type="button" disabled={pending} aria-pressed={mode===value} onClick={()=>{setMode(value);setAnchor('');}} className={'min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 '+(mode===value?'bg-white text-blue-700 shadow-sm':'text-slate-600 hover:bg-white/60')}>{label}</button>)}</div>
 <p className="text-sm text-slate-600">{mode==='multiple'?'가능한 날을 여러 개 누르세요. 다시 누르면 선택이 해제됩니다.':anchor?'마지막 날짜를 누르면 그 사이의 날짜가 선택됩니다.':'시작 날짜와 마지막 날짜를 차례로 누르세요.'} 저장된 날짜도 눌러 참석 명단을 볼 수 있습니다.</p>
 <div className="max-w-lg"><div className="mb-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-700"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="grid size-3.5 place-items-center rounded-sm border border-emerald-400 bg-emerald-100 text-[10px] font-bold text-emerald-900">✓</span>내 가능 날짜</span><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3.5 rounded-sm border border-blue-600 bg-blue-600"/>선택 중 · 저장 전</span><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3.5 rounded-sm border border-slate-300 bg-white"/>미등록 · 참석 제외</span></div><p className="mb-2 text-xs text-slate-500">색상은 내 일정, 칸 안의 인원수는 전체 멤버 기준입니다.</p><DateCalendar today={today} selected={dates} onSelect={choose} onSelectMonth={chooseMonth} disabled={()=>pending} readOnly={day=>day<today||saved.has(day)} saved={day=>saved.has(day)} annotation={day=>'가능 '+counts(day).attending+'/'+attendance.total+'명'} annotationLabel={day=>'참석 가능 '+counts(day).attending+'명 · 참석 제외 '+counts(day).absent+'명'+(saved.has(day)?' · 저장됨 · 내 가능 날짜':dates.includes(day)?' · 선택 중':' · 미등록 · 내 참석 제외')}/></div>
 <p className="text-xs text-slate-500">전체 선택은 보고 있는 달의 오늘 이후 날짜에 적용됩니다. 모두 선택된 상태에서 다시 누르면 해당 달의 선택이 취소됩니다. 다른 달의 선택과 이미 저장한 날짜는 유지됩니다. 선택한 뒤 날짜 저장을 눌러주세요.</p>
 <section aria-label="날짜별 참석 명단" className="max-w-lg rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">날짜별 멤버</h3><p aria-live="polite" className="text-sm font-semibold">{detailDay}{saved.has(detailDay)&&<span className="ml-2 text-xs font-normal text-slate-500">내 저장 날짜</span>}</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{([{attending:true,label:'참석 가능'},{attending:false,label:'참석 제외'}] as const).map(group=>{const people=members.filter(m=>(attendance.byDate.get(detailDay)?.has(m.id)??false)===group.attending);return <div key={group.label}><h4 className={'text-xs font-bold '+(group.attending?'text-emerald-700':'text-slate-600')}>{group.label} {people.length}명</h4>{people.length?<ul className="mt-1 flex flex-wrap gap-1.5">{people.map(person=><li key={person.id} className="min-w-0 max-w-full break-all rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">{person.nickname}{person.id===memberId?' (나)':''}<span className="ml-1 text-slate-500">{person.part}</span></li>)}</ul>:<p className="mt-1 text-xs text-slate-500">없음</p>}</div>;})}</div></section>
 <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span role="status">{dates.length}일 선택{anchor?' · 종료일 선택 중':''}</span><button type="button" disabled={pending} onClick={()=>{setDates([]);setAnchor('');}} className="min-h-11 px-2 text-blue-700">선택 초기화</button></div>
 {dates.length>0&&<div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto" aria-label="저장할 날짜">{dates.map(day=><button key={day} type="button" disabled={pending} aria-label={day+' 선택 해제'} onClick={()=>{setDates(current=>current.filter(d=>d!==day));setAnchor('');}} className="min-h-9 rounded-lg bg-blue-50 px-2 text-xs text-blue-800">{day} ×</button>)}</div>}
 {rangeError&&<p role="alert" className="text-sm text-rose-700">{rangeError}</p>}{state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-700">{state.success}</p>}
 <Button className="w-full sm:w-auto" disabled={pending||dates.length===0||Boolean(anchor)}>{pending?'저장 중…':'날짜 저장'}</Button></form></Card>
 <SavedDates dates={savedDates} today={today} counts={counts}/></div>;
}
