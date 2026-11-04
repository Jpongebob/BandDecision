import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { createClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();
 if(!supabase)return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-lg rounded-2xl border bg-white p-7"><h1 className="text-xl font-bold">Supabase 연결 설정이 필요합니다</h1><p className="mt-3 text-sm leading-6 text-slate-600">프로젝트의 `.env.local`에 Supabase URL과 anon key를 추가한 뒤 다시 실행해 주세요.</p><Link className="mt-5 inline-block text-blue-700" href="/">첫 화면으로</Link></section></main>;
 const{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const{data:member}=await supabase.from('band_members').select('band_id,bands(name)').eq('user_id',user.id).eq('status','active').maybeSingle();
 const relation=member?.bands; const band=Array.isArray(relation)?relation[0] as {name:string}|undefined:relation as {name:string}|null|undefined;
 return <AppShell email={user.email??''} band={band?.name??null}>{children}</AppShell>;
}
