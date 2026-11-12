'use client';
import {useRef} from 'react';
import {X} from 'lucide-react';
// Bottom sheet on <dialog>: one trigger button, a title, a close button; tapping the dim area closes it.
export function Sheet({title,trigger,triggerClassName='',triggerLabel,children,wide=false,id}:{title:string;trigger?:React.ReactNode;triggerClassName?:string;triggerLabel?:string;children:React.ReactNode;wide?:boolean;id?:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 return <>{trigger!=null&&<button type="button" aria-haspopup="dialog" aria-label={triggerLabel} onClick={()=>dialog.current?.showModal()} className={triggerClassName}>{trigger}</button>}
 <dialog ref={dialog} id={id} aria-label={title} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} className={'sheet'+(wide?' sm:max-w-xl':'')}>
 <div className="flex max-h-[inherit] flex-col">
 <div aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-line-strong"/>
 <div className="flex shrink-0 items-center justify-between py-1 pl-5 pr-3"><h2 className="text-xl font-extrabold">{title}</h2><button type="button" aria-label="닫기" onClick={()=>dialog.current?.close()} className="grid size-11 place-items-center rounded-xl text-ink-2"><X size={22}/></button></div>
 <div className="min-h-0 overflow-y-auto px-5"><div className="pb-6">{children}</div></div>
 </div></dialog></>;
}
// Opens a Sheet rendered elsewhere on the page (by its id) so one form is not rendered twice.
export function OpenSheetButton({target,className,label,children}:{target:string;className:string;label?:string;children:React.ReactNode}){
 return <button type="button" aria-haspopup="dialog" aria-label={label} onClick={()=>(document.getElementById(target) as HTMLDialogElement|null)?.showModal()} className={className}>{children}</button>;
}
