import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,attendanceRecommendations,seoulToday} from '@/lib/live-planning';
import {DateRecommendationList} from '@/components/date-recommendation-list';
import {Card,CardTitle} from '@/components/ui/card';
export default async function DateRecommendationsPage(){
 const db=await createClient();if(!db)return null;const context=await loadVerifiedPlanningPage(db,'attendance');
 if(!context)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const data=context.data,dates=attendanceRecommendations(data,seoulToday());
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">날짜 추천</h1><p className="mt-2 text-sm text-slate-500">현재 멤버 {data.members.length}명의 저장된 불가능 날짜를 반영합니다. 이번 달과 다음 달 중 추천합니다.</p><Link href="/plans" className="mt-3 inline-block text-sm font-semibold text-blue-700">합주 날짜 정하기 →</Link></div><DateRecommendationList items={dates} total={data.members.length}/></div>;
}
