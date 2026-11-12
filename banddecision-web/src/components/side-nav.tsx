'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,CalendarDays,Music2,ClipboardCheck,Settings,Users} from 'lucide-react';
import {isActiveTab} from '@/components/bottom-nav';

const main=[['/dashboard','홈',Home],['/schedule','일정',CalendarDays],['/songs','합주곡',Music2],['/plans','합주 계획',ClipboardCheck]] as const;
const settings=[['/settings/band','밴드 관리',Users],['/settings/profile','내 정보',Settings]] as const;

// PC left menu: the current tab gets the brand tint like the mobile tab bar; settings sit in their own group.
export function SideNavView({path,pendingVoteBadge=null}:{path:string;pendingVoteBadge?:React.ReactNode}){
 const item=([href,label,Icon]:readonly [string,string,typeof Home])=>{
  const on=isActiveTab(path,href);
  return <Link key={href} href={href} aria-current={on?'page':undefined} className={'flex min-h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 text-sm '+(on?'bg-brand-tint font-bold text-brand-ink':'font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink')}><Icon size={18} aria-hidden="true" className="shrink-0"/>{label}{href==='/songs'&&pendingVoteBadge&&<span className="ml-auto">{pendingVoteBadge}</span>}</Link>;
 };
 return <nav aria-label="주요 메뉴" className="mt-4 flex flex-col gap-0.5">{main.map(item)}<p className="mt-4 px-2.5 pb-1 text-xs font-semibold text-faint">설정</p>{settings.map(item)}</nav>;
}
// Reads the URL, so AppShell renders it inside <Suspense> with SideNavView as the prerendered fallback.
export function SideNav({pendingVoteBadge=null}:{pendingVoteBadge?:React.ReactNode}){
 return <SideNavView path={usePathname()??''} pendingVoteBadge={pendingVoteBadge}/>;
}
