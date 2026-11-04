import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonStyles=cva('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',{
  variants:{variant:{default:'bg-blue-600 text-white hover:bg-blue-700',secondary:'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',ghost:'text-slate-700 hover:bg-slate-100',destructive:'bg-rose-600 text-white hover:bg-rose-700'},size:{default:'',sm:'min-h-9 px-3',lg:'min-h-12 px-5 text-base'}},defaultVariants:{variant:'default',size:'default'}});
type Props=ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonStyles>;
export function Button({className,variant,size,...props}:Props){return <button className={cn(buttonStyles({variant,size}),className)} {...props}/>;}
