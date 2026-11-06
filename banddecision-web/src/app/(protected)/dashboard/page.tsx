import {PlanMemo} from '@/components/plan-memo';
import Link from 'next/link';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getBandContext} from '@/lib/band-context';
import {loadHomeContext} from '@/lib/live-planning';
import {BandLoadError} from '@/components/band-load-error';
import {Card,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
export default async function Dashboard(){
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;
 const context=await getBandContext(db,user.id,user.bandContext);if(context.status==='error')return <BandLoadError code={context.code}/>;
 if(context.status!=='ready')return <Card><CardTitle>우리 밴드로 시작하세요</CardTitle><Link href="/bands/new"><Button className="mt-4">밴드 만들기</Button></Link></Card>;
 const home=await loadHomeContext(db),nextPlan=home.next_plan,leader=context.member.role==='leader';
 const weekday=nextPlan?new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(nextPlan.rehearsal_date+'T12:00:00+09:00')):'';
 return <div className="space-y-5"><div><p className="text-sm font-semibold text-blue-700">반가워요, {user.nickname}</p><h1 className="mt-1 text-3xl font-black">{context.band.name}</h1><p className="mt-2 text-sm text-slate-500">멤버 {home.member_count}명 · 예정된 합주 {home.upcoming_plan_count}/5개</p><Badge>{leader?'밴드장':'멤버'}</Badge></div>
 <Card><CardTitle>다가오는 합주</CardTitle>{nextPlan?<><div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"><p className="text-xl font-bold"><time dateTime={nextPlan.rehearsal_date}>{nextPlan.rehearsal_date} ({weekday})</time></p><p className="text-base font-semibold text-slate-600">{nextPlan.starts_at.slice(0,5)}–{nextPlan.ends_at.slice(0,5)}</p></div>{nextPlan.location&&<p className="mt-2 break-words text-sm font-semibold">장소: {nextPlan.location}</p>}<p className="mt-2 text-sm">참석 {nextPlan.attendee_count}/{nextPlan.participant_count}명</p><PlanMemo memo={nextPlan.memo} compact/></>:<p className="mt-3 text-sm">정해진 합주가 없습니다. 곡을 고르기 전에도 날짜부터 정할 수 있습니다.</p>}<Link className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-blue-700" href="/plans">합주 계획 전체 보기 →</Link></Card>
 <Card><CardTitle>내가 할 일</CardTitle><div className={'mt-3 grid gap-3 '+(home.skill_enabled?'sm:grid-cols-3':'sm:grid-cols-2')}><Link href="/songs?view=unvoted" className="rounded-xl bg-blue-50 p-4"><p className="text-sm font-semibold">미투표 곡</p><p className="mt-1 text-2xl font-bold text-blue-700">{home.pending_votes}곡</p><p className="mt-1 text-xs text-slate-600">{home.pending_votes?'곡을 확인하고 투표하세요.':'모든 곡에 투표했습니다.'}</p></Link><Link href="/schedule" className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">등록한 불참 일정</p><p className="mt-1 text-2xl font-bold">{home.upcoming_unavailable.length}일</p><p className="mt-1 text-xs text-slate-600">오늘 이후 저장한 날짜</p></Link>{home.skill_enabled&&<Link href="/settings/band" className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">{leader?'멤버 실력 설정':'내 실력'}</p><p className="mt-1 text-lg font-bold">{leader?(home.unset_skills?home.unset_skills+'명 미설정':'설정 완료'):(home.my_skill===null?'미설정':home.my_skill+'/5')}</p><p className="mt-1 text-xs text-slate-600">{leader?'미설정 멤버가 있으면 곡 추천 점수를 보류합니다.':home.my_skill===null?'밴드장에게 설정을 요청하세요.':'밴드장이 설정한 실력입니다.'}</p></Link>}</div></Card>
 <Card><CardTitle>내 불참 일정</CardTitle>{home.upcoming_unavailable.length?<div className="mt-3 flex flex-wrap gap-2">{home.upcoming_unavailable.slice(0,7).map(day=><Link key={day} href="/schedule" className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{day}</Link>)}{home.upcoming_unavailable.length>7&&<Link href="/schedule" className="px-3 py-2 text-sm text-blue-700">외 {home.upcoming_unavailable.length-7}일</Link>}</div>:<p className="mt-3 text-sm">등록한 불참 일정이 없습니다.</p>}<Link className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-blue-700" href="/schedule">일정 추가·수정 →</Link></Card>
 </div>;
}
