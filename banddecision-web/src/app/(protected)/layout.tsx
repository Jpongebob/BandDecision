import { getBandContext } from '@/lib/band-context';
import { BandLoadError } from '@/components/band-load-error';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export default async function ProtectedLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();
 if(!supabase)return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-2xl border bg-white p-7"><h1 className="text-xl font-bold">Supabase 연결 설정이 필요합니다</h1><p className="mt-3 text-sm leading-6 text-slate-600">프로젝트의 `.env.local`에 Supabase URL과 anon key를 추가한 뒤 다시 실행해 주세요.</p><Link className="mt-5 inline-block text-blue-700" href="/">첫 화면으로</Link></section></main>;
 const user=await getCurrentUser(supabase);if(!user)redirect('/login');
 const context=await getBandContext(supabase,user.id);
 if(context.status==='error')return <AppShell email={user.nickname} band="밴드 정보 확인 필요"><BandLoadError code={context.code}/></AppShell>;
 const member=context.status==='ready'?context.member:null;
 const band=context.status==='ready'?context.band:null;
 return <AppShell email={user.nickname} band={band?.name??null}>{member?.role==='leader'&&!user.adminUnlocked&&<p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">멤버 관리·최종 확정을 하려면 <Link href="/settings/band" className="font-semibold text-blue-700">밴드 관리에서 관리자 PIN 잠금을 해제</Link>하세요.</p>}{children}</AppShell>;
}

export const instant = false;

