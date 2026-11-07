'use client';
import {useActionState,useId,useRef} from 'react';
import {Trash2} from 'lucide-react';
import type {FormState} from '@/app/actions';
import {deleteBandSongAction} from '@/app/live-actions';
import {Button} from '@/components/ui/button';
// Deleting removes every member's vote with the song, so it asks once (plans keep their own song copies).
export function DeleteSongForm({songId,title,artist}:{songId:number;title:string;artist:string}){
 const dialog=useRef<HTMLDialogElement>(null),label=useId();
 const[state,remove,pending]=useActionState(deleteBandSongAction,{} as FormState);
 return <div><Button type="button" variant="danger" className="w-full" onClick={()=>dialog.current?.showModal()}><Trash2 size={18} aria-hidden="true"/>곡 삭제</Button>
 <dialog ref={dialog} aria-labelledby={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="sheet">
 <div className="flex flex-col gap-2.5 px-5 pb-6 pt-2.5"><div aria-hidden="true" className="mx-auto mb-1 h-[5px] w-10 rounded-full bg-line-strong"/><h2 id={label} className="text-xl font-extrabold">이 곡을 삭제할까요?</h2><p className="break-words text-base font-semibold">{title} · {artist}</p><p className="mb-1.5 text-base leading-6 text-muted">멤버들이 남긴 투표와 난이도도 함께 지워지고, 되돌릴 수 없어요. 이미 정한 합주 계획의 곡 기록은 그대로예요.</p>
 <form action={remove} className="flex flex-col gap-2.5"><input type="hidden" name="song_id" value={songId}/><input type="hidden" name="confirm_delete_song" value="yes"/>{state.error&&<p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}<Button type="submit" variant="destructive" size="lg" disabled={pending}>{pending?'삭제 중…':'삭제 확인'}</Button><Button type="button" variant="secondary" size="lg" disabled={pending} onClick={()=>dialog.current?.close()}>취소</Button></form></div>
 </dialog></div>;
}
