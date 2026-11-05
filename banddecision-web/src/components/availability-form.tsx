'use client';
import {useActionState,useState} from 'react';
import {addAvailabilityAction,editAvailabilityAction,deleteAvailabilityAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import {ActionForm} from '@/components/action-form';
import {Card,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {DateCalendar,CalendarPicker,dateRange} from '@/components/date-calendar';
type DateReason={date:string;reason:string};
function Feedback({state}:{state:FormState}){return <>{state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-700">{state.success}</p>}</>;}
export function AvailabilityForm({today,savedDates}:{today:string;savedDates:DateReason[]}){
 const[dates,setDates]=useState<string[]>([]),[mode,setMode]=useState<'multiple'|'range'>('multiple'),[anchor,setAnchor]=useState(''),[rangeError,setRangeError]=useState('');
 const[state,save,pending]=useActionState(async(previous:FormState,form:FormData)=>{const result=await addAvailabilityAction(previous,form);if(result.success){setDates([]);setAnchor('');}return result;},{});
 const duplicate=dates.some(date=>savedDates.some(d=>d.date===date));
 function choose(day:string){
  if(pending)return;setRangeError('');
  if(mode==='multiple'){setDates(current=>current.includes(day)?current.filter(d=>d!==day):current.length<366?[...current,day].sort():current);return;}
  if(!anchor){setAnchor(day);setDates([day]);return;}
  const range=dateRange(anchor,day);
  if(range.length<=366){setDates(range.filter(d=>!savedDates.some(row=>row.date===d)));setAnchor('');}else setRangeError('한 번에 최대 366일을 선택할 수 있습니다. 종료일을 더 가깝게 선택하세요.');
 }
 return <div className="space-y-5"><Card><CardTitle>불가능한 날짜 추가</CardTitle><p className="mt-2 text-sm text-slate-600">불참할 날짜만 저장하세요. 등록하지 않은 날은 참석 가능한 것으로 계산합니다.</p>
 <form action={save} className="mt-4 space-y-3"><input type="hidden" name="dates_json" value={JSON.stringify(dates.map(date=>({date})))}/>
 <div className="flex flex-wrap items-center gap-2" role="group" aria-label="날짜 선택 방식">{([['multiple','여러 날짜'],['range','기간 선택']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>{setMode(value);setAnchor('');}} className={'min-h-11 rounded-lg border px-3 text-sm '+(mode===value?'border-blue-600 bg-blue-50 text-blue-800':'border-slate-200')}>{label}</button>)}</div>
 <p className="text-sm text-slate-600">{mode==='multiple'?'불가능한 날을 여러 개 누르세요. 다시 누르면 선택이 해제됩니다.':anchor?'마지막 날짜를 누르면 그 사이의 날짜가 선택됩니다.':'시작 날짜와 마지막 날짜를 차례로 누르세요.'} 이미 저장된 날은 회색으로 표시됩니다.</p>
 <div className="max-w-lg"><DateCalendar today={today} selected={dates} onSelect={choose} disabled={day=>day<today||savedDates.some(row=>row.date===day)} annotation={day=>savedDates.some(row=>row.date===day)?'저장됨':dates.includes(day)?'선택':''}/></div>
 <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span role="status">{dates.length}일 선택{anchor?' · 종료일 선택 중':''}</span><button type="button" onClick={()=>{setDates([]);setAnchor('');}} className="min-h-11 px-2 text-blue-700">선택 초기화</button></div>
 {dates.length>0&&<div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto" aria-label="저장할 날짜">{dates.map(day=><button key={day} type="button" aria-label={day+' 선택 해제'} onClick={()=>{setDates(current=>current.filter(d=>d!==day));setAnchor('');}} className="min-h-9 rounded-lg bg-blue-50 px-2 text-xs text-blue-800">{day} ×</button>)}</div>}

 {rangeError&&<p role="alert" className="text-sm text-rose-700">{rangeError}</p>}<Feedback state={state}/>{duplicate&&<p className="text-sm text-amber-800">이미 저장된 날짜입니다. 아래 목록에서 수정하세요.</p>}<Button className="w-full sm:w-auto" disabled={pending||dates.length===0||Boolean(anchor)||dates.some(d=>d<today)||duplicate}>{pending?'저장 중…':'날짜 저장'}</Button></form>
</Card>
 <Card><CardTitle>저장된 날짜</CardTitle><p className="mt-2 text-sm text-slate-500">저장한 모든 날짜입니다. 여기서 수정하거나 삭제할 수 있습니다.</p>{savedDates.length===0?<p className="mt-4 text-sm">저장된 날짜가 없습니다.</p>:<ul className="mt-4 divide-y">{savedDates.map(row=><li key={row.date+':'+row.reason} data-saved-date={row.date} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><time className="font-semibold">{row.date}</time></div><ActionForm action={deleteAvailabilityAction} submit="날짜 삭제"><input type="hidden" name="date" value={row.date}/></ActionForm></div><details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-blue-700">날짜 수정</summary><ActionForm action={editAvailabilityAction} submit="수정 저장" className="mt-3 sm:grid-cols-2"><input type="hidden" name="old_date" value={row.date}/><SavedDatePicker value={row.date} today={today}/></ActionForm></details></li>)}</ul>}</Card></div>;
}
function SavedDatePicker({value,today}:{value:string;today:string}){
 const[date,setDate]=useState(value);return <div><input type="hidden" name="date" value={date}/><p className="text-sm">날짜</p><CalendarPicker label="저장된 날짜 수정" today={value<today?value:today} value={date} onChange={setDate} disabled={day=>day<today&&day!==value}/></div>;
}
