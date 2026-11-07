'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';

export function PageNavigation(){
 const path=usePathname();
 if(path==='/dashboard')return null;
 const parent=path.startsWith('/songs/')?'/songs':path.startsWith('/schedule/')?'/schedule':path.startsWith('/settings/')?'/settings':'/dashboard';
 if(parent==='/dashboard')return null;
 return <nav aria-label="화면 이동" className="-ml-2 mb-2 text-base font-bold text-ink"><Link href={parent} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 hover:bg-surface-2"><ArrowLeft size={20}/>뒤로</Link></nav>;
}
