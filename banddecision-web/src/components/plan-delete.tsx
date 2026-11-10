'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {deleteLivePlanAction} from '@/app/live-actions';

// Delete a plan with one more confirmation in place (no nested sheet). Only buttons, so it can sit inside the edit form.
export function PlanDeleteControl({planId,version,label,question,triggerClassName}:{planId:string;version:number;label:string;question:string;triggerClassName:string}){
 const[open,setOpen]=useState(false),[error,setError]=useState(''),[pending,start]=useTransition(),box=useRef<HTMLDivElement>(null);
 // In the edit sheet the sticky save bar would cover the buttons; bring the question to the middle.
 useEffect(()=>{if(open)box.current?.scrollIntoView?.({block:'center',behavior:'smooth'});},[open]);
 function remove(){
  setError('');
  start(async()=>{
   const form=new FormData();form.set('plan_id',planId);form.set('plan_version',String(version));form.set('confirm_delete','yes');
   const result=await deleteLivePlanAction({},form);
   if(result.error)setError(result.error);
  });
 }
 if(!open)return <button type="button" onClick={()=>setOpen(true)} className={triggerClassName}>{label}</button>;
 return <div ref={box} role="group" aria-label={label} className="flex basis-full flex-col gap-2.5 rounded-xl border border-danger-dash bg-danger-bg px-3.5 py-3">
  <p className="text-[15px] leading-[22px] text-ink">{question}</p>
  <div className="flex gap-2"><button type="button" disabled={pending} onClick={()=>{setOpen(false);setError('');}} className="min-h-11 flex-1 rounded-xl border border-line-strong bg-white text-base font-semibold text-ink">취소</button><button type="button" disabled={pending} onClick={remove} className="min-h-11 flex-1 rounded-xl bg-danger text-base font-bold text-white disabled:opacity-60">{pending?'삭제 중…':label}</button></div>
  {error&&<p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
 </div>;
}
