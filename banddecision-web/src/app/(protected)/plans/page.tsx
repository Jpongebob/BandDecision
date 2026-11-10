import {MapPin,Plus,ChevronDown} from 'lucide-react';
import {splitPlans} from '@/lib/plan-dates';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,liveRecommendations,seoulToday,type SavedPlan} from '@/lib/live-planning';
import {Card,CardTitle} from '@/components/ui/card';
import {ConfirmPlanForm} from '@/components/confirm-plan-form';
import {OpenSheetButton,Sheet} from '@/components/sheet';
import {PlanShareButtons} from '@/components/plan-share';
import {PlanAttendanceEditor} from '@/components/plan-attendance';
import {twoMonthWindow} from '@/lib/calendar-window';
import {AttendanceChip,DDay,SongChips} from '@/components/plan-bits';
import {PlanDeleteButton} from '@/components/plan-delete';
import {getBandContext} from '@/lib/band-context';
import {sortedNames} from '@/lib/calendar-export';
import {dayLabel,timeRangeLabel,weekdayShort} from '@/lib/day-format';
const outline='inline-flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-base font-semibold text-ink';
const deleteButton='inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-white px-3.5 text-base font-semibold text-danger';
export default async function PlansPage(){
 const db=await createClient();if(!db)return null;
 const page=await loadVerifiedPlanningPage(db,'full',true);
 if(!page)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const band=await getBandContext(db,page.user.id,page.user.bandContext),bandName=band.status==='ready'?band.band.name:null;
 const{data,member:me}=page,plans=page.plans??[],today=seoulToday(),songs=data?liveRecommendations(data,today).songs:[],leader=me.role==='leader';
 const{upcoming,past}=splitPlans(plans,today),takenDates=upcoming.map(p=>p.rehearsal_date);
 const{endDate}=twoMonthWindow(today),responded=new Set(data?.available.filter(r=>r.date>=today&&r.date<=endDate).map(r=>r.memberId));
 const attendanceMembers=data?.members.map(m=>({id:m.id,nickname:m.nickname,part:m.part,leader:m.id===me.id,noDates:!responded.has(m.id)}))??[];
 const orderedSongs=(plan:SavedPlan)=>[...plan.confirmed_plan_songs].sort((a,b)=>a.display_order-b.display_order);
 const songTitles=(plan:SavedPlan)=>orderedSongs(plan).map(s=>s.title_snapshot),songArtists=(plan:SavedPlan)=>orderedSongs(plan).map(s=>s.artist_snapshot);
 const editForm=(plan:SavedPlan)=>data&&<ConfirmPlanForm key={plan.id} data={data} songs={songs} today={today} plan={plan} takenDates={takenDates}/>;
 function planCard(plan:SavedPlan,first:boolean,archived=false){
  const titles=songTitles(plan),attendees=plan.confirmed_plan_members.filter(m=>m.attending),absentees=plan.confirmed_plan_members.filter(m=>!m.attending);
  return <Card key={plan.id} data-plan-id={archived?undefined:plan.id} data-archived-plan-id={archived?plan.id:undefined} className="flex flex-col gap-3.5 p-4">
  <div className="flex gap-3.5"><div aria-hidden="true" className={'flex w-16 shrink-0 flex-col items-center justify-center rounded-[14px] py-2 '+(first&&!archived?'bg-brand-tint text-brand-ink':'bg-surface-2 text-ink-2')}><span className="text-[13px] font-bold">{Number(plan.rehearsal_date.slice(5,7))}월</span><span className="text-[28px] font-extrabold leading-8">{Number(plan.rehearsal_date.slice(8))}</span><span className="text-[15px] font-bold">{weekdayShort(plan.rehearsal_date)}</span></div>
   <div className="flex min-w-0 flex-col gap-1.5"><h3 className="sr-only">{dayLabel(plan.rehearsal_date)}</h3><span className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-bold">{timeRangeLabel(plan.starts_at,plan.ends_at)}</span>{!archived&&<DDay day={plan.rehearsal_date} today={today} large/>}</span><span className="flex min-w-0 items-center gap-1.5 text-base text-ink-2"><MapPin size={18} aria-hidden="true" className="shrink-0 text-muted"/><span className="min-w-0 break-words">{plan.location||'장소 미정'}</span></span><AttendanceChip attending={plan.attendee_count} total={plan.participant_count}/></div></div>
  {titles.length?<SongChips titles={titles}/>:<div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2"><span className="text-[15px] text-muted">곡 미정 · 날짜만 확정</span>{leader&&data&&!archived&&<OpenSheetButton target={'edit-'+plan.id} className="min-h-11 shrink-0 px-1 text-[15px] font-bold text-brand-ink" label={dayLabel(plan.rehearsal_date)+' 합주에 곡 추가'}>곡 추가</OpenSheetButton>}</div>}
  {plan.memo&&<p className="whitespace-pre-wrap break-words rounded-xl bg-note-bg px-3.5 py-3 text-base leading-[22px] text-ink-2"><b className="font-bold text-warn-ink">메모</b> · {plan.memo}</p>}
  {archived?<p className="text-[13px] text-muted">지난 합주 기록이에요. 당시 참석자와 곡을 보관해요.</p>:<PlanShareButtons plan={{id:plan.id,date:plan.rehearsal_date,start:plan.starts_at,end:plan.ends_at,location:plan.location,memo:plan.memo,songs:titles,artists:songArtists(plan),attending:plan.attendee_count,total:plan.participant_count,band:bandName,attendees:sortedNames(attendees.map(m=>m.nickname_snapshot)),absentees:sortedNames(absentees.map(m=>m.nickname_snapshot))}}/>}
  <div className="flex gap-2">
   <Sheet title="참석자 명단" trigger="참석자 명단" triggerClassName={outline}>{leader&&data&&!archived?<PlanAttendanceEditor plan={{id:plan.id,version:plan.version,date:plan.rehearsal_date,start:plan.starts_at,end:plan.ends_at}} members={attendanceMembers} attending={plan.confirmed_plan_members.filter(m=>m.attending&&m.source_member_id).map(m=>m.source_member_id!)}/>:<><p className="mb-3 text-[15px] text-muted">{dayLabel(plan.rehearsal_date)} · {plan.attendee_count}/{plan.participant_count}명 참석</p><ul className="flex flex-col">{[...attendees,...absentees].map(m=><li key={m.id} className="flex items-center gap-2.5 border-t border-line py-2.5"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[15px] font-bold text-ink-2">{[...m.nickname_snapshot][0]}</span><span className="grow"><b className="text-base font-bold">{m.nickname_snapshot}</b> <span className="text-sm text-muted">{m.part_snapshot}</span></span><span className={'whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold '+(m.attending?'bg-plan-bg text-plan-ink':'bg-surface-2 text-ink-2')}>{m.attending?'참석':'불참'}</span></li>)}</ul>{!archived&&<p className="mt-3 text-sm text-muted">못 오게 되면 밴드장에게 알려 주세요. 밴드장이 참석자를 바꿔요.</p>}</>}</Sheet>
   {leader&&data&&!archived&&<Sheet id={'edit-'+plan.id} title="합주 계획 수정" trigger="수정" triggerClassName={outline} wide>{editForm(plan)}</Sheet>}
   {leader&&<PlanDeleteButton planId={plan.id} version={plan.version} what={archived?'합주 기록':'합주 계획'} when={dayLabel(plan.rehearsal_date)+' · '+timeRangeLabel(plan.starts_at,plan.ends_at)} triggerLabel={dayLabel(plan.rehearsal_date)+' 합주 삭제'} triggerClassName={deleteButton}/>}
  </div>
 </Card>;}
 return <div className="mx-auto flex max-w-xl flex-col gap-3">
 <div className="flex items-center justify-between gap-3 px-1"><h1 className="text-2xl font-extrabold leading-8">합주 계획</h1><span className="whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-[15px] font-semibold text-ink-2">예정 {upcoming.length}/5</span></div>
 {leader&&data&&(upcoming.length<5?<Sheet title="새 합주 정하기" trigger={<><Plus size={20} strokeWidth={2.4} aria-hidden="true"/>새 합주 정하기</>} triggerClassName="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[17px] font-bold text-white" wide>{data.available.length===0&&<p className="mb-3 text-[15px] text-warn-ink">아직 멤버들이 저장한 가능한 날이 없어요. 일정에서 먼저 저장해야 해요.</p>}<ConfirmPlanForm key="new" data={data} songs={songs} today={today} takenDates={takenDates}/></Sheet>
  :<p className="rounded-2xl bg-surface-2 px-4 py-3 text-[15px] text-ink-2">예정된 계획이 5개예요. 예정 계획을 수정하거나 삭제한 뒤 추가하세요.</p>)}
 <h2 className="mt-1 px-1 text-[17px] font-bold">예정된 합주</h2>
 {upcoming.length===0&&<Card><p className="text-base text-ink-2">{leader?'아직 정해진 합주가 없어요. \'새 합주 정하기\'로 날짜를 정해 보세요.':'아직 정해진 합주가 없어요. 밴드장이 정하면 여기에 보여요.'}</p></Card>}
 {upcoming.map((plan,i)=>planCard(plan,i===0))}
 {past.length>0&&<details className="group rounded-[20px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between px-4 py-3"><span className="flex flex-col"><span className="text-base font-bold">지난 합주 {past.length}개</span><span className="text-[15px] text-muted">당시 참석자·곡 기록 보기</span></span><ChevronDown size={20} aria-hidden="true" className="text-muted transition-transform group-open:rotate-180"/></summary><div className="flex flex-col gap-3 px-3 pb-3">{past.map(plan=>planCard(plan,false,true))}</div></details>}
 </div>;
}
