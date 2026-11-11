import {loadDefaultBandEntry} from '@/lib/direct-band-entry';
import {testBandsEnabled} from '@/lib/test-band-access';
import { redirect } from 'next/navigation';
import { bandCodeSchema } from '@/lib/band-login-validation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { signOutAction } from '@/app/actions';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { BandPasswordField,BandCodeField } from '@/components/band-login-fields';
import { beginBandAccessAction } from '@/app/band-login-actions';

export const instant = false;
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string;standard?:string }> }) {
  const { code,standard } = await searchParams;
  const parsedCode = bandCodeSchema.safeParse(code);
  const invitedCode = parsedCode.success ? parsedCode.data : '';
  const db = await createClient();
  const currentUser = db ? await getCurrentUser(db) : null;
  if (currentUser && !invitedCode) redirect('/dashboard');
  if(db&&!invitedCode&&standard!=='1'&&await loadDefaultBandEntry(db))redirect('/login/member?direct=1');
  return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><Card className="w-full max-w-md p-6 sm:p-8">
    <Link href="/" className="text-xs font-bold tracking-widest text-blue-700">BANDDECISION</Link>
    <CardTitle className="mt-4 text-2xl">우리 밴드로 접속</CardTitle>
    <p className="mt-2 text-sm text-slate-600">밴드 코드와 공용 비밀번호를 입력하세요.</p>
    <>{currentUser && <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm"><Link href="/dashboard" className="font-semibold text-blue-700">{currentUser.nickname} 님으로 계속하기</Link><form action={signOutAction} className="mt-3"><button className="underline">로그아웃 · 다른 프로필 접속</button></form></div>}<ActionForm action={beginBandAccessAction} submit="밴드 들어가기" className="mt-6">
      <BandCodeField value={invitedCode}/>
      <BandPasswordField />
    </ActionForm></>
    <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm"><Link href="/bands/new" className="font-semibold text-blue-700">새 밴드 만들기</Link>{testBandsEnabled()&&<Link href="/bands/test" className="text-slate-600">테스트 밴드 체험</Link>}</div>
  </Card></main>;
}
