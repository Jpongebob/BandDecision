import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// One filled blue button per screen; the rest are outline or text buttons.
export const buttonStyles=cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[15px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',{
  variants:{variant:{default:'bg-brand text-white hover:bg-brand-ink',secondary:'border border-line-strong bg-white text-ink hover:bg-surface-2',ghost:'text-ink-2 hover:bg-surface-2',destructive:'bg-danger text-white hover:bg-[#912018]',danger:'border border-danger-line bg-white text-danger hover:bg-danger-bg'},size:{default:'',sm:'min-h-10 px-3',lg:'min-h-12 px-5 text-base'}},defaultVariants:{variant:'default',size:'default'}});
type Props=ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonStyles>;
export function Button({className,variant,size,...props}:Props){return <button className={cn(buttonStyles({variant,size}),className)} {...props}/>;}
