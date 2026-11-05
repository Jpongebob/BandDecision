import { redirect } from 'next/navigation';
import { bandCodeSchema } from '@/lib/band-login-validation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { signOutAction } from '@/app/actions';
import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BandPasswordField } from '@/components/band-login-fields';
import { beginBandAccessAction } from '@/app/band-login-actions';

export const instant = false;
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const parsedCode = bandCodeSchema.safeParse(code);
  const invitedCode = parsedCode.success ? parsedCode.data : '';
  const db = await createClient();
  const currentUser = db ? await getCurrentUser(db) : null;
  if (currentUser && !invitedCode) redirect('/dashboard');
  return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><Card className="w-full max-w-md p-6 sm:p-8">
    <Link href="/" className="text-xs font-bold tracking-widest text-blue-700">BANDDECISION</Link>
    <CardTitle className="mt-4 text-2xl">우리 밴드로 접속</CardTitle>
    <p className="mt-2 text-sm text-slate-600">밴드 코드와 공용 비밀번호를 입력하세요.</p>
    <>{currentUser && <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm"><Link href="/dashboard" className="font-semibold text-blue-700">{currentUser.nickname} 님으로 계속하기</Link><form action={signOutAction} className="mt-3"><button className="underline">로그아웃 · 다른 프로필 접속</button></form></div>}<ActionForm action={beginBandAccessAction} submit="밴드 들어가기" className="mt-6">
      <label className="grid gap-1 text-sm font-semibold">밴드 코드<Input name="code" defaultValue={invitedCode} minLength={10} maxLength={10} pattern="[a-fA-F0-9]{10}" autoCapitalize="characters" autoComplete="off" placeholder="10자리 코드" required /></label>
      <BandPasswordField />
    </ActionForm></>
    <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm"><Link href="/bands/new" className="font-semibold text-blue-700">새 밴드 만들기</Link><Link href="/bands/test" className="text-slate-600">테스트 밴드 체험</Link></div>
  </Card></main>;
}
