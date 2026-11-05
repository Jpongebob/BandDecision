'use client';
import {useActionState,useMemo,useState} from 'react';
import {addAvailabilityAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import {SavedDates} from '@/components/saved-dates';
import {Card,CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {DateCalendar,dateRange} from '@/components/date-calendar';
type DateReason={date:string;reason:string};
function Feedback({state}:{state:FormState}){return <>{state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-700">{state.success}</p>}</>;}
export function AvailabilityForm({today,savedDates,members,unavailable,memberId}:{today:string;savedDates:DateReason[];members:{id:string}[];unavailable:{memberId:string;date:string}[];memberId:string}){
 const[dates,setDates]=useState<string[]>([]),[mode,setMode]=useState<'multiple'|'range'>('multiple'),[anchor,setAnchor]=useState(''),[rangeError,setRangeError]=useState('');
 const[state,save,pending]=useActionState(async(previous:FormState,form:FormData)=>{const result=await addAvailabilityAction(previous,form);if(result.success){setDates([]);setAnchor('');}return result;},{});
 const attendance=useMemo(()=>{
  const active=new Set(members.map(m=>m.id)),byDate=new Map<string,Set<string>>();
  for(const entry of unavailable){if(!active.has(entry.memberId))continue;const absent=byDate.get(entry.date)??new Set<string>();absent.add(entry.memberId);byDate.set(entry.date,absent);}
  // Preview only this member's unsaved additions, without double-counting saved entries.
  if(active.has(memberId))for(const day of dates){const absent=byDate.get(day)??new Set<string>();absent.add(memberId);byDate.set(day,absent);}
  return {total:active.size,byDate};
 },[members,unavailable,memberId,dates]);
 function counts(day:string){const absent=attendance.byDate.get(day)?.size??0;return {absent,attending:attendance.total-absent};}
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
 <p className="text-xs text-slate-500">날짜별 참석·불참 인원입니다. 내 선택은 저장 전 미리보기로 반영됩니다.</p><div className="max-w-lg"><DateCalendar today={today} selected={dates} onSelect={choose} disabled={day=>day<today||savedDates.some(row=>row.date===day)} annotation={day=>'참석 '+counts(day).attending} secondaryAnnotation={day=>'불참 '+counts(day).absent} annotationLabel={day=>'참석 '+counts(day).attending+'명 · 불참 '+counts(day).absent+'명'+(savedDates.some(row=>row.date===day)?' · 저장됨':dates.includes(day)?' · 선택 중':'')}/></div>
 <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span role="status">{dates.length}일 선택{anchor?' · 종료일 선택 중':''}</span><button type="button" onClick={()=>{setDates([]);setAnchor('');}} className="min-h-11 px-2 text-blue-700">선택 초기화</button></div>
 {dates.length>0&&<div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto" aria-label="저장할 날짜">{dates.map(day=><button key={day} type="button" aria-label={day+' 선택 해제'} onClick={()=>{setDates(current=>current.filter(d=>d!==day));setAnchor('');}} className="min-h-9 rounded-lg bg-blue-50 px-2 text-xs text-blue-800">{day} ×</button>)}</div>}

 {rangeError&&<p role="alert" className="text-sm text-rose-700">{rangeError}</p>}<Feedback state={state}/>{duplicate&&<p className="text-sm text-amber-800">이미 저장된 날짜입니다. 아래 목록에서 수정하세요.</p>}<Button className="w-full sm:w-auto" disabled={pending||dates.length===0||Boolean(anchor)||dates.some(d=>d<today)||duplicate}>{pending?'저장 중…':'날짜 저장'}</Button></form>
</Card>
 <SavedDates dates={savedDates} today={today} counts={counts}/></div>;
}
