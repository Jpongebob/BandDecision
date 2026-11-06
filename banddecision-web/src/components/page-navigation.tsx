'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';

export function PageNavigation(){
 const path=usePathname();
 if(path==='/dashboard')return null;
 const parent=path.startsWith('/songs/')?'/songs':path.startsWith('/schedule/')?'/schedule':path.startsWith('/settings/')?'/settings':'/dashboard';
 if(parent==='/dashboard')return null;
 return <nav aria-label="화면 이동" className="mb-4 text-sm font-semibold text-blue-700"><Link href={parent} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 hover:bg-blue-50"><ArrowLeft size={16}/>뒤로</Link></nav>;
}
