'use client';
import {useEffect,useMemo,useRef,useState,useTransition} from 'react';
import type {KeyboardEvent} from 'react';
import {useRouter} from 'next/navigation';
import {Check,ChevronLeft,ChevronRight,Hand,Info,SquareCheck} from 'lucide-react';
import {twoMonthWindow} from '@/lib/calendar-window';
import {dayLabel} from '@/lib/day-format';
import {saveAvailabilityChanges} from '@/app/live-actions';
import {SavedDatesSheet} from '@/components/saved-dates-sheet';

type Member={id:string;nickname:string;part:string};
export type PlanDay={date:string;attending:string[];absent:string[]};
type Toast={text:string;undoAdd:string[];undoRemove:string[]};
const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const shift=(day:string,days:number)=>iso(new Date(Date.parse(day+'T00:00:00Z')+days*86400000));
function monthCells(month:string){
 const year=Number(month.slice(0,4)),index=Number(month.slice(5,7))-1,first=new Date(Date.UTC(year,index,1)).getUTCDay(),count=new Date(Date.UTC(year,index+1,0)).getUTCDate();
 return {year,index,blanks:first,days:Array.from({length:count},(_,i)=>month+'-'+pad(i+1))};
}
function between(a:string,b:string){const first=a<b?a:b,last=a<b?b:a,out:string[]=[];for(let d=first;d<=last&&out.length<62;d=shift(d,1))out.push(d);return out;}
const sorted=(xs:Iterable<string>)=>[...new Set(xs)].sort();

