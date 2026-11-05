import Link from 'next/link';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { createTestBandAction, addTestMembersAction } from '@/app/band-login-actions';
import { signOutAction } from '@/app/actions';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BandPasswordField, PinField } from '@/components/band-login-fields';
export const instant = false;
export const maxDuration = 60;
export default async function TestBandPage() {
  const db = await createClient();
  const user = db ? await getCurrentUser(db) : null;
  const {data:setup}=user&&db ? await db.rpc('test_band_setup_status') : {data:null};
  const test=setup as {prepared:boolean;members:{nickname:string;part:string}[]}|null;
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-10">
    <Link href="/login" className="text-sm font-semibold text-blue-700">← 밴드 접속</Link>
    <Card><CardTitle>내가 밴드장인 테스트 밴드</CardTitle>
      <p className="mt-3 text-sm leading-6 text-slate-600">본인(밴드장)과 일반 멤버 4명, 총 5명의 테스트 밴드를 만듭니다. 기타 2명·베이스·드럼·보컬의 실력, 일정과 투표가 준비됩니다. 현재 실제 밴드의 데이터는 바뀌지 않습니다.</p>
      {user && test ? <div className="mt-5 space-y-4"><p className="text-sm">{user.nickname} 님이 밴드장입니다. 테스트 멤버 {test.members.length}/4명 준비됨.</p>
       {test.members.length>0&&<ul className="list-inside list-disc text-sm">{test.members.map(m=><li key={m.nickname}>{m.nickname} · {m.part}</li>)}</ul>}
       {test.prepared?<p className="text-sm text-emerald-700">5인 테스트 준비가 완료됐습니다. 다른 브라우저에서 같은 밴드 코드·비밀번호로 들어가 원하는 테스트 프로필을 선택하고, 정해 둔 공통 테스트 PIN을 입력하세요.</p>
       :<><p className="text-sm">이미 만든 1인 테스트 밴드도 여기서 나머지 멤버를 추가할 수 있습니다. 도중 실패했으면 준비된 멤버는 유지하고 이어서 진행합니다. 멤버를 추가하면 추천에도 바로 반영됩니다.</p><ActionForm action={addTestMembersAction} submit="테스트 멤버 추가하고 5인 추천 준비"><BandPasswordField/><PinField name="member_pin" label="테스트 멤버 공통 PIN (내 개인 PIN과 다른 숫자 6자리)"/></ActionForm></>}
       <Link href="/dashboard" className="block text-sm font-semibold text-blue-700">테스트 밴드로 이동</Link>
      </div> : user ? <div className="mt-5 space-y-3"><p className="text-sm">{user.nickname} 님으로 로그인 중입니다. 테스트 밴드를 새로 만들려면 로그아웃하거나 다른 브라우저의 비공개 창에서 이 주소를 여세요. 원래 밴드 코드와 개인 PIN은 따로 보관하세요.</p><form action={signOutAction}><button className="rounded-xl border px-4 py-3 text-sm font-semibold">로그아웃 후 테스트 계정 만들기</button></form><Link href="/dashboard" className="block text-sm text-blue-700">현재 밴드로 돌아가기</Link></div>
      : <ActionForm action={createTestBandAction} submit="테스트 밴드 만들고 밴드장으로 접속" className="mt-6">
        <label className="grid gap-1 text-sm font-semibold">내 테스트 닉네임<Input name="nickname" defaultValue="나(테스트 밴드장)" maxLength={30} required/></label>
        <BandPasswordField/><PinField/><PinField name="member_pin" label="테스트 멤버 공통 PIN (내 개인 PIN과 다른 숫자 6자리)"/>
        <p className="text-xs leading-5 text-slate-500">내 개인 PIN과 일반 멤버들이 사용할 테스트용 공통 PIN을 다르게 정하세요. 생성된 밴드 코드는 밴드 관리에서 확인할 수 있습니다.</p>
      </ActionForm>}
    </Card>
    <Card id="cases"><CardTitle>이 순서로 시험해 보세요</CardTitle><ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6">
      <li>홈과 밴드 관리에서 내가 밴드장인지 확인하고 밴드 코드를 보관하세요.</li>
      <li>일정 추천에서 전원 참석 날짜와 부분 참석 날짜를 비교하세요. 드럼 멤버는 저장된 불가능 날짜가 없습니다.</li>
      <li>곡 추천에서 A는 추천 가능, B는 미투표, C는 반대로 보류, D는 난이도 미등록인지 확인하세요.</li>
      <li>B에 찬성하고 D의 모든 미등록 파트 난이도를 등록한 뒤 추천 결과가 바뀌는지 확인하세요.</li>
      <li>합주 계획에서 날짜만 먼저 확정한 뒤 수정에서 A곡을 추가하세요. 곡 난이도를 바꿔도 확정 계획은 유지됩니다.</li>
      <li>다른 브라우저에서 테스트 멤버로 접속하세요. 후보곡·난이도·내 일정·투표 수정은 가능하고 멤버 관리·최종 확정은 차단돼야 합니다.</li>
    </ol><p className="mt-4 text-xs leading-5 text-slate-500">개인 PIN과 밴드 코드로 다시 접속할 수 있습니다. 테스트 밴드는 자동 삭제되지 않습니다. 도중 실패하면 이 화면에서 이어서 준비할 수 있습니다. 실제 멤버가 합류한 테스트 밴드에는 자동 데이터를 덮어쓰지 않습니다.</p></Card>
  </main>;
}
