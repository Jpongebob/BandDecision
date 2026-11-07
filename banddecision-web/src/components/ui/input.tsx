import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
const style='mt-1 min-h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 py-2 text-base text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand-tint';
export function Input({className,...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={cn(style,className)} {...props}/>;}
export function Textarea({className,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea className={cn(style,'min-h-24',className)} {...props}/>;}
