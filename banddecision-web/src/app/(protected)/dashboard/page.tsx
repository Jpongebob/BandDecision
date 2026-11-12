import Link from 'next/link';
import {MapPin} from 'lucide-react';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getBandContext} from '@/lib/band-context';
import {loadHomeContext,seoulToday} from '@/lib/live-planning';
import {BandLoadError} from '@/components/band-load-error';
import {Card,CardTitle} from '@/components/ui/card';
import {Button,buttonStyles} from '@/components/ui/button';
import {AttendanceChip,DDay,SongChips} from '@/components/plan-bits';
import {dayLabel,timeRangeLabel} from '@/lib/day-format';
const chip='whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-[15px] font-semibold text-ink-2';
// Home shows a few songs only; the plans page lists all of them.
const songLine=(songs:{title_snapshot:string}[],max=2)=>songs.slice(0,max).map(s=>s.title_snapshot).join(', ')+(songs.length>max?' +'+(songs.length-max)+'곡':'');
export default async function Dashboard(){
 const db=await createClient();if(!db)return null;
 // Start the SQL actor-scoped summary alongside the identity lookup.
 const homePromise=loadHomeContext(db);homePromise.catch(()=>{});
 const user=await getCurrentUser(db);if(!user)return null;
 const context=await getBandContext(db,user.id,user.bandContext);if(context.status==='error')return <BandLoadError code={context.code}/>;
 if(context.status!=='ready')return <Card><CardTitle>우리 밴드로 시작하세요</CardTitle><Link href="/bands/new"><Button className="mt-4">밴드 만들기</Button></Link></Card>;
 const home=await homePromise,[nextPlan,...laterPlans]=home.upcoming_plans,leader=context.member.role==='leader';
 const today=seoulToday();
 return <div className="mx-auto flex max-w-xl flex-col gap-3">
 <div className="flex flex-col gap-2.5 px-1"><h1 className="text-2xl font-extrabold leading-8">{user.nickname}님, 안녕하세요</h1><div className="flex flex-wrap gap-1.5">{leader&&<span className="whitespace-nowrap rounded-full bg-brand-tint px-3 py-1.5 text-[15px] font-semibold text-brand-ink">밴드장</span>}<span className={chip}>멤버 {home.member_count}명</span><span className={chip}>예정 합주 {home.upcoming_plan_count}/5</span></div></div>
 <Card aria-label="다가오는 합주" className="flex flex-col gap-3.5"><span className="text-[15px] font-bold text-brand-ink">다가오는 합주</span>{nextPlan?<>
  <div><div className="flex flex-wrap items-center gap-2"><time dateTime={nextPlan.rehearsal_date} className="text-2xl font-extrabold leading-8">{dayLabel(nextPlan.rehearsal_date)}</time><DDay day={nextPlan.rehearsal_date} today={today} large/></div><p className="text-[17px] font-semibold text-ink-2">{timeRangeLabel(nextPlan.starts_at,nextPlan.ends_at)}</p></div>
  <div className="flex flex-col gap-2.5"><p className="flex items-center gap-2.5 text-base text-ink-2"><MapPin size={20} aria-hidden="true" className="shrink-0 text-muted"/><span className="min-w-0 break-words">{nextPlan.location||'장소 미정'}</span></p><AttendanceChip attending={nextPlan.attendee_count} total={nextPlan.participant_count}/></div>
  {nextPlan.confirmed_plan_songs.length>0&&<SongChips titles={nextPlan.confirmed_plan_songs.map(s=>s.title_snapshot)} max={3}/>}
  {nextPlan.memo&&<p className="line-clamp-3 whitespace-pre-wrap rounded-xl bg-note-bg px-3.5 py-3 text-base leading-[22px] text-ink-2"><b className="font-bold text-warn-ink">메모</b> · {nextPlan.memo}</p>}
  {/* Same order as the next rehearsal (date·D-day, time, place, attendance, songs), only smaller. */}
  {laterPlans.length>0&&<div className="flex flex-col gap-3 border-t border-line pt-3"><span className="text-[15px] font-bold text-muted">그다음 합주</span>{laterPlans.map(plan=><div key={plan.id} data-later-plan className="flex min-w-0 flex-col gap-1">
   <div className="flex items-center gap-2"><time dateTime={plan.rehearsal_date} className="text-[17px] font-bold">{dayLabel(plan.rehearsal_date)}</time><DDay day={plan.rehearsal_date} today={today}/><span className="grow"/><AttendanceChip attending={plan.attendee_count} total={plan.participant_count}/></div>
   <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[15px] text-ink-2"><span className="font-semibold">{timeRangeLabel(plan.starts_at,plan.ends_at)}</span><span aria-hidden="true" className="text-line-strong">·</span><span className="inline-flex min-w-0 items-center gap-1"><MapPin size={16} aria-hidden="true" className="shrink-0 text-muted"/><span className="min-w-0 break-words">{plan.location||'장소 미정'}</span></span></p>
   {plan.confirmed_plan_songs.length>0&&<p className="break-words text-[15px] text-ink-2">곡: {songLine(plan.confirmed_plan_songs)}</p>}
  </div>)}</div>}
 </>:<p className="text-base text-ink-2">아직 정해진 합주가 없어요. 일정에서 가능한 날을 저장하면 밴드장이 합주를 정할 수 있어요.</p>}
 <Link href={nextPlan?'/plans':'/schedule'} className={buttonStyles({variant:'secondary',size:'lg'})}>{nextPlan?'합주 계획 보기':'내 일정 입력하기'}</Link></Card>
 </div>;
}
