import { ActionForm } from '@/components/action-form';
import { PinField } from '@/components/band-login-fields';
import { transferLeaderAction } from '@/app/actions';

export function LeadershipTransferForm({ bandId, memberId, nickname, codeLoginEnabled }: {
  bandId: string; memberId: string; nickname: string; codeLoginEnabled: boolean;
}) {
  return <details className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
    <summary className="cursor-pointer text-sm font-bold">이 멤버에게 밴드장 권한 넘기기</summary>
    <p className="mt-3 text-sm leading-6">{nickname} 님이 새 밴드장이 되고, 나는 일반 멤버가 됩니다. 일정·투표·확정 계획은 유지됩니다.</p>
    <ActionForm action={transferLeaderAction} submit="확인하고 밴드장 권한 넘기기" className="mt-4">
      <input type="hidden" name="band_id" value={bandId} />
      <input type="hidden" name="member_id" value={memberId} />
      {codeLoginEnabled && <><PinField name="admin_pin" label="새 관리자 PIN (대상 멤버의 개인 PIN과 다른 숫자 6자리)" /><p className="text-xs leading-5 text-slate-600">새 밴드장에게 이 관리자 PIN을 따로 전달하세요. 새 밴드장은 자기 프로필로 로그인하면 바로 관리할 수 있습니다. 별도 관리자 잠금 해제는 필요하지 않습니다.</p></>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_transfer" value="yes" required className="mt-1" /><span>{nickname} 님에게 권한을 넘기고 내 관리 권한이 해제되는 것을 확인했습니다.</span></label>
    </ActionForm>
  </details>;
}
