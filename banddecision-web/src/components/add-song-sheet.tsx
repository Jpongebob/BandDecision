'use client';
import {useRef} from 'react';
import {Plus,X} from 'lucide-react';
import {addSongAction} from '@/app/actions';
import {ActionForm} from '@/components/action-form';
// Any member can add a candidate song; it opens as a bottom sheet so the list stays in place.
export function AddSongSheet({bandId}:{bandId:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const field='mt-1.5 min-h-12 w-full rounded-xl border border-line-strong px-3 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint';
 return <><button type="button" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[15px] font-bold text-ink"><Plus size={16} strokeWidth={2.4} aria-hidden="true"/>곡 추가</button>
 <dialog ref={dialog} aria-labelledby="add-song-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className="sheet">
 <div className="flex flex-col gap-3 px-5 pb-6 pt-2.5"><div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-line-strong"/><div className="flex items-center justify-between"><h2 id="add-song-title" className="text-xl font-extrabold">후보곡 추가</h2><button type="button" aria-label="닫기" onClick={()=>dialog.current?.close()} className="grid size-11 place-items-center rounded-xl text-ink-2"><X size={22}/></button></div>
 <p className="text-[15px] text-muted">멤버 누구나 올릴 수 있어요. 올리면 모두가 투표할 수 있어요.</p>
 <ActionForm action={addSongAction} submit="후보곡 올리기" className="gap-3"><input type="hidden" name="band_id" value={bandId}/><label className="text-[15px] font-semibold text-ink-2">곡 제목<input name="title" maxLength={120} required className={field}/></label><label className="text-[15px] font-semibold text-ink-2">가수<input name="artist" maxLength={120} required className={field}/></label></ActionForm></div>
 </dialog></>;
}
