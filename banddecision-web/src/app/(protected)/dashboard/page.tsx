import {PlanMemo} from '@/components/plan-memo';
import Link from 'next/link';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getBandContext} from '@/lib/band-context';
import {loadHomeContext} from '@/lib/live-planning';
import {BandLoadError} from '@/components/band-load-error';
import {Card,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
function weekday(day:string){return new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(day+'T12:00:00+09:00'));}
export default async function Dashboard(){
 const db=await createClient();if(!db)return null;
 // Start the SQL actor-scoped summary alongside the identity lookup.
 const homePromise=loadHomeContext(db);homePromise.catch(()=>{});
 const user=await getCurrentUser(db);if(!user)return null;
 const context=await getBandContext(db,user.id,user.bandContext);if(context.status==='error')return <BandLoadError code={context.code}/>;
 if(context.status!=='ready')return <Card><CardTitle>우리 밴드로 시작하세요</CardTitle><Link href="/bands/new"><Button className="mt-4">밴드 만들기</Button></Link></Card>;
 const home=await homePromise,[nextPlan,...laterPlans]=home.upcoming_plans,leader=context.member.role==='leader';
 return <div className="space-y-5"><div><p className="text-sm font-semibold text-blue-700">반가워요, {user.nickname}</p><h1 className="mt-1 text-3xl font-black">{context.band.name}</h1><p className="mt-2 text-sm text-slate-500">멤버 {home.member_count}명 · 예정된 합주 {home.upcoming_plan_count}/5개</p>{leader&&<Badge>밴드장</Badge>}</div>
 <Card><CardTitle>다가오는 합주</CardTitle>{nextPlan?<>
 <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"><p className="text-xl font-bold"><time dateTime={nextPlan.rehearsal_date}>{nextPlan.rehearsal_date} ({weekday(nextPlan.rehearsal_date)})</time></p><p className="text-base font-semibold text-slate-600">{nextPlan.starts_at.slice(0,5)}–{nextPlan.ends_at.slice(0,5)}</p></div>
 {nextPlan.location&&<p className="mt-2 break-words text-sm font-semibold">장소: {nextPlan.location}</p>}<p className="mt-2 text-sm">참석 {nextPlan.attendee_count}/{nextPlan.participant_count}명</p><PlanMemo memo={nextPlan.memo} compact/>
 {laterPlans.length>0&&<div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-500">이후 합주</h3><ul className="mt-2 divide-y divide-slate-100">{laterPlans.map(plan=><li key={plan.id} className="py-3"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"><time dateTime={plan.rehearsal_date} className="font-bold">{plan.rehearsal_date} ({weekday(plan.rehearsal_date)})</time><span className="text-sm text-slate-600">{plan.starts_at.slice(0,5)}–{plan.ends_at.slice(0,5)}</span></div><p className="mt-1 break-words text-sm text-slate-600">{plan.location?'장소: '+plan.location:'장소 미정'}</p></li>)}</ul></div>}
 </>:<p className="mt-3 text-sm">정해진 합주가 없습니다. 가능한 날짜를 등록하면 밴드장이 합주 계획을 정할 수 있습니다.</p>}
 <Link className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-blue-700" href="/plans">합주 계획 전체 보기 →</Link></Card>
 </div>;
}
