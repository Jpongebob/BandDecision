'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,CalendarDays,Music2,ClipboardCheck,MoreHorizontal} from 'lucide-react';

const tabs=[['/dashboard','홈',Home],['/schedule','일정',CalendarDays],['/songs','합주곡',Music2],['/plans','합주 계획',ClipboardCheck],['/settings','더보기',MoreHorizontal]] as const;
export function isActiveTab(path:string,href:string){return href==='/dashboard'?path==='/dashboard':path===href||path.startsWith(href+'/');}
const active=isActiveTab;

// Mobile tab bar: the current tab gets the brand colour and a 3px top bar; badges keep their own red.
export function BottomNavView({path,pendingVoteBadge=null}:{path:string;pendingVoteBadge?:React.ReactNode}){
 return <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-30 grid h-[72px] grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">{tabs.map(([href,label,Icon])=>{
  const on=active(path,href);
  return <Link key={href} href={href} aria-current={on?'page':undefined} className={'flex flex-col items-center justify-center gap-1 border-t-[3px] text-[13px] '+(on?'border-brand font-bold text-brand-ink':'border-transparent font-semibold text-muted')}><span className="relative inline-flex"><Icon size={24} strokeWidth={2} aria-hidden="true"/>{href==='/songs'&&pendingVoteBadge&&<span className="absolute -right-3.5 -top-2">{pendingVoteBadge}</span>}</span>{label}</Link>;
 })}</nav>;
}
// Reads the URL, so AppShell renders it inside <Suspense> with BottomNavView as the prerendered fallback.
export function BottomNav({pendingVoteBadge=null}:{pendingVoteBadge?:React.ReactNode}){
 return <BottomNavView path={usePathname()??''} pendingVoteBadge={pendingVoteBadge}/>;
}
