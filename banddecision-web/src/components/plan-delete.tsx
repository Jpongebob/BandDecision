'use client';
import {useActionState,useId,useRef} from 'react';
import type {FormState} from '@/app/actions';
import {deleteLivePlanAction} from '@/app/live-actions';
import {Button} from '@/components/ui/button';
// Leader only: a small 삭제 button on the card, then one confirmation popup (same pattern as 곡 삭제).
export function PlanDeleteButton({planId,version,what,when,triggerLabel,triggerClassName}:{planId:string;version:number;what:string;when:string;triggerLabel:string;triggerClassName:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId();
 const[state,remove,pending]=useActionState(deleteLivePlanAction,{} as FormState);
 return <><button type="button" aria-haspopup="dialog" aria-label={triggerLabel} onClick={()=>dialog.current?.showModal()} className={triggerClassName}>삭제</button>
 <dialog ref={dialog} aria-labelledby={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="sheet">
 <div className="flex flex-col gap-2.5 px-5 pb-6 pt-2.5"><div aria-hidden="true" className="mx-auto mb-1 h-[5px] w-10 rounded-full bg-line-strong"/><h2 id={label} className="text-xl font-extrabold">이 {what}을 삭제할까요?</h2><p className="break-words text-base font-semibold">{when}</p><p className="mb-1.5 text-base leading-6 text-muted">참석자·곡 기록도 함께 지워지고, 되돌릴 수 없어요.</p>
 <form action={remove} className="flex flex-col gap-2.5"><input type="hidden" name="plan_id" value={planId}/><input type="hidden" name="plan_version" value={version}/><input type="hidden" name="confirm_delete" value="yes"/>{state.error&&<p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}<Button type="submit" variant="destructive" size="lg" disabled={pending}>{pending?'삭제 중…':'삭제 확인'}</Button><Button type="button" variant="secondary" size="lg" disabled={pending} onClick={()=>dialog.current?.close()}>취소</Button></form></div>
 </dialog></>;
}
