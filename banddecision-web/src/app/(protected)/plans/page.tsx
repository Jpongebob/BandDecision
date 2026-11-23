import {MapPin,Plus,ChevronDown} from 'lucide-react';
import {splitPlans} from '@/lib/plan-dates';
import {createClient} from '@/lib/supabase/server';
import {loadVerifiedPlanningPage,liveRecommendations,seoulToday,type SavedPlan} from '@/lib/live-planning';
import {Card,CardTitle} from '@/components/ui/card';
import {ConfirmPlanForm,NewPlanForm} from '@/components/confirm-plan-form';
import {OpenSheetButton,Sheet} from '@/components/sheet';
import {PlanShareButton,PlanShareButtons,type SharePlan} from '@/components/plan-share';
import {PlanBoard,type BoardRow} from '@/components/plan-board';
import {averageDifficulty} from '@/lib/difficulty';
import {PlanAttendanceEditor} from '@/components/plan-attendance';
import {answeredMonths,monthOf} from '@/lib/availability-months';
import {AttendanceChip,DDay,SongChips} from '@/components/plan-bits';
import {PlanDeleteButton} from '@/components/plan-delete';
import {getBandContext} from '@/lib/band-context';
import {sortedNames} from '@/lib/calendar-export';
import {dayLabel,timeRangeLabel,weekdayShort} from '@/lib/day-format';
const outline='inline-flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-base font-semibold text-ink';
const deleteButton='inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-white px-3.5 text-base font-semibold text-danger';
const pcBase='inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border border-line-strong bg-white px-3 text-[13px] font-semibold ',pcButton=pcBase+'text-ink',pcDelete=pcBase+'text-danger';
export default async function PlansPage(){
 const db=await createClient();if(!db)return null;
 const page=await loadVerifiedPlanningPage(db,'full',true);
 if(!page)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
 const band=await getBandContext(db,page.user.id,page.user.bandContext),bandName=band.status==='ready'?band.band.name:null;
 const{data,member:me}=page,plans=page.plans??[],today=seoulToday(),songs=data?liveRecommendations(data,today).songs:[],leader=me.role==='leader';
 const{upcoming,past}=splitPlans(plans,today),takenDates=upcoming.map(p=>p.rehearsal_date);
 // 미응답 for a plan: no day saved in that plan's month.
 const answered=answeredMonths(data?.available??[]);
 const attendanceMembers=(date:string)=>data?.members.map(m=>({id:m.id,nickname:m.nickname,part:m.part,leader:m.id===me.id,noDates:!answered.get(m.id)?.has(monthOf(date))}))??[];
 const orderedSongs=(plan:SavedPlan)=>[...plan.confirmed_plan_songs].sort((a,b)=>a.display_order-b.display_order);
 const songTitles=(plan:SavedPlan)=>orderedSongs(plan).map(s=>s.title_snapshot),songArtists=(plan:SavedPlan)=>orderedSongs(plan).map(s=>s.artist_snapshot);
 const sharePlan=(plan:SavedPlan):SharePlan=>{const attendees=plan.confirmed_plan_members.filter(m=>m.attending),absentees=plan.confirmed_plan_members.filter(m=>!m.attending);return {id:plan.id,date:plan.rehearsal_date,start:plan.starts_at,end:plan.ends_at,location:plan.location,memo:plan.memo,songs:songTitles(plan),artists:songArtists(plan),attending:plan.attendee_count,total:plan.participant_count,band:bandName,attendees:sortedNames(attendees.map(m=>m.nickname_snapshot)),absentees:sortedNames(absentees.map(m=>m.nickname_snapshot))};};
 const partKeys=data?.members.map(m=>m.partKey)??[];
 const songLevel=(id:number|null)=>{if(!data?.skill_enabled||id===null)return null;const song=data.songs.find(x=>x.id===id);if(!song)return null;const avg=averageDifficulty(song.difficulties,partKeys);return avg===null?'난이도 미입력':'평균 난이도 '+avg.toFixed(1);};
 const editForm=(plan:SavedPlan)=>data&&<ConfirmPlanForm key={plan.id} data={data} songs={songs} today={today} plan={plan} takenDates={upcoming.filter(p=>p.id!==plan.id).map(p=>p.rehearsal_date)}/>;
 function planCard(plan:SavedPlan,first:boolean,archived=false){
  const titles=songTitles(plan),attendees=plan.confirmed_plan_members.filter(m=>m.attending),absentees=plan.confirmed_plan_members.filter(m=>!m.attending);
  return <Card key={plan.id} data-plan-id={archived?undefined:plan.id} data-archived-plan-id={archived?plan.id:undefined} className="flex flex-col gap-3.5 p-4">
  <div className="flex gap-3.5"><div aria-hidden="true" className={'flex w-16 shrink-0 flex-col items-center justify-center rounded-[14px] py-2 '+(first&&!archived?'bg-brand-tint text-brand-ink':'bg-surface-2 text-ink-2')}><span className="text-[13px] font-bold">{Number(plan.rehearsal_date.slice(5,7))}월</span><span className="text-[28px] font-extrabold leading-8">{Number(plan.rehearsal_date.slice(8))}</span><span className="text-[15px] font-bold">{weekdayShort(plan.rehearsal_date)}</span></div>
   <div className="flex min-w-0 flex-col gap-1.5"><h3 className="sr-only">{dayLabel(plan.rehearsal_date)}</h3><span className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-bold">{timeRangeLabel(plan.starts_at,plan.ends_at)}</span>{!archived&&<DDay day={plan.rehearsal_date} today={today} large/>}</span><span className="flex min-w-0 items-center gap-1.5 text-base text-ink-2"><MapPin size={18} aria-hidden="true" className="shrink-0 text-muted"/><span className="min-w-0 break-words">{plan.location||'장소 미정'}</span></span><AttendanceChip attending={plan.attendee_count} total={plan.participant_count}/></div></div>
  {titles.length?<SongChips titles={titles} max={titles.length}/>:<div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2"><span className="text-[15px] text-muted">곡 미정 · 날짜만 확정</span>{leader&&data&&!archived&&<OpenSheetButton target={'edit-'+plan.id} className="min-h-11 shrink-0 px-1 text-[15px] font-bold text-brand-ink" label={dayLabel(plan.rehearsal_date)+' 합주에 곡 추가'}>곡 추가</OpenSheetButton>}</div>}
  {plan.memo&&<p className="whitespace-pre-wrap break-words rounded-xl bg-note-bg px-3.5 py-3 text-base leading-[22px] text-ink-2"><b className="font-bold text-warn-ink">메모</b> · {plan.memo}</p>}
  {archived?<p className="text-[13px] text-muted">지난 합주 기록이에요. 당시 참석자와 곡을 보관해요.</p>:<PlanShareButtons plan={sharePlan(plan)}/>}
  <div className="flex gap-2">
   {leader&&data&&!archived?<OpenSheetButton target={'attend-'+plan.id} className={outline}>참석자 명단</OpenSheetButton>:<Sheet title="참석자 명단" trigger="참석자 명단" triggerClassName={outline}><><p className="mb-3 text-[15px] text-muted">{dayLabel(plan.rehearsal_date)} · {plan.attendee_count}/{plan.participant_count}명 참석</p><ul className="flex flex-col">{[...attendees,...absentees].map(m=><li key={m.id} className="flex items-center gap-2.5 border-t border-line py-2.5"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[15px] font-bold text-ink-2">{[...m.nickname_snapshot][0]}</span><span className="grow"><b className="text-base font-bold">{m.nickname_snapshot}</b> <span className="text-sm text-muted">{m.part_snapshot}</span></span><span className={'whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold '+(m.attending?'bg-plan-bg text-plan-ink':'bg-surface-2 text-ink-2')}>{m.attending?'참석':'불참'}</span></li>)}</ul>{!archived&&<p className="mt-3 text-sm text-muted">못 오게 되면 밴드장에게 알려 주세요. 밴드장이 참석자를 바꿔요.</p>}</></Sheet>}
   {leader&&data&&!archived&&<OpenSheetButton target={'edit-'+plan.id} className={outline}>수정</OpenSheetButton>}
   {leader&&<OpenSheetButton target={'delete-'+plan.id} className={deleteButton} label={dayLabel(plan.rehearsal_date)+' 합주 삭제'}>삭제</OpenSheetButton>}
  </div>
 </Card>;}
 function planDetail(plan:SavedPlan,archived=false){
  const ordered=orderedSongs(plan),attendees=plan.confirmed_plan_members.filter(m=>m.attending),absentees=plan.confirmed_plan_members.filter(m=>!m.attending);
  return <div key={plan.id} data-plan-detail data-plan-id={archived?undefined:plan.id} data-archived-plan-id={archived?plan.id:undefined} className="flex flex-col">
   <div className="relative flex flex-wrap items-start gap-2 border-b border-line px-6 pb-4 pt-5"><div className="min-w-0 grow basis-full xl:basis-0"><h2 className="flex flex-wrap items-center gap-2.5 text-[26px] font-extrabold tracking-tight">{dayLabel(plan.rehearsal_date)}{!archived&&<DDay day={plan.rehearsal_date} today={today} large/>}</h2><p className="mt-1 flex flex-wrap items-center gap-1.5 text-[15px] text-ink-2">{timeRangeLabel(plan.starts_at,plan.ends_at)}<span aria-hidden="true" className="text-line-strong">|</span><MapPin size={16} aria-hidden="true" className="text-faint"/>{plan.location||'장소 미정'}</p></div>
    {!archived&&<PlanShareButton plan={sharePlan(plan)} className={pcButton}/>}
    {leader&&data&&!archived&&<OpenSheetButton target={'edit-'+plan.id} className={pcButton}>수정</OpenSheetButton>}
    {leader&&<OpenSheetButton target={'delete-'+plan.id} className={pcDelete} label={dayLabel(plan.rehearsal_date)+' 합주 삭제'}>삭제</OpenSheetButton>}</div>
   <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_236px]">
    <div className="flex min-w-0 flex-col gap-4 border-b border-line px-6 py-5 xl:border-b-0 xl:border-r">
     <div><h3 className="text-xs font-bold text-muted">셋리스트 · {ordered.length?ordered.length+'곡':'곡 미정'}</h3>
      {ordered.length?<ol className="mt-1.5">{ordered.map((song,i)=>{const level=songLevel(song.source_song_id);return <li key={song.id} className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-baseline gap-x-1 border-b border-dashed border-line-strong py-3"><span aria-hidden="true" className="text-2xl font-light tabular-nums tracking-tight text-faint">{String(i+1).padStart(2,'0')}</span><span className="min-w-0 break-words"><b className="text-lg font-bold tracking-tight">{song.title_snapshot}</b> <span className="text-[13px] text-muted">{song.artist_snapshot}</span></span>{level&&<span className="whitespace-nowrap text-xs font-semibold text-muted">{level}</span>}</li>;})}</ol>
      :<div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2.5"><span className="text-sm text-muted">날짜만 확정했어요</span>{leader&&data&&!archived&&<OpenSheetButton target={'edit-'+plan.id} className="min-h-9 px-1 text-sm font-bold text-brand-ink" label={dayLabel(plan.rehearsal_date)+' 합주에 곡 추가'}>곡 추가</OpenSheetButton>}</div>}</div>
     {plan.memo&&<p className="whitespace-pre-wrap break-words rounded-xl bg-note-bg px-3.5 py-3 text-sm leading-[22px] text-ink-2"><b className="font-bold text-warn-ink">메모</b> · {plan.memo}</p>}
     {archived&&<p className="text-[13px] text-muted">지난 합주 기록이에요. 당시 참석자와 곡을 보관해요.</p>}
    </div>
    <div className="flex flex-col gap-2.5 px-5 py-5"><h3 className="text-xs font-bold text-muted">참석 {attendees.length}명 · 불참 {absentees.length}명</h3>
     <ul className="flex flex-col">{[...attendees,...absentees].map(m=><li key={m.id} className={'flex h-[34px] items-center gap-2 text-sm font-semibold '+(m.attending?'':'text-faint')}><span aria-hidden="true" className={'grid size-[26px] shrink-0 place-items-center rounded-full text-xs font-bold '+(m.attending?'bg-plan-bg text-plan-ink':'border border-dashed border-line-strong text-faint')}>{[...m.nickname_snapshot][0]}</span><span className="min-w-0 truncate">{m.nickname_snapshot}</span><span className="ml-auto text-xs font-medium text-muted">{m.attending?m.part_snapshot:'불참'}</span></li>)}</ul>
     {leader&&data&&!archived?<OpenSheetButton target={'attend-'+plan.id} className="mt-1 self-start text-[13px] font-bold text-brand-ink">참석자 명단 바꾸기 ›</OpenSheetButton>:!archived&&<p className="mt-1 text-xs text-muted">못 오게 되면 밴드장에게 알려 주세요.</p>}</div>
   </div>
  </div>;}
 const row=(plan:SavedPlan,archived=false):BoardRow=>{const n=plan.confirmed_plan_songs.length;return {id:plan.id,label:dayLabel(plan.rehearsal_date)+' 합주',month:Number(plan.rehearsal_date.slice(5,7)),day:Number(plan.rehearsal_date.slice(8)),weekday:weekdayShort(plan.rehearsal_date),time:timeRangeLabel(plan.starts_at,plan.ends_at),sub:(plan.location||'장소 미정')+' · '+(n?n+'곡':'곡 미정'),tags:<>{archived?<span className="rounded-md bg-seg px-2 py-0.5 text-xs font-bold text-ink-2">기록</span>:<DDay day={plan.rehearsal_date} today={today}/>}<span className="whitespace-nowrap rounded-md bg-plan-bg px-2 py-0.5 text-xs font-bold text-plan-ink">{plan.attendee_count}/{plan.participant_count}명</span></>};};
 return <div className="relative mx-auto flex max-w-xl flex-col gap-3 lg:max-w-none lg:gap-4">
 <div className="flex items-center justify-between gap-3 px-1 lg:justify-start lg:pr-56"><h1 className="text-2xl font-extrabold leading-8">합주 계획</h1><span className="whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-[15px] font-semibold text-ink-2">예정 {upcoming.length}/5</span></div>
 {leader&&data&&(upcoming.length<5?<Sheet title="새 합주 정하기" trigger={<><Plus size={20} strokeWidth={2.4} aria-hidden="true"/>새 합주 정하기</>} triggerClassName="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[17px] font-bold text-white hover:bg-brand-ink lg:absolute lg:right-0 lg:top-0 lg:min-h-10 lg:rounded-[10px] lg:px-4 lg:text-[15px]" wide>{data.available.length===0&&<p className="mb-3 text-[15px] text-warn-ink">아직 멤버들이 저장한 가능한 날이 없어요. 일정에서 먼저 저장해야 해요.</p>}<NewPlanForm data={data} songs={songs} today={today} takenDates={takenDates}/></Sheet>
  :<p className="rounded-2xl bg-surface-2 px-4 py-3 text-[15px] text-ink-2">예정된 계획이 5개예요. 예정 계획을 수정하거나 삭제한 뒤 추가하세요.</p>)}
 <div className="flex flex-col gap-3 lg:hidden">
 <h2 className="mt-1 px-1 text-[17px] font-bold">예정된 합주</h2>
 {upcoming.length===0&&<Card><p className="text-base text-ink-2">{leader?'아직 정해진 합주가 없어요. \'새 합주 정하기\'로 날짜를 정해 보세요.':'아직 정해진 합주가 없어요. 밴드장이 정하면 여기에 보여요.'}</p></Card>}
 {upcoming.map((plan,i)=>planCard(plan,i===0))}
 {past.length>0&&<details className="group rounded-[20px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between px-4 py-3"><span className="flex flex-col"><span className="text-base font-bold">지난 합주 {past.length}개</span><span className="text-[15px] text-muted">당시 참석자·곡 기록 보기</span></span><ChevronDown size={20} aria-hidden="true" className="text-muted transition-transform group-open:rotate-180"/></summary><div className="flex flex-col gap-3 px-3 pb-3">{past.map(plan=>planCard(plan,false,true))}</div></details>}
 </div>
 <PlanBoard rows={upcoming.map(p=>row(p))} details={upcoming.map(p=>planDetail(p))} pastRows={past.map(p=>row(p,true))} pastDetails={past.map(p=>planDetail(p,true))} empty={<p className="px-6 py-10 text-base text-ink-2">{leader?'아직 정해진 합주가 없어요. \'새 합주 정하기\'로 날짜를 정해 보세요.':'아직 정해진 합주가 없어요. 밴드장이 정하면 여기에 보여요.'}</p>}/>
 {/* Popups shared by the phone cards and the PC detail: outside both so either layout can open them. */}
 {leader&&data&&upcoming.map(plan=><div key={plan.id}><Sheet id={'attend-'+plan.id} title="참석자 명단"><PlanAttendanceEditor plan={{id:plan.id,version:plan.version,date:plan.rehearsal_date,start:plan.starts_at,end:plan.ends_at}} members={attendanceMembers(plan.rehearsal_date)} attending={plan.confirmed_plan_members.filter(m=>m.attending&&m.source_member_id).map(m=>m.source_member_id!)}/></Sheet><Sheet id={'edit-'+plan.id} title="합주 계획 수정" wide>{editForm(plan)}</Sheet></div>)}
 {leader&&[...upcoming,...past].map(plan=><PlanDeleteButton key={plan.id} id={'delete-'+plan.id} withTrigger={false} planId={plan.id} version={plan.version} what={past.includes(plan)?'합주 기록':'합주 계획'} when={dayLabel(plan.rehearsal_date)+' · '+timeRangeLabel(plan.starts_at,plan.ends_at)}/>)}
 </div>;
}
