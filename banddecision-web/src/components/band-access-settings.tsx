import { createInviteAction } from '@/app/actions';
import { Card, CardTitle } from '@/components/ui/card';
import { ActionForm } from '@/components/action-form';
import { BandPasswordField, PinField } from '@/components/band-login-fields';
import { setMemberSkillEnabledAction,setDirectBandEntryAction,changeMemberPinAction, configureBandLoginAction } from '@/app/band-login-actions';
import { createClient } from '@/lib/supabase/server';

type SettingsMember={id:string;user_id:string;profiles:{nickname:string}|{nickname:string}[]|null};
export async function BandAccessSettings({ bandId, roster, settingsResult }: { bandId: string; roster?:SettingsMember[]; settingsResult?:{data:unknown;error:unknown} }) {
  const db = await createClient();
  if (!db) return null;
  const { data, error } = settingsResult??await db.rpc('band_login_settings');
  if (error) return <Card><CardTitle>간편 접속 설정을 불러오지 못했습니다</CardTitle><p className="mt-2 text-sm">새 인증 마이그레이션 적용 여부와 연결을 확인해 주세요.</p></Card>;
  const settings = data as { code: string | null; role: string; admin_unlocked: boolean; skill_enabled?:boolean;direct_entry_enabled?:boolean } | null;
  if (!settings) return null;
  let members:SettingsMember[]|null=null;
  if(settings.role==='leader'){
    if(roster)members=roster;
    else {
      const result=await db.from('band_members').select('id,user_id,profiles(nickname)').eq('band_id',bandId).eq('status','active');
      if(result.error)throw new Error('DATA_LOAD_FAILED');members=result.data as SettingsMember[]|null;
    }
  }
  return <Card className="space-y-5 border-blue-200">
    <div><CardTitle>밴드 코드 접속</CardTitle>{settings.code ? <><p className="mt-3 break-all font-mono text-2xl font-black tracking-widest">{settings.code}</p><p className="mt-2 text-sm text-slate-600">코드와 공용 비밀번호를 멤버들에게 공유하세요. 개인 PIN은 공유하지 마세요.</p></> : <p className="mt-2 text-sm text-slate-600">밴드장이 공용 비밀번호를 설정하면 밴드 코드로 접속할 수 있습니다.</p>}</div>
    {settings.role === 'leader' && <>
      <section aria-label="멤버 실력 기능" className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold">멤버 실력 기능 · {settings.skill_enabled?'켜짐':'꺼짐'}</h3><p className="mt-2 text-sm text-slate-600">끄면 멤버 실력과 곡의 파트별 난이도를 표시하지 않고, 입력 없이 투표로만 추천합니다. 다시 켜면 기존 값으로 복구됩니다.</p><ActionForm action={setMemberSkillEnabledAction} submit={settings.skill_enabled?'실력 기능 끄기':'실력 기능 켜기'} className="mt-3 max-w-sm"><input type="hidden" name="enabled" value={settings.skill_enabled?'false':'true'}/></ActionForm></section>

      {settings.code&&<section aria-label="사이트 시작 화면" className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h3 className="font-bold">사이트 시작 화면</h3><p className="mt-2 text-sm font-semibold">현재: {settings.direct_entry_enabled?'프로필 선택·PIN 입력':'밴드 코드·공용 비밀번호 입력'}</p><p className="mt-2 text-sm text-slate-600">켜면 사이트 첫 화면에서 우리 밴드 프로필과 개인 PIN으로 바로 로그인합니다. 사이트 방문자는 멤버 목록을 볼 수 있고 새 프로필을 만들 수 있습니다. 개인 PIN 확인은 유지됩니다. 끄면 기존 코드·공용 비밀번호 방식으로 돌아갑니다.</p><ActionForm action={setDirectBandEntryAction} submit={settings.direct_entry_enabled?'프로필 시작 화면 끄기':'프로필 시작 화면 켜기'} className="mt-4 max-w-sm"><input type="hidden" name="enabled" value={settings.direct_entry_enabled?'false':'true'}/></ActionForm></section>}

      {settings.code ? <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h3 className="font-bold">멤버 초대</h3><p className="mt-2 text-sm text-slate-600">링크를 열면 밴드 코드가 자동 입력됩니다. 공용 비밀번호는 따로 전달하세요. 처음 온 멤버는 닉네임·파트·개인 PIN만 만들면 됩니다.</p><ActionForm action={createInviteAction} submit="간편 초대 링크 만들기" className="mt-4"><input type="hidden" name="band_id" value={bandId} /></ActionForm><p className="mt-3 text-xs text-slate-500">이 링크는 여러 멤버가 사용할 수 있습니다. 개인 PIN은 공유하지 마세요.</p></section> : <p className="text-sm text-slate-600">밴드 코드 접속을 먼저 설정하면 간편 초대 링크를 만들 수 있습니다.</p>}

      <details><summary className="cursor-pointer text-sm font-semibold">{settings.code ? '공용 비밀번호 변경' : '밴드 코드 접속 활성화'}</summary><ActionForm action={configureBandLoginAction} submit="접속 설정 저장" className="mt-4 max-w-sm"><BandPasswordField /><p className="text-xs text-slate-500">기존 코드 접속 기기는 다시 로그인해야 합니다. 밴드 코드는 유지됩니다.</p></ActionForm></details>
      {members && <details><summary className="cursor-pointer text-sm font-semibold">다른 멤버 PIN 초기화</summary><ActionForm action={changeMemberPinAction} submit="선택한 멤버 PIN 초기화" className="mt-4 max-w-sm"><label className="grid gap-1 text-sm font-semibold">멤버<select name="member" className="min-h-11 rounded-xl border px-3" required defaultValue=""><option disabled value="">멤버 선택</option>{members.map(member => { const relation = member.profiles; const profile = (Array.isArray(relation) ? relation[0] : relation) as { nickname: string } | null; return <option key={member.id} value={member.id}>{profile?.nickname ?? '멤버'}</option>; })}</select></label><PinField label="새 PIN (숫자 6자리)" /><p className="text-xs text-slate-500">본인 PIN은 내 정보에서 현재 PIN을 입력해 변경하세요. 다른 멤버에게는 새 PIN을 직접 전달하세요.</p></ActionForm></details>}
    </>}
  </Card>;
}

export function MemberPinSettings() {
  return <Card><CardTitle>내 접속 PIN</CardTitle><p className="mt-2 text-sm text-slate-600">밴드 코드로 접속할 때 사용할 숫자 6자리입니다. 처음 설정할 때만 현재 PIN을 비워두세요.</p><ActionForm action={changeMemberPinAction} submit="내 PIN 저장" className="mt-5 max-w-sm"><PinField name="current_pin" label="현재 PIN (처음 설정 시 생략)" required={false} /><PinField label="새 PIN (숫자 6자리)" /></ActionForm></Card>;
}
