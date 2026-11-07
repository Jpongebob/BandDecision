import {daysUntil,dDay} from '@/lib/day-format';
// Shared plan pieces so 홈 and 합주 계획 show the same information the same way.
export function DDay({day,today,large=false}:{day:string;today:string;large?:boolean}){
 const n=daysUntil(day,today);
 return <span aria-label={n===0?'오늘 합주':n>0?'합주까지 '+n+'일 남음':'합주 후 '+Math.abs(n)+'일'} className={'shrink-0 whitespace-nowrap rounded-md bg-brand-tint font-bold text-brand-ink '+(large?'px-2 py-0.5 text-[15px]':'px-1.5 py-0.5 text-[13px]')}>{dDay(day,today)}</span>;
}
export function AttendanceChip({attending,total}:{attending:number;total:number}){
 return <span className="self-start whitespace-nowrap rounded-full bg-plan-bg px-2.5 py-1 text-[13px] font-bold text-plan-ink">{attending}/{total}명 참석</span>;
}
export function SongChips({titles,max=3}:{titles:string[];max?:number}){
 if(!titles.length)return null;
 const shown=titles.slice(0,max),rest=titles.length-shown.length;
 return <ul aria-label="합주곡" className="flex flex-wrap gap-1.5">{shown.map((t,i)=><li key={i} className="max-w-full break-words rounded-lg bg-surface-2 px-2.5 py-1.5 text-[15px] font-medium text-ink-2">{t}</li>)}{rest>0&&<li className="whitespace-nowrap rounded-lg border border-dashed border-line-strong bg-white px-2.5 py-1.5 text-[15px] font-semibold text-muted" aria-label={'외 '+rest+'곡'}>+{rest}곡</li>}</ul>;
}
