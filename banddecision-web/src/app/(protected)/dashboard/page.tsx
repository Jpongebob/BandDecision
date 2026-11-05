import Link from 'next/link';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getBandContext} from '@/lib/band-context';
import {loadMemberCount,loadPlanSummaries} from '@/lib/live-planning';
import {BandLoadError} from '@/components/band-load-error';
import {Card,CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
export default async function Dashboard(){
 const db=await createClient();if(!db)return null;const user=await getCurrentUser(db);if(!user)return null;
 const context=await getBandContext(db,user.id,user.bandContext);if(context.status==='error')return <BandLoadError code={context.code}/>;
 if(context.status!=='ready')return <Card><CardTitle>우리 밴드로 시작하세요</CardTitle><Link href="/bands/new"><Button className="mt-4">밴드 만들기</Button></Link></Card>;
 const[memberCount,plans]=await Promise.all([loadMemberCount(db,context.band.id),loadPlanSummaries(db,context.band.id)]);
 return <div className="space-y-5"><div><p className="text-sm font-semibold text-blue-700">반가워요, {user.nickname}</p><h1 className="mt-1 text-3xl font-black">{context.band.name}</h1><p className="mt-2 text-sm text-slate-500">멤버 {memberCount}명 · 합주 계획 {plans.length}/5개</p><Badge>{context.member.role==='leader'?'밴드장':'멤버'}</Badge></div><div className="grid gap-3 sm:grid-cols-3">{[['/schedule','내 일정','불가능한 날짜 추가·수정'],['/songs','합주곡','후보곡과 내 투표'],['/plans','합주 계획','날짜 확정·곡 추가']].map(([href,title,description])=><Link href={href} key={href}><Card><CardTitle>{title}</CardTitle><p className="mt-2 text-sm text-slate-500">{description}</p></Card></Link>)}</div>
 {plans.length?plans.map(plan=><Card key={plan.id} className="border-blue-200 bg-blue-50/60"><Badge>확정된 합주</Badge><CardTitle className="mt-3">{plan.rehearsal_date} · {plan.starts_at.slice(0,5)}–{plan.ends_at.slice(0,5)}</CardTitle><p className="mt-2 text-sm">참석 {plan.attendee_count}/{plan.participant_count}명 · {plan.confirmed_plan_songs.length?plan.confirmed_plan_songs.map(s=>s.title_snapshot).join(' · '):'곡 미정'}</p><Link className="mt-3 inline-block text-sm font-semibold text-blue-700" href="/plans">계획 자세히 →</Link></Card>):<Card><CardTitle>정해진 합주가 없습니다</CardTitle><p className="mt-2 text-sm">곡을 고르기 전에도 날짜부터 정할 수 있습니다.</p><Link href="/plans"><Button className="mt-4">합주 계획 보기</Button></Link></Card>}</div>;
}
