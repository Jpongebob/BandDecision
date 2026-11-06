import Link from 'next/link';
import {loadDefaultBandEntry} from '@/lib/direct-band-entry';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { PinField, ProfileFields } from '@/components/band-login-fields';
import { directMemberPinLoginAction,directRegisterBandProfileAction,memberPinLoginAction, registerBandProfileAction } from '@/app/band-login-actions';
import { signOutAction } from '@/app/actions';

type Member = { id: string; nickname: string; part: string; role: string; pin_ready: boolean };
export const instant = false;
export default async function MemberLoginPage({searchParams=Promise.resolve({})}:{searchParams?:Promise<{direct?:string}>}={}) {
  const db = await createClient();
  if (!db) redirect('/login');
  const params=await searchParams;
  const {data,error}=params.direct==='1'?{data:null,error:null}:await db.rpc('band_access_context');
  const granted=!error?data as {band_name:string;profiles:Member[]}|null:null;
  const direct=!granted;const context=granted??await loadDefaultBandEntry(db);
  if(!context)redirect('/login?standard=1');
  return <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-[#f5f7fb] px-4 py-10">
    <div><h1 className="text-2xl font-black">{context.band_name}</h1><p className="mt-2 text-sm text-slate-600">내 프로필을 선택하고 PIN을 입력하세요.</p></div>
    <Card><CardTitle>기존 멤버</CardTitle>
      <ActionForm action={direct?directMemberPinLoginAction:memberPinLoginAction} submit="내 프로필로 로그인" className="mt-5">
        <label className="grid gap-1 text-sm font-semibold">내 프로필<select name="member" required defaultValue="" className="min-h-11 w-full rounded-xl border px-3"><option value="" disabled>프로필 선택</option>{context.profiles.map(member => <option key={member.id} value={member.id} disabled={!member.pin_ready}>{member.nickname} · {member.part}{member.role === 'leader' ? ' · 밴드장' : ''}{member.pin_ready ? '' : ' · PIN 설정 필요'}</option>)}</select></label>
        <PinField />
      </ActionForm>
      <p className="mt-4 text-xs text-slate-500">내 프로필을 선택하고 개인 PIN으로 접속하세요. PIN을 잊으면 밴드장에게 초기화를 요청하세요.</p>
    </Card>
    <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">처음 참여하나요? 새 프로필 만들기</summary><ActionForm action={direct?directRegisterBandProfileAction:registerBandProfileAction} submit="프로필 만들고 참여" className="mt-5"><ProfileFields /></ActionForm><p className="mt-3 text-xs text-slate-500">이미 프로필이 있다면 새로 만들지 말고 위에서 선택하세요. 새 멤버도 가입하면 바로 일정과 투표에 참여할 수 있습니다.</p></details>
    <div className="flex flex-wrap gap-4"><Link href="/login?standard=1" className="text-sm font-semibold text-blue-700">밴드 코드로 접속</Link><form action={signOutAction}><button className="text-sm text-slate-600">접속 초기화</button></form></div>
  </main>;
}
