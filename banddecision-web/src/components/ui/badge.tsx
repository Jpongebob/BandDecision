import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
export function Badge({className,...props}:HTMLAttributes<HTMLSpanElement>){return <span className={cn('inline-flex items-center whitespace-nowrap rounded-md bg-brand-tint px-2 py-0.5 text-[13px] font-bold text-brand-ink',className)} {...props}/>;}
