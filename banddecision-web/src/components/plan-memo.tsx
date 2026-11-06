export function PlanMemo({memo,compact=false}:{memo?:string|null;compact?:boolean}){
 if(!memo)return null;
 return <section aria-label="합주 메모" className="mt-3 min-w-0 rounded-xl bg-slate-50 p-3"><h3 className="text-xs font-semibold text-slate-500">합주 메모</h3><p className={'mt-1 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]'+(compact?' line-clamp-3':'')}>{memo}</p></section>;
}
