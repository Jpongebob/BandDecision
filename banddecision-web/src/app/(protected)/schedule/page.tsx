import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,seoulToday} from '@/lib/live-planning';
import {SchedulePlanner,type PlanDay} from '@/components/schedule-planner';
import {Card,CardTitle} from '@/components/ui/card';
export default async function SchedulePage(){
 const db=await createClient();if(!db)return null;
 const context=await loadVerifiedPlanningPage(db,'attendance',true);
 if(!context)return <Card><CardTitle>먼저 밴드에 가입해 주세요</CardTitle><Link href="/dashboard">홈으로</Link></Card>;
 const{member:me,data}=context,today=seoulToday(),myName=data.members.find(m=>m.id===me.id)?.nickname;
 // Confirmed rehearsals keep their own attendee snapshot; show it on the calendar day.
 const plans:PlanDay[]=(context.plans??[]).filter(p=>p.rehearsal_date>=today).map(p=>({date:p.rehearsal_date,attending:p.confirmed_plan_members.filter(m=>m.attending).map(m=>m.nickname_snapshot===myName?'나':m.nickname_snapshot),absent:p.confirmed_plan_members.filter(m=>!m.attending).map(m=>m.nickname_snapshot===myName?'나':m.nickname_snapshot)}));
 return <SchedulePlanner members={data.members} available={data.available} memberId={me.id} today={today} plans={plans}/>;
}
