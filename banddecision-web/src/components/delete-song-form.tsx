'use client';
import {useActionState,useId,useRef} from 'react';
import type {FormState} from '@/app/actions';
import {deleteBandSongAction} from '@/app/live-actions';
import {Button} from '@/components/ui/button';
export function DeleteSongForm({songId,title,artist}:{songId:number;title:string;artist:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId();
 const[state,remove,pending]=useActionState(deleteBandSongAction,{} as FormState);
 return <div className="mt-4 border-t pt-4"><Button type="button" variant="destructive" onClick={()=>dialog.current?.showModal()}>곡 삭제</Button>
 <dialog ref={dialog} aria-labelledby={label} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 p-5 shadow-xl backdrop:bg-slate-950/40">
 <h2 id={label} className="text-lg font-bold">이 곡을 삭제할까요?</h2><p className="mt-3 break-words font-semibold">{title} · {artist}</p><p className="mt-3 text-sm text-slate-600">후보곡·확정곡 목록에서 삭제되며, 이 곡의 투표와 난이도도 삭제됩니다. 이미 저장된 합주 계획의 곡 기록은 유지됩니다.</p>
 <form action={remove} className="mt-4 grid gap-3"><input type="hidden" name="song_id" value={songId}/><input type="hidden" name="confirm_delete_song" value="yes"/>{state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}<Button type="button" variant="secondary" disabled={pending} onClick={()=>dialog.current?.close()}>취소</Button><Button type="submit" variant="destructive" disabled={pending}>{pending?'삭제 중…':'삭제 확인'}</Button></form>
 </dialog></div>;
}
