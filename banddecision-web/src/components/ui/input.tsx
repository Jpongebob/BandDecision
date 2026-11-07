import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
const style='mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
export function Input({className,...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={cn(style,className)} {...props}/>;}
export function Textarea({className,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea className={cn(style,'min-h-24',className)} {...props}/>;}
