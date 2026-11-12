import Link from 'next/link';
import { Suspense } from 'react';
import { PageNavigation } from '@/components/page-navigation';
import { signOutAction } from '@/app/actions';
import { LiveRefresh } from '@/components/live-refresh';
import { BottomNav, BottomNavView } from '@/components/bottom-nav';
import { SideNav, SideNavView } from '@/components/side-nav';
// Same header on every tab: band name on the left, my nickname's first letter on the right (opens 내 정보).
export function AppShell({children,nickname,band,bandId=null,live=true,pendingVoteBadge=null,role=null}:{children:React.ReactNode;nickname:string;band:string|null;bandId?:string|null;live?:boolean;pendingVoteBadge?:React.ReactNode;role?:string|null}){
 const initial=[...nickname.trim()][0]??'';
 return <div className="min-h-screen bg-canvas text-ink">
 {live&&<LiveRefresh bandId={bandId}/>}
 <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col border-r border-line bg-white px-3.5 pb-4 pt-5 lg:flex">
 <Link href="/dashboard" className="px-2 text-[17px] font-extrabold tracking-tight">Band<span className="text-brand">Decision</span></Link>
 {band&&<div className="mt-3.5 flex flex-col rounded-[10px] bg-surface-2 px-2.5 py-2"><span className="text-xs text-muted">우리 밴드</span><span className="break-words text-sm font-bold">{band}</span></div>}
 <Suspense fallback={<SideNavView path="" pendingVoteBadge={pendingVoteBadge}/>}><SideNav pendingVoteBadge={pendingVoteBadge}/></Suspense>
 <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-3">{initial&&<span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">{initial}</span>}<span className="flex min-w-0 grow flex-col leading-tight"><span className="truncate text-sm font-bold">{nickname}</span>{role&&<span className="text-xs text-muted">{role==='leader'?'밴드장':'멤버'}</span>}</span><form action={signOutAction}><button className="min-h-9 rounded-lg px-2 text-xs font-semibold text-muted">로그아웃</button></form></div></aside>
 <div className="lg:pl-[232px]"><header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white pl-5 pr-2.5 sm:pl-7 sm:pr-5 lg:hidden"><Link href="/dashboard" className="min-w-0 truncate text-lg font-extrabold">{band??'BandDecision'}</Link>{initial&&<Link href="/settings/profile" aria-label={'내 정보, '+nickname} className="grid size-11 shrink-0 place-items-center"><span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-brand text-[15px] font-bold text-white">{initial}</span></Link>}</header>
 <main className="mx-auto max-w-6xl px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-4 sm:px-7 lg:px-8 lg:pb-8 lg:pt-6"><Suspense fallback={null}><PageNavigation/></Suspense>{children}</main></div>
 <Suspense fallback={<BottomNavView path="" pendingVoteBadge={pendingVoteBadge}/>}><BottomNav pendingVoteBadge={pendingVoteBadge}/></Suspense>
 </div>;
}
