import Link from 'next/link';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/card';
import { ActionForm } from '@/components/action-form';
import { redeemInviteAction } from '@/app/actions';
import { Button } from '@/components/ui/button';

export const instant = false;
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await createClient();
  const { data } = db ? await db.rpc('inspect_invite', { p_token: token }) : { data: null };
  const invite = Array.isArray(data) ? data[0] : data;
  if (!invite?.valid) return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><Card className="w-full max-w-md"><CardTitle>사용할 수 없는 초대 링크</CardTitle><p className="mt-2 text-sm text-slate-600">만료되었거나 이미 사용된 링크일 수 있습니다. 밴드장에게 새 간편 초대 링크를 요청하세요.</p><Link href="/login" className="mt-4 inline-block font-semibold text-blue-700">밴드 코드로 접속하기</Link></Card></main>;
  const user = db ? await getCurrentUser(db) : null;
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><Card className="w-full max-w-md">
    <p className="text-sm font-bold text-blue-700">BANDDECISION 초대</p>
    <CardTitle className="mt-2 text-2xl">{invite.band_name}에 참여하기</CardTitle>
    <p className="mt-3 text-sm leading-6 text-slate-600">이 링크는 이전 이메일 방식의 초대 링크입니다. 지금은 밴드 코드·공용 비밀번호와 개인 PIN으로 이메일 없이 참여할 수 있습니다.</p>
    <Link href="/login" className="mt-5 block"><Button className="w-full">이메일 없이 밴드 코드로 참여</Button></Link>
    <p className="mt-3 text-xs leading-5 text-slate-500">밴드장에게 코드와 공용 비밀번호 또는 새 간편 초대 링크를 받아 주세요.</p>
    <details className="mt-6 border-t pt-4"><summary className="cursor-pointer text-sm text-slate-600">기존 이메일 방식으로 참여</summary>
      {user && !user.is_anonymous ? <ActionForm action={redeemInviteAction} submit="초대 수락" className="mt-5"><input type="hidden" name="token" value={token}/><label className="text-sm font-semibold">담당 파트<input name="part" maxLength={30} required placeholder="기타, 보컬…" className="mt-1 min-h-11 w-full rounded-xl border px-3"/></label></ActionForm> : <div className="mt-5 grid gap-3"><Link href={'/login/email?next=' + encodeURIComponent('/join/' + token)}><Button className="w-full">기존 이메일 계정으로 로그인</Button></Link><Link href={'/signup?next=' + encodeURIComponent('/join/' + token)}><Button variant="secondary" className="w-full">이메일 계정 만들기</Button></Link></div>}
    </details>
  </Card></main>;
}
