'use client';
import {twoMonthWindow} from '@/lib/calendar-window';
import {useActionState,useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {saveLivePlanAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import type {LivePlanning,SavedPlan} from '@/lib/live-planning';
import {recommendAvailableDates,type SongRanking} from '@/services/recommendations';
import {clockLabel,dayLabel,timeRangeLabel} from '@/lib/day-format';
import {answeredMonths,monthLabel,monthOf,silentIn} from '@/lib/availability-months';
import {AskDatesButton} from '@/components/ask-dates-button';

const pad=(n:number)=>String(n).padStart(2,'0');
// Attendance heat: lighter = fewer people. 1–4 of 6 use dark text, 5–6 white (contrast checked).
const heat=['bg-[#eef3ff] text-ink','bg-[#dce6fe] text-ink','bg-[#bfd0fb] text-ink','bg-[#93b0f8] text-ink','bg-[#3563de] text-white','bg-[#1e4fd6] text-white'];
function heatClass(n:number,total:number){if(!total||!n)return 'bg-white text-faint';const r=n/total;return heat[r>=1?5:r>0.8?4:r>0.6?3:r>0.4?2:r>0.2?1:0];}
const ring='border-2 border-pending bg-white';
// 30분 단위 00:00–23:30. 저장된 시간이 목록에 없으면(예전 계획) 그 값도 넣는다.
const halfHours=Array.from({length:48},(_,i)=>pad(Math.floor(i/2))+':'+(i%2?'30':'00'));
const timeSelect='mt-1.5 min-h-12 w-full rounded-xl border border-line-strong bg-white px-3 text-base font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint';

// 새 합주 정하기 / 계획 수정: recommended dates, an attendance calendar, songs and memo, then one confirm button.
export function ConfirmPlanForm({data,songs,today,plan,takenDates=[],onSaved}:{data:LivePlanning;songs:SongRanking[];today:string;plan?:SavedPlan;takenDates?:string[];onSaved?:()=>void}){
 const savedSongs=useMemo(()=>[...(plan?.confirmed_plan_songs??[])].sort((a,b)=>a.display_order-b.display_order).flatMap(s=>s.source_song_id===null?[]:[s.source_song_id]),[plan]);
 const[date,setDate]=useState(plan?.rehearsal_date??''),[selected,setSelected]=useState<number[]>(savedSongs),[partial,setPartial]=useState(false);
 const[startsAt,setStartsAt]=useState((plan?.starts_at??'20:00').slice(0,5)),[endsAt,setEndsAt]=useState((plan?.ends_at??'22:00').slice(0,5));
 const[place,setPlace]=useState(plan?.location??''),[memo,setMemo]=useState(plan?.memo??'');
 const[state,save,pending]=useActionState(saveLivePlanAction,{} as FormState);
 // The plan changed (saved here or on another device): refill the fields from the saved plan.
 // Same instance on purpose, so the save that caused it can still close the sheet.
 const[seenVersion,setSeenVersion]=useState(plan?.version);
 if(plan&&plan.version!==seenVersion){
  setSeenVersion(plan.version);setDate(plan.rehearsal_date);setSelected(savedSongs);setPartial(false);
  setStartsAt(plan.starts_at.slice(0,5));setEndsAt(plan.ends_at.slice(0,5));setPlace(plan.location??'');setMemo(plan.memo??'');
 }
 const form=useRef<HTMLFormElement>(null),reasonId=useId();
 useEffect(()=>{if(state.success){form.current?.closest('dialog')?.close();onSaved?.();}},[state,onSaved]);
 const{firstMonth,lastMonth,endDate}=twoMonthWindow(today);
 const[month,setMonth]=useState((plan?.rehearsal_date??today).slice(0,7)<firstMonth?firstMonth:(plan?.rehearsal_date??today).slice(0,7));
 const taken=useMemo(()=>new Set(takenDates),[takenDates]);
 const total=data.members.length;
 const availableByDate=useMemo(()=>{const active=new Set(data.members.map(m=>m.id)),byDate=new Map<string,Set<string>>();for(const row of data.available){if(!active.has(row.memberId))continue;const ids=byDate.get(row.date)??new Set<string>();ids.add(row.memberId);byDate.set(row.date,ids);}return byDate;},[data.members,data.available]);
 // 미응답 is per month: the month of the chosen day (this month until a day is chosen), and each suggestion's own month.
 const answered=useMemo(()=>answeredMonths(data.available),[data.available]);
 const silentMonth=monthOf(date||today),silent=silentIn(data.members,answered,silentMonth);
 const suggested=useMemo(()=>recommendAvailableDates({participants:data.members,available:data.available,startDate:today,endDate,today}).filter(item=>!taken.has(item.date)).slice(0,4),[data.members,data.available,today,endDate,taken]);
 function chooseDate(value:string){setDate(value);setPartial(false);}
 // Same day as the saved plan: show the saved attendance (changed only in 참석자 명단); the database keeps it too (028).
 const sameDay=Boolean(plan)&&date===plan?.rehearsal_date;
 const savedAbsent=plan?.confirmed_plan_members.filter(m=>!m.attending).map(m=>m.nickname_snapshot)??[];
 const absent=sameDay?[]:data.members.filter(m=>!availableByDate.get(date)?.has(m.id)),attending=sameDay?plan!.attendee_count:total-absent.length;
 // Edit: the button wakes up only after something differs from the saved plan.
 const changed=!plan||date!==plan.rehearsal_date||startsAt!==plan.starts_at.slice(0,5)||endsAt!==plan.ends_at.slice(0,5)||place.trim()!==(plan.location??'')||memo.trim()!==(plan.memo??'')||selected.join()!==savedSongs.join();
 const needsAck=!sameDay&&absent.length>0&&!partial;
 const reason=!date?'':plan&&!changed?'바뀐 내용이 없어요':needsAck&&attending>0?'\'참석 가능한 멤버만으로 진행할게요\'에 체크해 주세요':'';
 const choices=[...songs.filter(s=>s.confirmedAt||s.status==='eligible').map(s=>({id:s.id,title:s.title,artist:s.artist,confirmed:Boolean(s.confirmedAt)})),...(plan?.confirmed_plan_songs.filter(s=>s.source_song_id!==null&&!songs.some(song=>song.id===s.source_song_id&&(song.confirmedAt||song.status==='eligible'))).map(s=>({id:s.source_song_id!,title:s.title_snapshot,artist:s.artist_snapshot,confirmed:false}))??[])];
 const year=Number(month.slice(0,4)),index=Number(month.slice(5,7))-1,blanks=new Date(Date.UTC(year,index,1)).getUTCDay(),count=new Date(Date.UTC(year,index+1,0)).getUTCDate();
 const days=Array.from({length:count},(_,i)=>month+'-'+pad(i+1));
 const moveMonth=(step:number)=>{const d=new Date(Date.UTC(year,index+step,1)),m=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);if(m>=firstMonth&&m<=lastMonth)setMonth(m);};
 const time=timeRangeLabel(startsAt,endsAt),sameTime=startsAt===endsAt;
 const timeOptions=(value:string)=>[...new Set([...halfHours,value])].sort().map(t=><option key={t} value={t}>{clockLabel(t)}</option>);
 return <form ref={form} action={save} onReset={event=>event.preventDefault()} className="flex flex-col gap-5"><input type="hidden" name="band_id" value={data.band_id}/><input type="hidden" name="version" value={data.version}/><input type="hidden" name="plan_id" value={plan?.id??''}/><input type="hidden" name="plan_version" value={plan?.version??''}/><input type="hidden" name="ack_partial" value={partial?'true':'false'}/><input type="hidden" name="date" value={date}/>
 <fieldset className="min-w-0" aria-label="추천 날짜"><legend className="mb-2.5 text-[17px] font-bold">추천 날짜 <span className="text-base font-medium text-muted">· 참석 인원순</span></legend>
 {suggested.length>0?<div className="grid grid-cols-2 gap-2">{suggested.map(item=>{const on=date===item.date;return <label key={item.date} className="relative min-w-0 cursor-pointer"><input className="peer sr-only" type="radio" name="recommended_date" value={item.date} checked={on} disabled={pending} onChange={()=>chooseDate(item.date)} aria-label={dayLabel(item.date)+' · '+item.attendanceCount+'/'+total+'명 참석'}/><span className={'flex min-h-[88px] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-2.5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand '+(on?'border-2 border-ink':'border border-line-strong bg-white')}><span className="text-[17px] font-bold">{dayLabel(item.date)}</span><span className="whitespace-nowrap text-[15px] font-semibold text-ink-2">{item.attendanceCount}/{total}명 참석</span>{(n=>n>0&&<span className="whitespace-nowrap text-sm text-muted"><span aria-hidden="true" className={'mb-px mr-1.5 inline-block size-[9px] rounded-full align-middle '+ring}/>미응답 {n}명</span>)(silentIn(data.members,answered,monthOf(item.date)).length)}</span></label>;})}</div>
 :<p className="text-[15px] text-muted">이번 달·다음 달에 참석할 수 있는 날이 아직 없어요. 멤버들이 가능한 날을 저장하면 추천해요.</p>}</fieldset>

 <section aria-label="달력에서 고르기" className="rounded-2xl border border-line p-3"><h3 className="text-base font-bold">달력에서 고르기</h3>
 <div className="mt-1.5 flex items-center justify-center gap-1"><button type="button" aria-label="이전 달" onClick={()=>moveMonth(-1)} disabled={month<=firstMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronLeft size={22}/></button><span aria-live="polite" className="min-w-32 text-center text-lg font-bold">{year}년 {index+1}월</span><button type="button" aria-label="다음 달" onClick={()=>moveMonth(1)} disabled={month>=lastMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronRight size={22}/></button></div>
 <div aria-hidden="true" className="mt-1 grid grid-cols-7 gap-1 text-center text-[13px] font-semibold text-muted">{['일','월','화','수','목','금','토'].map((d,i)=><span key={d} className={i===0?'text-danger':i===6?'text-brand-ink':''}>{d}</span>)}</div>
 <div className="mt-1.5 grid grid-cols-7 gap-1">{Array.from({length:blanks},(_,i)=><span key={'b'+i}/>)}{days.map(day=>{const n=availableByDate.get(day)?.size??0,own=day===plan?.rehearsal_date,past=day<today&&!own,blocked=!own&&(past||n===0||day>endDate),on=date===day,other=taken.has(day)&&!past;return <button type="button" key={day} data-day={day} data-taken={other||undefined} disabled={blocked||pending} onClick={()=>chooseDate(day)} aria-pressed={on} aria-label={dayLabel(day)+(past?', 지난 날':', '+n+'/'+total+'명 참석')+(taken.has(day)?', 이미 합주 있음':'')} className={'relative flex h-11 flex-col items-center justify-center rounded-xl '+(past?'bg-surface-2 text-faint':other?'border border-plan-line bg-plan-bg text-plan-ink':own&&n===0?'border border-line-strong bg-white text-ink':heatClass(n,total)+(n===0?' border border-line':''))+(on?' shadow-[0_0_0_3px_#101828]':'')}>
  <span className="text-base font-bold leading-5">{Number(day.slice(8))}</span>{!past&&<span className="text-[13px] font-semibold leading-4 tabular-nums">{n}/{total}</span>}</button>;})}</div>
 {taken.size>0&&<p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-2"><span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] border border-plan-line bg-plan-bg"/>이미 합주 있는 날 · 같은 날 한 번 더 정할 수도 있어요</p>}</section>

 {silent.length>0&&<div className="flex flex-col gap-2 rounded-xl border border-note-line bg-note-bg px-3.5 py-3"><span className="flex flex-col gap-0.5"><span className="whitespace-nowrap text-base text-ink"><span aria-hidden="true" className={'mb-px mr-1.5 inline-block size-3 rounded-full align-middle '+ring}/><b className="font-bold">미응답 {silent.length}명</b></span><span className="text-[15px] text-ink-2">{silent.map(m=>m.nickname+'('+m.part+')').join(', ')} 님이 {monthLabel(silentMonth)} 날짜를 아직 안 냈어요</span></span><AskDatesButton months={monthLabel(silentMonth)} className="self-start"/></div>}

 {date&&sameDay&&<div data-saved-attendance className="flex flex-col gap-1 rounded-xl bg-surface-2 px-3.5 py-3"><p className="text-base font-bold">{dayLabel(date)} · {plan!.attendee_count}/{plan!.participant_count}명 참석</p>{savedAbsent.length>0&&<p className="text-[15px] text-ink-2">불참: {savedAbsent.join(', ')}</p>}<p className="text-sm text-muted">참석자는 카드의 &apos;참석자 명단&apos;에서 바꿔요.</p></div>}
 {date&&!sameDay&&<div className="flex flex-col gap-2 rounded-xl bg-surface-2 px-3.5 py-3">{plan&&<p data-date-move className="text-[15px] font-semibold text-brand-ink">이 합주를 {dayLabel(plan.rehearsal_date)}에서 {dayLabel(date)}로 옮겨요. 참석자는 새 날짜에 가능한 멤버로 다시 정해져요.</p>}<p className="text-base font-bold">{dayLabel(date)} · {attending}/{total}명 참석</p>{absent.length>0&&<><p className="text-[15px] text-ink-2">참석 안 됨: {absent.map(m=>m.nickname).join(', ')}</p><label className="flex min-h-11 items-center gap-2.5 text-base font-semibold"><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)} className="size-[22px] accent-brand"/>참석 가능한 멤버만으로 진행할게요</label></>}</div>}

 <fieldset className="min-w-0"><legend className="mb-1 text-[17px] font-bold">시간</legend><div className="grid grid-cols-2 gap-2"><label className="text-[15px] font-semibold text-ink-2">시작<select name="starts_at" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className={timeSelect}>{timeOptions(startsAt)}</select></label><label className="text-[15px] font-semibold text-ink-2">끝<select name="ends_at" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className={timeSelect}>{timeOptions(endsAt)}</select></label></div>
 {sameTime?<p role="alert" className="mt-1.5 text-sm font-semibold text-danger">시작과 끝 시간이 같아요.</p>:endsAt<startsAt&&<p className="mt-1.5 text-sm text-muted">끝 시간이 시작보다 이르면 다음 날 끝나는 걸로 저장해요.</p>}</fieldset>
 <label className="flex flex-col gap-1.5 text-[17px] font-bold"><span>장소 <span className="text-base font-medium text-muted">(선택)</span></span><input name="location" value={place} onChange={e=>setPlace(e.target.value)} maxLength={200} placeholder="합주실 이름 또는 주소" className="min-h-12 w-full rounded-xl border border-line-strong px-3.5 text-base font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"/></label>
 <fieldset className="min-w-0"><legend className="mb-2.5 text-[17px] font-bold">곡 <span className="text-base font-medium text-muted">· 선택 · 나중에 넣어도 돼요</span></legend>
 {choices.length?<div className="flex flex-wrap gap-2">{choices.map(s=>{const on=selected.includes(s.id);return <button type="button" key={s.id} data-song-choice={s.id} aria-pressed={on} onClick={()=>setSelected(c=>on?c.filter(id=>id!==s.id):[...c,s.id])} className={'inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-3.5 text-left text-[15px] '+(on?'border border-brand bg-brand-tint font-bold text-brand-ink':'border border-line-strong bg-white font-semibold text-ink-2')}>{on&&<Check size={14} strokeWidth={3} aria-hidden="true" className="shrink-0"/>}<span className="min-w-0 [overflow-wrap:anywhere]">{s.title}{s.confirmed&&<span className="font-semibold text-plan-ink"> · 확정곡</span>}</span>{on&&<input type="hidden" name="song_id" value={s.id}/>}</button>;})}</div>
 :<p className="text-[15px] text-muted">확정곡이나 투표를 통과한 곡이 아직 없어요. 날짜만 먼저 정해도 돼요.</p>}</fieldset>
 <label className="flex flex-col gap-1.5 text-[17px] font-bold"><span>합주 메모 <span className="text-base font-medium text-muted">(선택)</span></span><textarea name="memo" value={memo} onChange={e=>setMemo(e.target.value)} maxLength={2000} rows={3} placeholder="이번 연습 목표나 준비할 내용" className="min-h-24 w-full resize-y rounded-xl border border-line-strong px-3.5 py-2.5 text-base font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"/></label>
 {state.error&&<p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}{state.success&&<p role="status" className="text-sm font-semibold text-plan-ink">{state.success}</p>}
 <div className="sticky bottom-0 -mx-5 -mb-6 flex flex-col gap-2 border-t border-line bg-white px-5 pb-6 pt-3"><p className="text-[15px] text-ink-2">{date?dayLabel(date)+' '+time+' · '+attending+'명 참석 · 곡 '+selected.length+'개':'날짜를 골라 주세요'}</p><button disabled={pending||!date||!changed||sameTime||attending===0||needsAck} aria-describedby={reason?reasonId:undefined} className="min-h-[52px] rounded-[14px] bg-brand text-[17px] font-bold text-white enabled:hover:bg-brand-ink disabled:bg-surface-2 disabled:text-faint">{pending?'저장 중…':plan?'계획 수정 저장':'이 날로 확정하기'}</button>{reason&&<p id={reasonId} className="text-center text-sm font-semibold text-muted">{reason}</p>}</div>
 </form>;
}
// New plan: after a save the sheet closes and the next opening starts from empty fields.
export function NewPlanForm(props:Omit<Parameters<typeof ConfirmPlanForm>[0],'plan'|'onSaved'>){
 const[round,setRound]=useState(0);
 const saved=useCallback(()=>setRound(r=>r+1),[]);
 return <ConfirmPlanForm key={round} {...props} onSaved={saved}/>;
}
