import Link from 'next/link';
import { Suspense } from 'react';
import { PageNavigation } from '@/components/page-navigation';
import { signOutAction } from '@/app/actions';
import { LiveRefresh } from '@/components/live-refresh';
import { BottomNav, BottomNavView } from '@/components/bottom-nav';
import { SideNav, SideNavView } from '@/components/side-nav';
// Same header on every tab: band name on the left, my nickname's first letter on the right (opens 내 정보).
export function AppShell({children,nickname,band,bandId=null,live=true,pendingVoteBadge=null}:{children:React.ReactNode;nickname:string;band:string|null;bandId?:string|null;live?:boolean;pendingVoteBadge?:React.ReactNode}){
 const initial=[...nickname.trim()][0]??'';
 return <div className="min-h-screen bg-canvas text-ink">
 {live&&<LiveRefresh bandId={bandId}/>}
 <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-5 py-6 lg:block">
 <Link href="/dashboard" className="text-lg font-extrabold tracking-tight">Band<span className="text-brand">Decision</span></Link>
 <Suspense fallback={<SideNavView path="" pendingVoteBadge={pendingVoteBadge}/>}><SideNav pendingVoteBadge={pendingVoteBadge}/></Suspense>
 <form action={signOutAction} className="absolute bottom-6 left-5 right-5"><button className="min-h-11 w-full rounded-xl border border-line-strong p-3 text-[15px] font-semibold">로그아웃</button></form></aside>
 <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white pl-5 pr-2.5 sm:pl-7 sm:pr-5"><Link href="/dashboard" className="min-w-0 truncate text-lg font-extrabold">{band??'BandDecision'}</Link>{initial&&<Link href="/settings/profile" aria-label={'내 정보, '+nickname} className="grid size-11 shrink-0 place-items-center"><span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-brand text-[15px] font-bold text-white">{initial}</span></Link>}</header>
 <main className="mx-auto max-w-6xl px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-4 sm:px-7 lg:pb-10"><Suspense fallback={null}><PageNavigation/></Suspense>{children}</main></div>
 <Suspense fallback={<BottomNavView path="" pendingVoteBadge={pendingVoteBadge}/>}><BottomNav pendingVoteBadge={pendingVoteBadge}/></Suspense>
 </div>;
}
