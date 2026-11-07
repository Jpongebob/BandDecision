import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <section className={cn('rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]',className)} {...props}/>;}
export function CardTitle({className,...props}:HTMLAttributes<HTMLHeadingElement>){return <h2 className={cn('text-lg font-bold tracking-tight text-ink',className)} {...props}/>;}
