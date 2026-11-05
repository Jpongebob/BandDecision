'use client';
import {useId,useRef} from 'react';
import {removeMemberAction} from '@/app/actions';
import {ActionForm} from '@/components/action-form';
import {Button} from '@/components/ui/button';
export function RemoveMemberForm({memberId,nickname}:{memberId:string;nickname:string}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 return <div><Button type="button" variant="destructive" onClick={()=>dialog.current?.showModal()}>멤버 내보내기</Button>
 <dialog ref={dialog} aria-labelledby={title} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 p-5 shadow-xl backdrop:bg-slate-950/40">
 <h2 id={title} className="break-words text-lg font-bold">{nickname}님을 내보내겠습니까?</h2><p className="mt-3 text-sm text-slate-600">이 멤버는 밴드에 접근할 수 없으며 현재 추천 기준에서 제외됩니다. 기존 합주 계획의 기록은 유지됩니다.</p>
 <ActionForm action={removeMemberAction} submit="내보내기 확인" className="mt-4"><input type="hidden" name="member_id" value={memberId}/><input type="hidden" name="confirm_remove" value="yes"/><Button type="button" variant="secondary" onClick={()=>dialog.current?.close()}>취소</Button></ActionForm>
 </dialog></div>;
}
