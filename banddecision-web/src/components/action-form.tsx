'use client';
import { useActionState, type FormHTMLAttributes, type ReactNode } from 'react';
import type { FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';

type Action=(state:FormState,data:FormData)=>Promise<FormState>;
export function ActionForm({action,children,submit='저장',className,...props}:{action:Action;children:ReactNode;submit?:string;className?:string}&Omit<FormHTMLAttributes<HTMLFormElement>,'action'|'children'>){const[state,formAction,pending]=useActionState(action,{} as FormState);return <form action={formAction} className={`grid gap-4 ${className??''}`} {...props}>{children}{state.error&&<p role="alert" className="text-sm text-rose-700">{state.error}</p>}{state.success&&<p role="status" className="break-all text-sm text-emerald-700">{state.success}</p>}<Button disabled={pending}>{pending?'처리 중…':submit}</Button></form>;}
