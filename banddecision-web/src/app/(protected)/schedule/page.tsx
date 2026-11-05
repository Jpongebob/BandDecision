import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,seoulToday} from '@/lib/live-planning';
import {AvailabilityForm} from '@/components/availability-form';
import {Card,CardTitle} from '@/components/ui/card';
export default async function SchedulePage(){
 const db=await createClient();if(!db)return null;
 const context=await loadVerifiedPlanningPage(db,'attendance');
 if(!context)return <Card><CardTitle>먼저 밴드에 가입해 주세요</CardTitle><Link href="/dashboard">홈으로</Link></Card>;
 const{member:me,data}=context;
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">내 일정</h1><p className="mt-2 text-sm text-slate-500">저장한 불가능 날짜는 직접 수정하거나 삭제할 때까지 유지됩니다.</p></div><AvailabilityForm members={data.members} unavailable={data.unavailable} memberId={me.id} today={seoulToday()} savedDates={data.unavailable.filter(d=>d.memberId===me.id).map(d=>({date:d.date,reason:d.reason}))}/><Link className="inline-block text-sm font-semibold text-blue-700" href="/schedule/recommendations">추천 날짜 보기 →</Link></div>;
}
