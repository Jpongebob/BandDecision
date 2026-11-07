'use client';
import {useActionState,useEffect,useRef} from 'react';
import {updateBandSongAction} from '@/app/live-actions';
import type {FormState} from '@/app/actions';
import {Button} from '@/components/ui/button';

const field='mt-1.5 min-h-12 w-full rounded-xl border border-line-strong px-3 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint';
// 곡 정보 수정 (올린 사람·밴드장). 저장되면 시트를 닫고, 제목 옆에 '수정됨'이 붙는다.
export function EditSongSheet({songId,title,artist}:{songId:number;title:string;artist:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const[state,save,pending]=useActionState(updateBandSongAction,{} as FormState);
 useEffect(()=>{if(state.success)dialog.current?.close();},[state]);
 return <><Button type="button" variant="secondary" aria-haspopup="dialog" className="w-full" onClick={()=>dialog.current?.showModal()}>곡 정보 수정</Button>
 <dialog ref={dialog} aria-labelledby="edit-song-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="sheet">
 <form action={save} className="flex flex-col gap-3 px-5 pb-6 pt-2.5"><div aria-hidden="true" className="mx-auto mb-1 h-[5px] w-10 rounded-full bg-line-strong"/><h2 id="edit-song-title" className="text-xl font-extrabold">곡 정보 수정</h2>
 <input type="hidden" name="song_id" value={songId}/>
 <label className="text-[15px] font-semibold text-ink-2">곡 제목<input key={title} name="title" defaultValue={title} maxLength={120} required className={field}/></label>
 <label className="text-[15px] font-semibold text-ink-2">가수<input key={artist} name="artist" defaultValue={artist} maxLength={120} required className={field}/></label>
 <p className="text-sm leading-5 text-muted">고치면 제목 옆에 &apos;수정됨&apos;이 붙어요. 받은 투표는 그대로 남아요.</p>
 {state.error&&<p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}
 <div className="grid grid-cols-[1fr_2fr] gap-2"><Button type="button" variant="secondary" size="lg" disabled={pending} onClick={()=>dialog.current?.close()}>취소</Button><Button type="submit" size="lg" disabled={pending}>{pending?'저장 중…':'저장'}</Button></div>
 </form></dialog></>;
}
