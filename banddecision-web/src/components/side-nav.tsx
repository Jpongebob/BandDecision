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
  return <Link key={href} href={href} aria-current={on?'page':undefined} className={'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] '+(on?'bg-brand-tint font-bold text-brand-ink':'font-semibold text-muted hover:bg-surface-2 hover:text-ink')}><Icon size={18} aria-hidden="true"/>{label}{href==='/songs'&&pendingVoteBadge}</Link>;
 };
 return <nav aria-label="주요 메뉴" className="mt-9 flex flex-col gap-1">{main.map(item)}<p className="mt-5 px-3 pb-1 text-[13px] font-semibold text-faint">설정</p>{settings.map(item)}</nav>;
}
// Reads the URL, so AppShell renders it inside <Suspense> with SideNavView as the prerendered fallback.
export function SideNav({pendingVoteBadge=null}:{pendingVoteBadge?:React.ReactNode}){
 return <SideNavView path={usePathname()??''} pendingVoteBadge={pendingVoteBadge}/>;
}
