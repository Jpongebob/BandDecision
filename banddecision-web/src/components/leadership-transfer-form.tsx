import { ActionForm } from '@/components/action-form';
import { transferLeaderAction } from '@/app/actions';

export function LeadershipTransferForm({ bandId, memberId, nickname }: {
  bandId: string; memberId: string; nickname: string;
}) {
  return <details className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
    <summary className="cursor-pointer text-sm font-bold">이 멤버에게 밴드장 권한 넘기기</summary>
    <p className="mt-3 text-sm leading-6">{nickname} 님이 새 밴드장이 되고, 나는 일반 멤버가 됩니다. 일정·투표·확정 계획은 유지됩니다.</p>
    <ActionForm action={transferLeaderAction} submit="확인하고 밴드장 권한 넘기기" className="mt-4">
      <input type="hidden" name="band_id" value={bandId} />
      <input type="hidden" name="member_id" value={memberId} />

      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm_transfer" value="yes" required className="mt-1" /><span>{nickname} 님에게 권한을 넘기고 내 관리 권한이 해제되는 것을 확인했습니다.</span></label>
    </ActionForm>
  </details>;
}
