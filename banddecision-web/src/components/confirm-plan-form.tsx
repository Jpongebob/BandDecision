'use client';
import {useActionState,useState} from 'react';
import {saveLivePlanAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import type {LivePlanning,SavedPlan} from '@/lib/live-planning';
import type {SongRanking} from '@/services/recommendations';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export function ConfirmPlanForm({data,songs,today,plan}:{data:LivePlanning;songs:SongRanking[];today:string;plan?:SavedPlan}){
 const[date,setDate]=useState(plan?.rehearsal_date??''),[selected,setSelected]=useState<number[]>(plan?.confirmed_plan_songs.flatMap(s=>s.source_song_id===null?[]:[s.source_song_id])??[]),[partial,setPartial]=useState(false);
 const[state,save,pending]=useActionState(saveLivePlanAction,{} as FormState);
 const absent=data.members.filter(m=>data.unavailable.some(d=>d.memberId===m.id&&d.date===date)),attending=data.members.length-absent.length;
 const choices=[...songs.filter(s=>s.status==='eligible').map(s=>({id:s.id,title:s.title,artist:s.artist})),...(plan?.confirmed_plan_songs.filter(s=>s.source_song_id!==null&&!songs.some(song=>song.id===s.source_song_id&&song.status==='eligible')).map(s=>({id:s.source_song_id!,title:s.title_snapshot,artist:s.artist_snapshot}))??[])];
 return <form action={save} className="space-y-4"><input type="hidden" name="band_id" value={data.band_id}/><input type="hidden" name="version" value={data.version}/><input type="hidden" name="plan_id" value={plan?.id??''}/><input type="hidden" name="plan_version" value={plan?.version??''}/><input type="hidden" name="ack_partial" value={partial?'true':'false'}/>
 <label className="block text-sm font-semibold">합주 날짜<Input type="date" name="date" value={date} min={plan&&plan.rehearsal_date<today?plan.rehearsal_date:today} onChange={e=>{setDate(e.target.value);setPartial(false);}} required/></label>
 {date&&<div className="rounded-xl bg-blue-50 p-3 text-sm"><p className="font-semibold">참석 가능 {attending}/{data.members.length}명 · 20:00–22:00</p>{absent.length>0&&<><p className="mt-2 text-amber-900">불참: {absent.map(m=>m.nickname).join(', ')}</p><label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={partial} onChange={e=>setPartial(e.target.checked)}/><span>불참 멤버를 확인했고, 부분 참석으로 진행합니다.</span></label></>}</div>}
 <details open={Boolean(plan?.confirmed_plan_songs.length)}><summary className="cursor-pointer text-sm font-semibold">곡 선택 (선택사항){selected.length?' · '+selected.length+'곡':''}</summary><p className="mt-2 text-sm text-slate-500">곡 없이 날짜만 저장할 수 있습니다. 곡은 나중에 수정에서 추가하세요.</p><div className="mt-3 grid gap-2">{choices.map(s=><label key={s.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" name="song_id" value={s.id} checked={selected.includes(s.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,s.id]:current.filter(id=>id!==s.id))}/><span><b>{s.title}</b> · {s.artist}</span></label>)}</div>{choices.length===0&&<p className="mt-3 text-sm text-slate-500">아직 추천 조건을 갖춘 곡이 없습니다. 날짜만 먼저 정하세요.</p>}</details>
 {state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-emerald-700">{state.success}</p>}
 <Button className="w-full sm:w-auto" disabled={pending||!date||attending===0||absent.length>0&&!partial}>{pending?'저장 중…':plan?'계획 수정 저장':'합주 날짜 확정'}</Button></form>;
}