// 내 일정: tap a date once to see who can come, tap the same date again (or pick a range/month) to stage
// additions and removals, then save them together. Confirmed rehearsal days are shown in green.
export function SchedulePlanner({today,members,available,memberId,plans}:{today:string;members:Member[];available:{memberId:string;date:string}[];memberId:string;plans:PlanDay[]}){
 const router=useRouter();
 const{firstMonth,lastMonth,endDate}=twoMonthWindow(today);
 const[month,setMonth]=useState(firstMonth),[focus,setFocus]=useState(today),[mode,setMode]=useState<'multi'|'range'>('multi'),[anchor,setAnchor]=useState('');
 const[add,setAdd]=useState<string[]>([]),[remove,setRemove]=useState<string[]>([]),[toast,setToast]=useState<Toast|null>(null),[error,setError]=useState('');
 const[leaveHref,setLeaveHref]=useState<string|null>(null),[pending,start]=useTransition();
 const leaveDialog=useRef<HTMLDialogElement>(null),grid=useRef<HTMLDivElement>(null);
 const total=members.length,me=members.find(m=>m.id===memberId);
 const fromServer=useMemo(()=>new Set(available.filter(r=>r.memberId===memberId).map(r=>r.date)),[available,memberId]);
 // After a save the server props arrive a moment later; until then show the saved result so a quick second tap
 // on the same day is judged against the new state (a fresh `available` array replaces this automatically).
 const[local,setLocal]=useState<{base:typeof available;dates:Set<string>}|null>(null);
 const saved=local&&local.base===available?local.dates:fromServer;
 const planByDate=useMemo(()=>new Map(plans.map(p=>[p.date,p])),[plans]);
 const others=useMemo(()=>{
  const active=new Set(members.map(m=>m.id)),byDate=new Map<string,Set<string>>(),responded=new Set<string>();
  for(const row of available){if(!active.has(row.memberId)||row.memberId===memberId)continue;if(row.date>=today&&row.date<=endDate)responded.add(row.memberId);const ids=byDate.get(row.date)??new Set<string>();ids.add(row.memberId);byDate.set(row.date,ids);}
  return {byDate,responded};
 },[members,available,memberId,today,endDate]);
 const dirty=add.length+remove.length>0;
 const mine=(day:string)=>(saved.has(day)&&!remove.includes(day))||add.includes(day);
 const count=(day:string)=>(others.byDate.get(day)?.size??0)+(me&&mine(day)?1:0);

 // Leaving with unsaved changes: intercept in-app links and page unloads.
 useEffect(()=>{
  if(!dirty)return;
  const click=(e:MouseEvent)=>{
   const link=(e.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!link||link.target==='_blank'||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey)return;
   const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname)return;
   e.preventDefault();e.stopPropagation();setLeaveHref(url.pathname+url.search);
  };
  const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();};
  document.addEventListener('click',click,true);window.addEventListener('beforeunload',unload);
  return()=>{document.removeEventListener('click',click,true);window.removeEventListener('beforeunload',unload);};
 },[dirty]);
 useEffect(()=>{const d=leaveDialog.current;if(!d)return;if(leaveHref&&!d.open)d.showModal();if(!leaveHref&&d.open)d.close();},[leaveHref]);

 function toggle(day:string){
  setToast(null);setError('');
  if(saved.has(day))setRemove(r=>r.includes(day)?r.filter(x=>x!==day):sorted([...r,day]));
  else setAdd(a=>a.includes(day)?a.filter(x=>x!==day):sorted([...a,day]));
 }
 function pick(day:string){
  if(pending||day<today)return;
  if(mode==='range'&&!saved.has(day)&&!planByDate.has(day)){
   setToast(null);setError('');setFocus(day);
   if(!anchor){setAnchor(day);setAdd(a=>sorted([...a,day]));return;}
   setAdd(a=>sorted([...a,...between(anchor,day).filter(d=>d>=today&&d<=endDate&&!saved.has(d)&&!planByDate.has(d))]));setAnchor('');return;
  }
  if(day!==focus){setFocus(day);return;}
  toggle(day);
 }
 const cells=monthCells(month);
 const monthChoices=cells.days.filter(d=>d>=today&&!saved.has(d)&&!planByDate.has(d));
 const monthAll=monthChoices.length>0&&monthChoices.every(d=>add.includes(d));
 function pickMonth(){if(pending||!monthChoices.length)return;setToast(null);setError('');setAnchor('');setAdd(a=>monthAll?a.filter(d=>!monthChoices.includes(d)):sorted([...a,...monthChoices]));}
 function move(step:number){const target=iso(new Date(Date.UTC(cells.year,cells.index+step,1))).slice(0,7);if(target>=firstMonth&&target<=lastMonth)setMonth(target);}
 function keyboard(e:KeyboardEvent<HTMLButtonElement>,day:string){
  const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
  if(!(e.key in delta))return;e.preventDefault();
  const target=shift(day,delta[e.key]);if(target<today||target>endDate)return;
  setFocus(target);if(target.slice(0,7)!==month)setMonth(target.slice(0,7));
  requestAnimationFrame(()=>grid.current?.querySelector<HTMLButtonElement>('[data-day="'+target+'"]')?.focus());
 }
 function commit(next?:string){
  const a=add,r=remove;if(!a.length&&!r.length)return;
  start(async()=>{
   const result=await saveAvailabilityChanges({add:a,remove:r});
   if(!result.ok){setError(result.error??'저장하지 못했어요.');if(result.added)setAdd([]);return;}
   const parts=[a.length?a.length+'일 추가':'',r.length?r.length+'일 빼기':''].filter(Boolean);
   setLocal({base:available,dates:new Set([...[...saved].filter(d=>!r.includes(d)),...a])});
   setAdd([]);setRemove([]);setAnchor('');setToast({text:'저장했어요 · '+parts.join(', '),undoAdd:r,undoRemove:a});
   if(next){setLeaveHref(null);router.push(next);}
  });
 }
 function undo(){
  const t=toast;if(!t)return;
  start(async()=>{const result=await saveAvailabilityChanges({add:t.undoAdd,remove:t.undoRemove});if(!result.ok){setError(result.error??'되돌리지 못했어요.');return;}setLocal({base:available,dates:new Set([...[...saved].filter(d=>!t.undoRemove.includes(d)),...t.undoAdd])});setToast(null);});
 }

 // Details for the focused date.
 const plan=planByDate.get(focus),focusMine=mine(focus);
 const can=members.filter(m=>m.id!==memberId&&others.byDate.get(focus)?.has(m.id)).map(m=>m.nickname),cannot=members.filter(m=>m.id!==memberId&&others.responded.has(m.id)&&!others.byDate.get(focus)?.has(m.id)).map(m=>m.nickname),silent=members.filter(m=>m.id!==memberId&&!others.responded.has(m.id)).map(m=>m.nickname);
 if(me){(focusMine?can:cannot).push('나');}
 const hint=mode==='range'?(anchor?'끝 날을 누르면 그 사이가 모두 추가돼요':'시작 날과 끝 날을 차례로 누르세요'):add.includes(focus)?'한 번 더 누르면 추가를 취소해요':remove.includes(focus)?'한 번 더 누르면 빼기를 취소해요':saved.has(focus)?'한 번 더 누르면 내 가능한 날에서 빠져요':'한 번 더 누르면 내 가능한 날에 추가돼요';
 const barTitle=dirty?[add.length?add.length+'일 추가':'',remove.length?remove.length+'일 빼기':''].filter(Boolean).join(' · '):'바뀐 날짜 없음';
 const segment=(on:boolean)=>'min-h-11 rounded-xl px-4 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-brand '+(on?'border border-line-strong bg-white font-bold text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]':'border border-transparent font-semibold text-muted');

 return <div className="mx-auto flex w-full max-w-xl flex-col gap-3 max-lg:min-h-[calc(100dvh-156px)]">
 <div className="flex h-9 shrink-0 items-center justify-between px-1"><h1 className="text-2xl font-extrabold">내 일정</h1><SavedDatesSheet today={today} endDate={endDate} saved={[...saved].sort()} count={count} total={total} plans={planByDate} label={'가능한 날 '+[...saved].filter(d=>d>=today&&d<=endDate).length+'개'}/></div>
 <section aria-label="달력" className="shrink-0 rounded-[20px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
 <div className="flex items-center gap-2"><div role="group" aria-label="선택 방식" className="flex rounded-xl bg-seg"><button type="button" aria-pressed={mode==='multi'} onClick={()=>{setMode('multi');setAnchor('');}} className={segment(mode==='multi')}>하루씩</button><button type="button" aria-pressed={mode==='range'} onClick={()=>{setMode('range');setAnchor('');}} className={segment(mode==='range')}>기간으로</button></div><div className="grow"/><button type="button" onClick={pickMonth} disabled={pending||monthChoices.length===0} aria-pressed={monthAll} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-[15px] font-semibold text-ink-2 disabled:opacity-40"><SquareCheck size={16} aria-hidden="true"/>{monthAll?'전체 해제':'이번 달 전체'}</button></div>
 <div className="mt-2.5 flex items-center justify-center gap-1"><button type="button" aria-label="이전 달" onClick={()=>move(-1)} disabled={month<=firstMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronLeft size={22}/></button><div className="flex min-w-32 flex-col items-center"><h2 aria-live="polite" className="text-lg font-bold">{cells.year}년 {cells.index+1}월</h2><span role="img" aria-label={'입력할 수 있는 2개월 중 '+(month===firstMonth?'첫째':'둘째')+' 달'} className="mt-1 flex gap-1">{[firstMonth,lastMonth].map(m=><span key={m} className={'h-1 rounded-full '+(m===month?'w-3.5 bg-brand':'w-1.5 bg-line-strong')}/>)}</span></div><button type="button" aria-label="다음 달" onClick={()=>move(1)} disabled={month>=lastMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronRight size={22}/></button></div>
 <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-1 text-center text-[13px] font-semibold text-muted">{['일','월','화','수','목','금','토'].map((d,i)=><span key={d} className={i===0?'text-danger':i===6?'text-brand-ink':''}>{d}</span>)}</div>
 <div ref={grid} className="mt-2 grid grid-cols-7 gap-1">{Array.from({length:cells.blanks},(_,i)=><span key={'b'+i}/>)}{cells.days.map(day=>{
  const past=day<today,adding=add.includes(day),removing=remove.includes(day),isSaved=saved.has(day),isPlan=planByDate.has(day),n=count(day);
  const tone=past?'border-surface-2 bg-surface-2 text-faint':adding?'border-brand bg-brand text-white':removing?'border-2 border-dashed border-danger-dash bg-danger-bg text-danger':isPlan?'border-plan-line bg-plan-bg text-plan-ink':isSaved?'border-mine-line bg-brand-tint text-mine-ink':'border-line-strong bg-white text-ink';
  const state=past?'지난 날':adding?'추가 예정':removing?'빼기 예정':isSaved?'가능한 날':'아직 안 고름';
  return <button type="button" key={day} data-day={day} data-state={past?'past':adding?'adding':removing?'removing':isSaved?'saved':'none'} data-plan={isPlan||undefined} disabled={past||pending} onClick={()=>pick(day)} onKeyDown={e=>keyboard(e,day)} aria-pressed={adding||removing} aria-current={day===today?'date':undefined} aria-label={dayLabel(day).replace(/ \((.)\)/,' $1요일')+', '+(day===today?'오늘, ':'')+(past?'':n+'/'+total+'명 참석, ')+state+(isPlan?', 합주 확정':'')+(day===focus?', 보는 중':'')} className={'relative flex h-11 min-w-0 flex-col items-center justify-center rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand '+tone+(day===focus&&!past?' shadow-[0_0_0_3px_#101828]':'')}>
   {isSaved&&!adding&&!removing&&!isPlan&&<Check aria-hidden="true" strokeWidth={4} className="absolute right-[3px] top-[3px] size-[9px] text-brand-ink"/>}
   {day===today&&<span aria-hidden="true" className={'absolute left-1 top-1 size-1.5 rounded-full '+(adding?'bg-white':'bg-brand')}/>}
   <span className={'text-base font-bold leading-5'+(removing?' line-through':'')+(day===today&&!adding?' text-brand-ink':'')}>{Number(day.slice(8))}</span>
   {!past&&<span className="text-[13px] font-semibold leading-4 tabular-nums">{removing?'빼기':isPlan&&!adding?'합주':n+'/'+total}</span>}
  </button>;
 })}</div>
 <div aria-hidden="true" className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 px-0.5 text-sm font-medium text-ink-2 min-[360px]:flex min-[360px]:justify-between"><span className="inline-flex items-center gap-1.5"><span className="grid size-4 place-items-center rounded-[5px] border border-mine-line bg-brand-tint"><Check strokeWidth={4} className="size-[10px] text-brand-ink"/></span>가능한 날</span><span className="inline-flex items-center gap-1.5"><span className="size-4 rounded-[5px] bg-brand"/>추가</span><span className="inline-flex items-center gap-1.5"><span className="size-4 rounded-[5px] border-2 border-dashed border-danger-dash bg-danger-bg"/>빼기</span><span className="inline-flex items-center gap-1.5"><span className="size-4 rounded-[5px] border border-plan-line bg-plan-bg"/>합주 확정</span></div>
 </section>

 <section aria-label="선택한 날짜 현황" aria-live="polite" className="flex grow flex-col gap-1.5 rounded-[20px] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
 <div className="flex items-baseline justify-between gap-2"><span className="inline-flex items-center gap-1.5"><span className="text-[17px] font-bold">{dayLabel(focus)}</span>{plan&&<span className="whitespace-nowrap rounded-md bg-plan-bg px-1.5 py-0.5 text-[13px] font-bold text-plan-ink">합주 확정</span>}</span><span className="whitespace-nowrap text-[15px] font-semibold text-ink-2">{plan?plan.attending.length+'/'+(plan.attending.length+plan.absent.length):count(focus)+'/'+total}명 참석</span></div>
 {plan?<ul className="flex flex-col text-[15px] leading-5"><NameLine dot="bg-plan-dot" label={'참석 '+plan.attending.length} names={plan.attending}/><NameLine dot="bg-faint" label={'불참 '+plan.absent.length} names={plan.absent}/></ul>
 :<ul className="flex flex-col text-[15px] leading-5"><NameLine dot="bg-brand" label={'가능 '+can.length} names={can}/><NameLine dot="bg-faint" label={'안 됨 '+cannot.length} names={cannot}/>{silent.length>0&&<NameLine dot="border-2 border-pending bg-white" label={'미응답 '+silent.length} names={silent} note="아직 날짜를 안 냈어요"/>}</ul>}
 {focus>=today&&<p className="inline-flex items-start gap-1.5 text-sm font-semibold leading-5 text-brand-ink"><Hand size={16} aria-hidden="true" className="mt-0.5 shrink-0"/>{hint}</p>}
 {plan&&<p className="inline-flex items-start gap-1.5 text-sm font-semibold leading-5 text-plan-ink"><Info size={16} aria-hidden="true" className="mt-0.5 shrink-0"/>확정된 합주예요. 못 오게 되면 밴드장에게도 알려 주세요.</p>}
 {error&&<p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
 {toast?<div role="status" className="sticky bottom-[calc(96px+env(safe-area-inset-bottom))] mt-auto flex lg:bottom-3 h-12 items-center justify-between gap-2 rounded-xl bg-ink pl-3.5 pr-1 text-white"><span className="truncate text-[15px] font-semibold">{toast.text}</span><button type="button" onClick={undo} disabled={pending} className="min-h-11 shrink-0 px-3 text-base font-bold text-[#93b4ff]">되돌리기</button></div>
 :<div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] -mx-4 mt-auto flex items-center gap-1.5 rounded-b-[20px] border-t border-line bg-white px-4 pt-1.5 lg:bottom-0"><span className={'min-w-0 grow '+(dirty?'text-base font-bold':'text-[15px] text-muted')}>{barTitle}</span>{dirty&&<button type="button" disabled={pending} onClick={()=>{setAdd([]);setRemove([]);setAnchor('');setError('');}} className="min-h-11 px-2.5 text-base font-semibold text-ink-2">초기화</button>}<button type="button" disabled={!dirty||pending} onClick={()=>commit()} className="min-h-11 min-w-[76px] rounded-xl bg-brand px-[18px] text-base font-bold text-white disabled:bg-surface-2 disabled:text-faint">{pending?'저장 중…':'저장'}</button></div>}
 </section>

 <dialog ref={leaveDialog} aria-labelledby="leave-title" onCancel={e=>{e.preventDefault();setLeaveHref(null);}} onClick={e=>{if(e.target===e.currentTarget)setLeaveHref(null);}} className="sheet">
 <div className="flex flex-col gap-2.5 px-5 pb-6 pt-2.5"><div aria-hidden="true" className="mx-auto mb-1.5 h-[5px] w-10 rounded-full bg-line-strong"/><h2 id="leave-title" className="text-xl font-extrabold">저장하지 않은 변경이 있어요</h2><p className="mb-1.5 text-base text-muted">{barTitle}. 저장하지 않으면 사라져요.</p>
 <button type="button" disabled={pending} onClick={()=>commit(leaveHref??undefined)} className="min-h-[52px] rounded-[14px] bg-brand text-[17px] font-bold text-white">{pending?'저장 중…':'저장하고 이동'}</button>
 <button type="button" onClick={()=>setLeaveHref(null)} className="min-h-[52px] rounded-[14px] border border-line-strong bg-white text-base font-bold text-ink">계속 고르기</button>
 <button type="button" onClick={()=>{const href=leaveHref;setAdd([]);setRemove([]);setLeaveHref(null);if(href)router.push(href);}} className="min-h-12 rounded-[14px] text-base font-semibold text-danger">저장하지 않고 이동</button></div>
 </dialog>
 </div>;
}
function NameLine({dot,label,names,note}:{dot:string;label:string;names:string[];note?:string}){
 return <li><span aria-hidden="true" className={'mb-px mr-1.5 inline-block size-2 rounded-full align-middle '+dot}/><b className="font-bold">{label}</b> <span className="text-ink-2">· {names.join(', ')||'없음'}{note&&' · '+note}</span></li>;
}
