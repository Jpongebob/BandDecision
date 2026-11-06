import {PlanMemo} from '@/components/plan-memo';
import {splitPlans} from '@/lib/plan-dates';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,liveRecommendations,seoulToday,type SavedPlan} from '@/lib/live-planning';
import {Card,CardTitle} from '@/components/ui/card';
import {ConfirmPlanForm} from '@/components/confirm-plan-form';
import {ActionForm} from '@/components/action-form';
import {deleteLivePlanAction} from '@/app/live-actions';
export default async function PlansPage(){
 const db=await createClient();if(!db)return null;
 const page=await loadVerifiedPlanningPage(db,'full',true);
 if(!page)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const{data,member:me}=page,plans=page.plans??[],today=seoulToday(),{songs}=liveRecommendations(data,today),leader=me.role==='leader';
 const{upcoming,past}=splitPlans(plans,today);
 function planCard(plan:SavedPlan,archived=false){return <Card key={plan.id} data-plan-id={archived?undefined:plan.id} data-archived-plan-id={archived?plan.id:undefined} className="border-blue-200"><CardTitle className="text-xl">{plan.rehearsal_date} · {plan.starts_at.slice(0,5)}–{plan.ends_at.slice(0,5)}</CardTitle>{plan.location&&<p className="mt-2 break-words text-sm font-semibold">장소: {plan.location}</p>}<p className="mt-2 text-sm text-slate-600">참석 {plan.attendee_count}/{plan.participant_count}명</p><p className="mt-2 text-sm">{plan.confirmed_plan_songs.length?[...plan.confirmed_plan_songs].sort((a,b)=>a.display_order-b.display_order).map(s=>s.title_snapshot).join(' · '):'곡 미정 · 날짜만 확정'}</p>
 <PlanMemo memo={plan.memo}/>
 <details className="mt-3"><summary className="cursor-pointer text-sm text-blue-700">참석자 보기</summary><ul className="mt-2 space-y-1 text-sm">{plan.confirmed_plan_members.map(m=><li key={m.id}>{m.nickname_snapshot} · {m.part_snapshot} · {m.attending?'참석':'불참'}</li>)}</ul></details>
 {archived&&<p className="mt-3 text-xs text-slate-500">지난 합주 기록입니다. 당시 확정한 참석자와 곡을 보관합니다.</p>}
 {leader&&<>{!archived&&<details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">계획 수정</summary><p className="my-3 text-sm text-slate-500">날짜·장소·곡·메모를 바꿀 수 있습니다. 저장하면 현재 멤버와 일정으로 참석자를 다시 반영합니다.</p><ConfirmPlanForm key={plan.id+':'+plan.version+':'+data.version} data={data} songs={songs} today={today} plan={plan}/></details>}<details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-rose-700">계획 삭제</summary><ActionForm action={deleteLivePlanAction} submit="계획 삭제" className="mt-3"><input type="hidden" name="plan_id" value={plan.id}/><input type="hidden" name="plan_version" value={plan.version}/><label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_delete" value="yes" required/><span>이 계획을 삭제합니다.</span></label></ActionForm></details></>}
 </Card>;}
 return <div className="space-y-5"><div><h1 className="text-3xl font-black">합주 계획</h1><p className="mt-2 text-sm text-slate-500">날짜만 먼저 정하고 곡은 나중에 추가하세요. 예정된 계획 {upcoming.length}/5개</p></div>
 {leader&&<Card><CardTitle>합주 날짜 정하기</CardTitle>{upcoming.length<5?<div className="mt-4"><ConfirmPlanForm key={data.version} data={data} songs={songs} today={today}/></div>:<p className="mt-3 text-sm">예정된 계획이 5개입니다. 기존 예정 계획을 수정하거나 삭제한 뒤 추가하세요.</p>}</Card>}
 {upcoming.length===0&&<Card><CardTitle>아직 정해진 합주가 없습니다</CardTitle><p className="mt-2 text-sm">{leader?'위에서 날짜를 골라 바로 확정하세요.':'밴드장이 합주 날짜를 정하면 여기에 표시됩니다.'}</p></Card>}
 {upcoming.map(plan=>planCard(plan))}
 {past.length>0&&<details className="rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">지난 합주 · {past.length}개</summary><p className="my-3 text-sm text-slate-500">한국 날짜 기준으로 지난 계획은 자동 보관됩니다. 예정된 계획 5개 제한에는 포함되지 않습니다.</p><div className="space-y-3">{past.map(plan=>planCard(plan,true))}</div></details>}
 </div>;
}
