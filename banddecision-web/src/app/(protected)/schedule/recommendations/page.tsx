import Link from 'next/link';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getActiveMember} from '@/lib/band-context';
import {loadLivePlanning,liveRecommendations,seoulToday} from '@/lib/live-planning';
import {DateRecommendationList} from '@/components/date-recommendation-list';
import {Card,CardTitle} from '@/components/ui/card';
export default async function DateRecommendationsPage(){
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;const{data:me,error}=await getActiveMember(db,user.id,user.bandContext);if(error)throw new Error('DATA_LOAD_FAILED');if(!me)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const data=await loadLivePlanning(db,me.band_id),{dates}=liveRecommendations(data,seoulToday());
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">날짜 추천</h1><p className="mt-2 text-sm text-slate-500">현재 멤버 {data.members.length}명의 저장된 불가능 날짜를 반영합니다. 앞으로 60일 중 추천합니다.</p><Link href="/plans" className="mt-3 inline-block text-sm font-semibold text-blue-700">합주 날짜 정하기 →</Link></div><DateRecommendationList items={dates} total={data.members.length}/></div>;
}
