'use client';
import {useState} from 'react';
import {SchedulePlanner,type PlanDay} from '@/components/schedule-planner';
import {MemberAvailability} from '@/components/member-availability';

type Props={today:string;members:{id:string;nickname:string;part:string}[];available:{memberId:string;date:string}[];memberId:string;plans:PlanDay[];leader:boolean};
// 일정: everyone gets 내 일정; the leader also gets 멤버별. 내 일정 stays mounted while 멤버별 is shown,
// so unsaved picks survive switching back and forth.
export function ScheduleView(props:Props){
 const[view,setView]=useState<'mine'|'members'>('mine');
 if(!props.leader)return <SchedulePlanner {...props}/>;
 const seg=(on:boolean)=>'min-h-10 whitespace-nowrap rounded-[10px] px-3 text-[15px] min-[380px]:px-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand '+(on?'border border-line-strong bg-white font-bold text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]':'border border-transparent font-semibold text-muted');
 const heading=<span className="flex shrink-0 items-center gap-2.5 min-[380px]:gap-3"><h1 className="whitespace-nowrap text-2xl font-extrabold">일정</h1><span role="group" aria-label="일정 보기" className="flex rounded-xl bg-seg p-0.5"><button type="button" aria-pressed={view==='mine'} onClick={()=>setView('mine')} className={seg(view==='mine')}>내 일정</button><button type="button" aria-pressed={view==='members'} onClick={()=>setView('members')} className={seg(view==='members')}>멤버별</button></span></span>;
 return <>
  <div hidden={view!=='mine'} className="contents"><SchedulePlanner {...props} heading={heading}/></div>
  {view==='members'&&<MemberAvailability {...props} heading={heading}/>}
 </>;
}
