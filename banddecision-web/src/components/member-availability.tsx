'use client';
import {useMemo,useState} from 'react';
import {Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {twoMonthWindow} from '@/lib/calendar-window';
import {dayLabel,shortDayLabel,weekdayShort} from '@/lib/day-format';
import {answeredMonths,monthLabel,monthOf} from '@/lib/availability-months';
import {AskDatesButton} from '@/components/ask-dates-button';
import type {PlanDay} from '@/components/schedule-planner';

type Member={id:string;nickname:string;part:string};
type Row={memberId:string;date:string};
const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const shift=(day:string,days:number)=>iso(new Date(Date.parse(day+'T00:00:00Z')+days*86400000));
const PAGE=28;
// Darker blue = more members free that day (PC 가능 인원 row and the phone's 전체 calendar).
function heat(n:number,total:number){const r=total?n/total:0;return r>=1?'bg-brand text-white':r>=0.75?'bg-[#5b8def] text-white':r>=0.5?'bg-[#a9c3f7] text-mine-ink':n>0?'bg-brand-tint text-mine-ink':'border border-dashed border-line-strong bg-white text-faint';}

// 멤버별 (leader only): who is free when, from the same data every member can already read on the 내 일정 calendar.
// Phone: one member at a time on a month calendar. PC (lg+): members × days from today, four weeks per page.
export function MemberAvailability({today,members,available,memberId,plans,heading}:{today:string;members:Member[];available:Row[];memberId:string;plans:PlanDay[];heading:React.ReactNode}){
 const{firstMonth,lastMonth,endDate}=twoMonthWindow(today),months=firstMonth===lastMonth?[firstMonth]:[firstMonth,lastMonth];
 const[sel,setSel]=useState<string>('all'),[month,setMonth]=useState(firstMonth),[page,setPage]=useState(0);
 const ordered=useMemo(()=>[...members.filter(m=>m.id===memberId),...members.filter(m=>m.id!==memberId)],[members,memberId]);
 const name=(m:Member)=>m.id===memberId?'나':m.nickname;
 const{byMember,countByDate,answered}=useMemo(()=>{
  const active=new Set(members.map(m=>m.id)),byMember=new Map<string,Set<string>>(),countByDate=new Map<string,number>();
  for(const row of available){if(!active.has(row.memberId))continue;const days=byMember.get(row.memberId)??new Set<string>();days.add(row.date);byMember.set(row.memberId,days);countByDate.set(row.date,(countByDate.get(row.date)??0)+1);}
  return {byMember,countByDate,answered:answeredMonths(available.filter(r=>active.has(r.memberId)))};
 },[members,available]);
 const planByDate=useMemo(()=>new Map(plans.map(p=>[p.date,p])),[plans]);
 const total=members.length,chosen=members.find(m=>m.id===sel)??null;
 const can=(id:string,day:string)=>Boolean(byMember.get(id)?.has(day));
 const said=(id:string,m:string)=>Boolean(answered.get(id)?.has(m));
 const planState=(plan:PlanDay,id:string)=>plan.attendingIds?.includes(id)?'참석':plan.absentIds?.includes(id)?'불참':'합주';
 const ahead=(id:string,m:string)=>[...(byMember.get(id)??[])].filter(d=>d>=today&&monthOf(d)===m).length;
 const monthSummary=(id:string)=>months.map(m=>said(id,m)?monthLabel(m)+' '+ahead(id,m)+'일 가능':monthLabel(m)+' 미응답').join(' · ');
 const nextDays=(id:string)=>[...(byMember.get(id)??[])].filter(d=>d>=today&&d<=endDate&&!planByDate.has(d)).sort().slice(0,3);
 const bestDays=useMemo(()=>{const out:string[]=[];for(let d=today;d<=endDate;d=shift(d,1))if(!planByDate.has(d)&&(countByDate.get(d)??0)>0)out.push(d);return out.sort((a,b)=>(countByDate.get(b)??0)-(countByDate.get(a)??0)||a.localeCompare(b)).slice(0,3);},[today,endDate,planByDate,countByDate]);
 const silentBy=months.map(m=>({month:m,names:ordered.filter(x=>!said(x.id,m)).map(name)})).filter(x=>x.names.length>0);

 // Phone calendar.
 const year=Number(month.slice(0,4)),index=Number(month.slice(5,7))-1,blanks=new Date(Date.UTC(year,index,1)).getUTCDay(),count=new Date(Date.UTC(year,index+1,0)).getUTCDate();
 const days=Array.from({length:count},(_,i)=>month+'-'+pad(i+1));
 const moveMonth=(step:number)=>{const m=iso(new Date(Date.UTC(year,index+step,1))).slice(0,7);if(m>=firstMonth&&m<=lastMonth)setMonth(m);};
 // PC pages: four weeks at a time from today to the end of next month.
 const window_:string[]=[];for(let d=today;d<=endDate;d=shift(d,1))window_.push(d);
 const pages=Math.max(1,Math.ceil(window_.length/PAGE)),pageDays=window_.slice(page*PAGE,page*PAGE+PAGE),pageMonths=[...new Set(pageDays.map(monthOf))];
 const rowCount=(id:string)=>{const missing=pageMonths.filter(m=>!said(id,m));if(missing.length===pageMonths.length)return {text:'미응답',wait:true};if(missing.length)return {text:missing.map(monthLabel).join('·')+' 미응답',wait:true};return {text:pageDays.filter(d=>can(id,d)).length+'일',wait:false};};

 const chip=(on:boolean,wait=false)=>'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold '+(on?'border-ink bg-ink text-white':wait?'border-dashed border-pending bg-white text-warn-ink':'border-line-strong bg-white text-ink-2');
 const summaryCard=(id:string)=>{const m=members.find(x=>x.id===id)!;const next=nextDays(id);return <div data-member-summary={id} className="flex items-start gap-2.5"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-ink-2">{[...name(m)][0]}</span><span className="flex min-w-0 flex-col gap-0.5"><span><b className="text-base font-bold">{name(m)}</b> <span className="text-sm text-muted">{m.part}</span></span><span className="text-sm text-ink-2">{monthSummary(id)}</span><span className="text-sm text-muted">{next.length?'다음 가능한 날: '+next.map(dayLabel).join(', '):'앞으로 가능한 날이 없어요'}</span></span></div>;};
 const bestCard=<div data-best-days className="flex flex-col gap-1"><b className="text-base font-bold">많이 되는 날</b>{bestDays.length?<ul className="flex flex-col gap-0.5 text-sm text-ink-2">{bestDays.map(d=><li key={d}>{dayLabel(d)} · {countByDate.get(d)}/{total}명</li>)}</ul>:<p className="text-sm text-muted">아직 겹치는 날이 없어요</p>}</div>;
 const silentCard=<div data-silent-months className="flex flex-col gap-1.5">{silentBy.length?<><b className="text-base font-bold text-warn-ink">미응답</b><ul className="flex flex-col gap-0.5 text-sm text-ink-2">{silentBy.map(x=><li key={x.month}><b className="font-bold">{monthLabel(x.month)} {x.names.length}명</b> · {x.names.join(', ')}</li>)}</ul><AskDatesButton months={silentBy.map(x=>monthLabel(x.month)).join('·')} className="self-start"/></>:<><b className="text-base font-bold">미응답 없음</b><p className="text-sm text-muted">모두 {months.map(monthLabel).join('·')} 날짜를 냈어요</p></>}</div>;

 return <div className="mx-auto flex w-full max-w-xl flex-col gap-3 lg:max-w-none lg:gap-4">
 <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 px-1 lg:justify-start lg:gap-4">{heading}<span className="hidden text-[13px] font-semibold text-muted lg:ml-auto lg:inline">밴드장만 보여요</span></div>

 {/* Phone */}
 <div className="flex flex-col gap-3 lg:hidden">
  <div role="group" aria-label="멤버 고르기" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
   <button type="button" aria-pressed={sel==='all'} onClick={()=>setSel('all')} className={chip(sel==='all')}>전체</button>
   {ordered.map(m=>{const ok=said(m.id,month);return <button type="button" key={m.id} data-member-chip={m.id} aria-pressed={sel===m.id} onClick={()=>setSel(m.id)} className={chip(sel===m.id,!ok)}>{name(m)}<small className={'text-xs font-semibold '+(sel===m.id?'text-[#cbd5e1]':ok?'text-muted':'text-warn-ink')}>{ok?ahead(m.id,month)+'일':'미응답'}</small></button>;})}
  </div>
  <section aria-label="멤버별 달력" className="rounded-[20px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
   <div className="flex items-center justify-center gap-1"><button type="button" aria-label="이전 달" onClick={()=>moveMonth(-1)} disabled={month<=firstMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronLeft size={22}/></button><h2 aria-live="polite" className="min-w-32 text-center text-lg font-bold">{year}년 {index+1}월</h2><button type="button" aria-label="다음 달" onClick={()=>moveMonth(1)} disabled={month>=lastMonth} className="grid size-11 place-items-center rounded-xl text-ink-2 disabled:text-line-strong"><ChevronRight size={22}/></button></div>
   {chosen&&!said(chosen.id,month)&&<p data-month-silent className="mt-1 rounded-lg border border-note-line bg-note-bg px-3 py-2 text-sm font-semibold text-warn-ink">{chosen.id===memberId?monthLabel(month)+' 내 날짜를 아직 안 냈어요':name(chosen)+' 님은 '+monthLabel(month)+' 날짜를 아직 안 냈어요'}</p>}
   <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-1 text-center text-[13px] font-semibold text-muted">{['일','월','화','수','목','금','토'].map((d,i)=><span key={d} className={i===0?'text-danger':i===6?'text-brand-ink':''}>{d}</span>)}</div>
   <div className="mt-2 grid grid-cols-7 gap-1">{Array.from({length:blanks},(_,i)=><span key={'b'+i}/>)}{days.map(day=>{
    const past=day<today,plan=planByDate.get(day),n=countByDate.get(day)??0,mine=chosen?can(chosen.id,day):false;
    const state=past?'past':plan?'plan':chosen?(mine?'yes':'no'):'count';
    const tone=past?'border border-surface-2 bg-surface-2 text-faint':plan?(chosen&&planState(plan,chosen.id)==='참석'?'border border-plan-dot bg-plan-dot text-white':'border border-plan-line bg-plan-bg text-plan-ink'):chosen?(mine?'border border-mine-line bg-brand-tint text-mine-ink':'border border-line bg-white text-faint'):heat(n,total);
    const small=past?'':plan?(chosen?'합주 '+planState(plan,chosen.id):'합주'):chosen?(mine?'가능':''):n+'/'+total;
    return <div key={day} data-member-day={day} data-state={state} aria-label={dayLabel(day)+', '+(past?'지난 날':plan?(chosen?name(chosen)+' '+small:'합주 확정'):chosen?name(chosen)+(mine?' 가능':' 안 냄'):n+'/'+total+'명 가능')} className={'relative flex h-12 min-w-0 flex-col items-center justify-center rounded-xl leading-tight '+tone+(day===today?' shadow-[0_0_0_2px_#101828]':'')}>
     {chosen&&mine&&!past&&!plan&&<Check aria-hidden="true" strokeWidth={4} className="absolute right-[3px] top-[3px] size-[9px] text-brand-ink"/>}
     <span className="text-[15px] font-bold">{Number(day.slice(8))}</span>{small&&<span className="whitespace-nowrap text-[10px] font-bold tracking-tight">{small}</span>}
    </div>;
   })}</div>
   <div aria-hidden="true" className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 px-0.5 text-xs font-semibold text-ink-2">{chosen?<><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] border border-mine-line bg-brand-tint"/>{name(chosen)} 가능</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] border border-line bg-white"/>안 냄</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-plan-dot"/>합주 참석</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] border border-plan-line bg-plan-bg"/>합주 불참</span></>:<><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] bg-brand"/>진할수록 많이 가능</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-[4px] border border-plan-line bg-plan-bg"/>합주 확정</span></>}</div>
  </section>
  <section aria-label="요약" className="flex flex-col gap-3 rounded-[20px] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">{chosen?summaryCard(chosen.id):<>{bestCard}<div className="border-t border-line pt-3">{silentCard}</div></>}</section>
 </div>

 {/* PC */}
 <div className="hidden flex-col gap-4 lg:flex">
  <section aria-label="멤버별 가능한 날" className="rounded-2xl bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
   <div className="mb-3 flex items-center gap-2"><button type="button" aria-label="이전 4주" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} className="grid size-9 place-items-center rounded-lg text-ink-2 disabled:text-line-strong"><ChevronLeft size={20}/></button><h2 aria-live="polite" className="text-[17px] font-extrabold">{shortDayLabel(pageDays[0])} – {shortDayLabel(pageDays[pageDays.length-1])}</h2><button type="button" aria-label="다음 4주" onClick={()=>setPage(p=>Math.min(pages-1,p+1))} disabled={page>=pages-1} className="grid size-9 place-items-center rounded-lg text-ink-2 disabled:text-line-strong"><ChevronRight size={20}/></button><span className="ml-auto text-[13px] text-muted">이름을 누르면 그 멤버를 자세히 봐요 · 입력할 수 있는 다음 달 말까지</span></div>
   <div data-member-matrix className="grid gap-x-[3px] gap-y-1" style={{gridTemplateColumns:'176px repeat('+pageDays.length+',minmax(0,1fr))'}}>
    <span/>
    {pageDays.map((d,i)=>{const first=i===0||d.slice(8)==='01',w=weekdayShort(d);return <span key={d} aria-hidden="true" className={'flex flex-col items-center pb-1 leading-tight '+(i>0&&d.slice(8)==='01'?'border-l-2 border-line-strong':'')}><em className="h-3 whitespace-nowrap text-[10px] font-bold not-italic text-muted">{first?monthLabel(monthOf(d)):''}</em><b className="text-[13px] font-bold">{Number(d.slice(8))}</b><small className={'text-[10px] font-semibold '+(w==='일'?'text-danger':w==='토'?'text-brand-ink':'text-muted')}>{w}</small></span>;})}
    {ordered.map(m=>{const on=sel===m.id,c=rowCount(m.id);return <div key={m.id} data-member-row={m.id} className="contents">
     <button type="button" aria-pressed={on} onClick={()=>setSel(on?'all':m.id)} className={'-ml-1.5 flex h-[34px] min-w-0 items-center gap-2 rounded-lg pl-1.5 pr-1.5 text-left text-sm '+(on?'bg-brand-tint':'hover:bg-surface-2')}><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-ink-2">{[...name(m)][0]}</span><b className="min-w-0 truncate font-bold">{name(m)}</b><small className="shrink-0 text-xs text-muted">{m.part}</small><span className={'ml-auto shrink-0 whitespace-nowrap text-xs font-bold '+(c.wait?'text-warn-ink':'text-ink-2')}>{c.text}</span></button>
     {pageDays.map((d,i)=>{const plan=planByDate.get(d),yes=can(m.id,d),st=plan?planState(plan,m.id):'';return <span key={d} data-cell={d} data-state={plan?'plan-'+st:yes?'yes':'no'} title={name(m)+' · '+dayLabel(d)+' · '+(plan?'합주 '+st:yes?'가능':'안 냄')} className={'h-[34px] rounded-md border '+(plan?(st==='참석'?'border-plan-dot bg-plan-dot':'border-plan-line bg-plan-bg'):yes?'border-brand bg-brand':'border-line bg-white')+(i>0&&d.slice(8)==='01'?' ml-px':'')+(on?' shadow-[inset_0_0_0_1.5px_#101828]':'')}/>;})}
    </div>;})}
    <span className="mt-1 flex items-center border-t border-line pt-1.5 text-xs font-bold text-muted">가능 인원</span>
    {pageDays.map(d=>{const plan=planByDate.get(d),n=countByDate.get(d)??0;return <span key={d} data-total={d} className={'mt-1.5 grid h-[30px] place-items-center rounded-md text-xs font-bold '+(plan?'bg-plan-bg text-[10px] text-plan-ink':heat(n,total))}>{plan?'합주':n}</span>;})}
   </div>
   <div aria-hidden="true" className="mt-3.5 flex flex-wrap gap-4 text-xs font-semibold text-ink-2"><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[4px] bg-brand"/>가능</span><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[4px] border border-line bg-white"/>안 냄</span><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[4px] bg-plan-dot"/>합주 참석</span><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[4px] border border-plan-line bg-plan-bg"/>합주 불참</span><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-[4px] bg-white shadow-[inset_0_0_0_1.5px_#101828]"/>고른 멤버</span></div>
  </section>
  <div className="grid grid-cols-2 gap-3">
   <section aria-label="요약" className="rounded-2xl bg-white px-[18px] py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">{chosen?summaryCard(chosen.id):bestCard}</section>
   <section aria-label="미응답" className="rounded-2xl bg-white px-[18px] py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">{silentCard}</section>
  </div>
 </div>
 </div>;
}
