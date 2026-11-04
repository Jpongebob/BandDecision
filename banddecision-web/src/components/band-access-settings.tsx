import { createInviteAction } from '@/app/actions';
import { Card, CardTitle } from '@/components/ui/card';
import { ActionForm } from '@/components/action-form';
import { BandPasswordField, PinField } from '@/components/band-login-fields';
import { changeMemberPinAction, configureBandLoginAction, unlockBandAdminAction } from '@/app/band-login-actions';
import { createClient } from '@/lib/supabase/server';

export async function BandAccessSettings({ bandId }: { bandId: string }) {
  const db = await createClient();
  if (!db) return null;
  const { data, error } = await db.rpc('band_login_settings');
  if (error) return <Card><CardTitle>간편 접속 설정을 불러오지 못했습니다</CardTitle><p className="mt-2 text-sm">새 인증 마이그레이션 적용 여부와 연결을 확인해 주세요.</p></Card>;
  const settings = data as { code: string | null; role: string; admin_unlocked: boolean } | null;
  if (!settings) return null;
  const { data: members } = settings.role === 'leader' && settings.admin_unlocked
    ? await db.from('band_members').select('id,user_id,profiles(nickname)').eq('status', 'active')
    : { data: null };
  return <Card className="space-y-5 border-blue-200">
    <div><CardTitle>밴드 코드 접속</CardTitle>{settings.code ? <><p className="mt-3 break-all font-mono text-2xl font-black tracking-widest">{settings.code}</p><p className="mt-2 text-sm text-slate-600">코드와 공용 비밀번호를 멤버들에게 공유하세요. 개인 PIN과 관리자 PIN은 공유하지 마세요.</p></> : <p className="mt-2 text-sm text-slate-600">밴드장이 공용 비밀번호를 설정하면 이메일 없이 접속할 수 있습니다.</p>}</div>
    {settings.role === 'leader' && !settings.admin_unlocked && settings.code && <ActionForm action={unlockBandAdminAction} submit="관리자 권한 잠금 해제" className="max-w-sm"><PinField name="admin_pin" label="관리자 PIN (숫자 6자리)" /><p className="text-xs text-slate-500">멤버 관리와 합주 최종 확정 권한을 30분 동안 사용합니다.</p></ActionForm>}
    {settings.role === 'leader' && settings.admin_unlocked && <>
      {settings.code ? <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h3 className="font-bold">이메일 없이 멤버 초대</h3><p className="mt-2 text-sm text-slate-600">링크를 열면 밴드 코드가 자동 입력됩니다. 공용 비밀번호는 따로 전달하세요. 처음 온 멤버는 닉네임·파트·개인 PIN만 만들면 됩니다.</p><ActionForm action={createInviteAction} submit="간편 초대 링크 만들기" className="mt-4"><input type="hidden" name="band_id" value={bandId} /></ActionForm><p className="mt-3 text-xs text-slate-500">이 링크는 여러 멤버가 사용할 수 있습니다. 개인 PIN과 관리자 PIN은 공유하지 마세요.</p></section> : <details><summary className="cursor-pointer text-sm font-semibold">기존 이메일 계정용 초대</summary><p className="mt-2 text-sm text-slate-600">이메일 없이 초대하려면 아래에서 밴드 코드 접속을 먼저 활성화하세요. 이메일용 링크는 7일간 한 번만 사용할 수 있습니다.</p><ActionForm action={createInviteAction} submit="이메일 방식 초대 링크 만들기" className="mt-4"><input type="hidden" name="band_id" value={bandId} /></ActionForm></details>}

      <details><summary className="cursor-pointer text-sm font-semibold">{settings.code ? '공용 비밀번호·관리자 PIN 변경' : '밴드 코드 접속 활성화'}</summary><ActionForm action={configureBandLoginAction} submit="접속 설정 저장" className="mt-4 max-w-sm"><BandPasswordField /><PinField name="admin_pin" label="새 관리자 PIN (숫자 6자리)" /><p className="text-xs text-slate-500">기존 코드 접속 기기는 다시 로그인해야 합니다. 밴드 코드는 유지됩니다.</p></ActionForm></details>
      {members && <details><summary className="cursor-pointer text-sm font-semibold">다른 멤버 PIN 초기화</summary><ActionForm action={changeMemberPinAction} submit="선택한 멤버 PIN 초기화" className="mt-4 max-w-sm"><label className="grid gap-1 text-sm font-semibold">멤버<select name="member" className="min-h-11 rounded-xl border px-3" required defaultValue=""><option disabled value="">멤버 선택</option>{members.map(member => { const relation = member.profiles; const profile = (Array.isArray(relation) ? relation[0] : relation) as { nickname: string } | null; return <option key={member.id} value={member.id}>{profile?.nickname ?? '멤버'}</option>; })}</select></label><PinField label="새 PIN (숫자 6자리)" /><p className="text-xs text-slate-500">본인 PIN은 내 정보에서 현재 PIN을 입력해 변경하세요. 다른 멤버에게는 새 PIN을 직접 전달하세요.</p></ActionForm></details>}
    </>}
  </Card>;
}

export function MemberPinSettings() {
  return <Card><CardTitle>내 접속 PIN</CardTitle><p className="mt-2 text-sm text-slate-600">밴드 코드로 접속할 때 사용할 숫자 6자리입니다. 처음 설정할 때만 현재 PIN을 비워두세요.</p><ActionForm action={changeMemberPinAction} submit="내 PIN 저장" className="mt-5 max-w-sm"><PinField name="current_pin" label="현재 PIN (처음 설정 시 생략)" required={false} /><PinField label="새 PIN (숫자 6자리)" /></ActionForm></Card>;
}
