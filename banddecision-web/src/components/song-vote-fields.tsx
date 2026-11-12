'use client';
import {useActionState,useState} from 'react';
import {Check,X} from 'lucide-react';
import {liveVoteAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';

const base='inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl text-base font-bold transition-colors disabled:opacity-60 ';
// 찬성·반대 모두 한 번 누르면 저장된다. 반대로 저장된 뒤에만 사유 칸(선택)이 열린다.
export function SongVoteFields({songId,choice,reason='',compact=false}:{songId:number;choice?:'yes'|'no';reason?:string|null;compact?:boolean}){
 // The pressed button shows right away; fresh server props win once they arrive (without losing the note).
 const[picked,setPicked]=useState(choice),[seen,setSeen]=useState(choice);
 if(seen!==choice){setSeen(choice);setPicked(choice);}
 const[state,vote,pending]=useActionState(liveVoteAction,{} as FormState);
 // A failed request must not look like a saved vote. Keep the server value on error.
 const displayed=state.error&&!pending?choice:picked;
 const yesOn=displayed==='yes',noOn=displayed==='no';
 return <form action={vote} onReset={event=>event.preventDefault()} className="flex flex-col gap-2.5" data-vote-editor>
  <input type="hidden" name="song_id" value={songId}/>
  <div role="group" aria-label="찬반 선택" className="grid grid-cols-2 gap-2">
   <button type="submit" name="choice" value="yes" disabled={pending} aria-pressed={yesOn} onClick={()=>setPicked('yes')} className={base+(yesOn?'border-2 border-[#2e9e63] bg-plan-bg text-plan-ink':'border border-line-strong bg-white text-ink-2')}><Check size={18} strokeWidth={2.6} aria-hidden="true"/>찬성</button>
   <button type="submit" name="choice" value="no" disabled={pending} aria-pressed={noOn} onClick={()=>setPicked('no')} className={base+(noOn?'border-2 border-muted bg-surface-2 text-ink':'border border-line-strong bg-white text-ink-2')}><X size={18} strokeWidth={2.6} aria-hidden="true"/>반대</button>
  </div>
  {!compact&&choice==='no'&&<div className="flex flex-col gap-2"><label className="flex flex-col gap-1.5 text-[15px] font-semibold text-ink-2"><span>반대 사유 <span className="font-medium text-muted">(선택)</span></span><textarea key={reason??''} name="reason" defaultValue={reason??''} maxLength={300} rows={2} placeholder="예: 키가 너무 높아요" className="min-h-16 w-full resize-none rounded-xl border border-line-strong px-3 py-2.5 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint"/></label><button type="submit" name="choice" value="no" disabled={pending} className="min-h-11 self-end rounded-xl border border-line-strong bg-white px-4 text-[15px] font-bold text-ink">사유 저장</button></div>}
  {state.error&&<p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}
  {state.success&&!pending&&<p role="status" className="text-sm font-semibold text-plan-ink">{state.success}</p>}
  {!compact&&choice!=='no'&&!state.success&&<p className="text-sm text-muted">누르면 바로 저장돼요. 언제든 바꿀 수 있어요.</p>}
 </form>;
}
