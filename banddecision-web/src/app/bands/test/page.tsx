import Link from 'next/link';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createTestBandAction } from '@/app/band-login-actions';
import { signOutAction } from '@/app/actions';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BandPasswordField, PinField } from '@/components/band-login-fields';
export const instant = false;
export default async function TestBandPage() {
  const db = await createClient();
  const user = db ? await getCurrentUser(db) : null;
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
    <Link href="/login" className="text-sm font-semibold text-blue-700">← 밴드 접속</Link>
    <Card><CardTitle>내가 밴드장인 테스트 밴드</CardTitle>
      <p className="mt-3 text-sm leading-6 text-slate-600">별도의 1인 테스트 밴드를 만듭니다. 현재 밴드의 데이터는 바뀌지 않습니다. 테스트 곡 4개와 불가능 날짜 2개가 준비되며, 원하면 다른 기기에서 멤버를 추가할 수 있습니다.</p>
      {user ? <div className="mt-5 space-y-3"><p className="text-sm">{user.nickname} 님으로 로그인 중입니다. 테스트 밴드를 새로 만들려면 로그아웃하거나 다른 브라우저의 비공개 창에서 이 주소를 여세요. 원래 밴드 코드와 개인 PIN은 따로 보관하세요.</p><form action={signOutAction}><button className="rounded-xl border px-4 py-3 text-sm font-semibold">로그아웃 후 테스트 계정 만들기</button></form><Link href="/dashboard" className="block text-sm text-blue-700">현재 밴드로 돌아가기</Link></div>
      : <ActionForm action={createTestBandAction} submit="테스트 밴드 만들고 밴드장으로 접속" className="mt-6">
        <label className="grid gap-1 text-sm font-semibold">내 테스트 닉네임<Input name="nickname" defaultValue="나(테스트 밴드장)" maxLength={30} required/></label>
        <BandPasswordField/><PinField/>
        <p className="text-xs leading-5 text-slate-500">테스트용 비밀번호와 PIN을 직접 정하세요. 생성된 밴드 코드는 밴드 관리에서 확인할 수 있습니다.</p>
      </ActionForm>}
    </Card>
    <Card id="cases"><CardTitle>이 순서로 시험해 보세요</CardTitle><ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6">
      <li>홈과 밴드 관리에서 내가 밴드장인지 확인하고 밴드 코드를 보관하세요.</li>
      <li>일정에서 3일 뒤·7일 뒤의 불가능 날짜와 사유를 확인하고 빠른 날짜 추가로 변경·제출하세요.</li>
      <li>곡 추천에서 A는 추천 가능, B는 미투표, C는 반대로 보류, D는 난이도 미등록인지 확인하세요.</li>
      <li>B에 찬성하고 D의 기타 난이도를 등록한 뒤 추천 결과가 바뀌는지 확인하세요.</li>
      <li>합주 계획에서 가능한 날짜와 A를 선택해 미리보기 후 확정하세요. 곡 난이도를 바꿔도 확정 계획은 유지됩니다.</li>
      <li>여러 명을 시험하려면 간편 초대 링크와 공용 비밀번호를 다른 기기에 전달하세요. 새 멤버가 등록되면 새 회차를 시작해야 함께 참여합니다.</li>
    </ol><p className="mt-4 text-xs leading-5 text-slate-500">개인 PIN과 밴드 코드로 다시 접속할 수 있습니다. 테스트 밴드는 자동 삭제되지 않습니다. 생성·기본 제출에 실패하면 전체 생성 작업이 취소됩니다.</p></Card>
  </main>;
}
