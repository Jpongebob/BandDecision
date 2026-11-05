'use client';
import {twoMonthWindow} from '@/lib/calendar-window';
import {useActionState,useMemo,useState} from 'react';
import {saveLivePlanAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import type {LivePlanning,SavedPlan} from '@/lib/live-planning';
import {recommendDates,type SongRanking} from '@/services/recommendations';
import {CalendarPicker} from '@/components/date-calendar';
import {Button} from '@/components/ui/button';
export function ConfirmPlanForm({data,songs,today,plan}:{data:LivePlanning;songs:SongRanking[];today:string;plan?:SavedPlan}){
 const[date,setDate]=useState(plan?.rehearsal_date??''),[selected,setSelected]=useState<number[]>(plan?.confirmed_plan_songs.flatMap(s=>s.source_song_id===null?[]:[s.source_song_id])??[]),[partial,setPartial]=useState(false);
 const[state,save,pending]=useActionState(saveLivePlanAction,{} as FormState);
 const suggested=useMemo(()=>{
  const{endDate}=twoMonthWindow(today);
  return recommendDates({participants:data.members,unavailable:data.unavailable,submittedIds:data.members.map(m=>m.id),startDate:today,endDate,today}).slice(0,5);
 },[data.members,data.unavailable,today]);
 function chooseDate(value:string){setDate(value);setPartial(false);}
 const absent=data.members.filter(m=>data.unavailable.some(d=>d.memberId===m.id&&d.date===date)),attending=data.members.length-absent.length;
 const choices=[...songs.filter(s=>s.confirmedAt||s.status==='eligible').map(s=>({id:s.id,title:s.title,artist:s.artist,confirmed:Boolean(s.confirmedAt)})),...(plan?.confirmed_plan_songs.filter(s=>s.source_song_id!==null&&!songs.some(song=>song.id===s.source_song_id&&(song.confirmedAt||song.status==='eligible'))).map(s=>({id:s.source_song_id!,title:s.title_snapshot,artist:s.artist_snapshot,confirmed:false}))??[])];
 return <form action={save} className="space-y-4"><input type="hidden" name="band_id" value={data.band_id}/><input type="hidden" name="version" value={data.version}/><input type="hidden" name="plan_id" value={plan?.id??''}/><input type="hidden" name="plan_version" value={plan?.version??''}/><input type="hidden" name="ack_partial" value={partial?'true':'false'}/>
 <input type="hidden" name="date" value={date}/><div><p className="text-sm font-semibold">합주 날짜</p><CalendarPicker value={date} onChange={chooseDate} today={today} label="합주 가능한 날짜" annotation={day=>{const n=data.members.filter(m=>!data.unavailable.some(d=>d.memberId===m.id&&d.date===day)).length;return n+'/'+data.members.length+'명';}} disabled={day=>(day<today&&day!==plan?.rehearsal_date)||data.members.every(m=>data.unavailable.some(d=>d.memberId===m.id&&d.date===day))}/></div>
 <label className="block text-sm font-semibold">장소 (선택사항)<input name="location" defaultValue={plan?.location??''} maxLength={200} placeholder="합주실 이름 또는 주소" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"/></label>
 <fieldset className="min-w-0" aria-label="추천 날짜"><legend className="text-sm font-semibold">추천 날짜 <span className="font-normal text-slate-500">· 참석 인원순 상위 5개</span></legend>
 {suggested.length>0?<div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">{suggested.map(item=>{
  const weekday=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(item.date+'T12:00:00+09:00'));
  return <label key={item.date} className="relative min-w-0 cursor-pointer"><input className="peer sr-only" type="radio" name="recommended_date" value={item.date} checked={date===item.date} disabled={pending} onChange={()=>chooseDate(item.date)} aria-label={item.date+' '+weekday+'요일 · 참석 '+item.attendanceCount+'/'+data.members.length+'명'}/><span className="flex min-h-12 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-1 py-1 text-center peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-disabled:opacity-50"><span className="text-xs font-semibold">{item.date.slice(5).replace('-','/')} ({weekday})</span><span className="mt-0.5 text-[11px] text-slate-500">참석 {item.attendanceCount}/{data.members.length}명</span></span></label>;
 })}</div>:<p className="mt-2 text-sm text-slate-500">이번 달·다음 달 중 참석 가능한 추천 날짜가 없습니다. 다른 날짜를 직접 선택할 수 있습니다.</p>}</fieldset>
 {date&&<div className="rounded-xl bg-blue-50 p-3 text-sm"><p className="font-semibold">참석 가능 {attending}/{data.members.length}명 · 20:00–22:00</p>{absent.length>0&&<><p className="mt-2 text-amber-900">불참: {absent.map(m=>m.nickname).join(', ')}</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)}/><span>불참 멤버를 확인했고, 부분 참석으로 진행합니다.</span></label></>}</div>}
 <details open={Boolean(plan?.confirmed_plan_songs.length)}><summary className="cursor-pointer text-sm font-semibold">곡 선택 (선택사항){selected.length?' · '+selected.length+'곡':''}</summary><p className="mt-2 text-sm text-slate-500">곡 없이 날짜만 저장할 수 있습니다. 확정곡과 추천 조건을 충족한 곡을 선택할 수 있으며, 나중에 수정에서 추가할 수도 있습니다.</p><div className="mt-3 grid gap-2">{choices.map(s=><label key={s.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" name="song_id" value={s.id} checked={selected.includes(s.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,s.id]:current.filter(id=>id!==s.id))}/><span><b>{s.title}</b> · {s.artist}{s.confirmed&&<span className="ml-2 text-xs font-semibold text-emerald-700">확정곡</span>}</span></label>)}</div>{choices.length===0&&<p className="mt-3 text-sm text-slate-500">확정곡 또는 추천 조건을 갖춘 곡이 없습니다. 날짜만 먼저 정하세요.</p>}</details>
 {state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-700">{state.success}</p>}
 <Button className="w-full sm:w-auto" disabled={pending||!date||attending===0||absent.length>0&&!partial}>{pending?'저장 중…':plan?'계획 수정 저장':'합주 날짜 확정'}</Button></form>;
}
