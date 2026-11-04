import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BandPasswordField, PinField, ProfileFields } from '@/components/band-login-fields';
import { createCodeBandAction } from '@/app/band-login-actions';

export default function NewCodeBandPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] px-4 py-10"><Card className="w-full max-w-lg">
    <CardTitle className="text-2xl">우리 밴드 만들기</CardTitle>
    <p className="mt-2 text-sm text-slate-600">밴드 코드가 자동으로 발급되고, 만든 사람이 밴드장이 됩니다.</p>
    <ActionForm action={createCodeBandAction} submit="밴드 만들기" className="mt-6">
      <label className="grid gap-1 text-sm font-semibold">밴드명<Input name="name" minLength={2} maxLength={40} required /></label>
      <BandPasswordField /><ProfileFields /><PinField name="admin_pin" label="관리자 PIN (내 PIN과 다른 숫자 6자리)" />
      <p className="text-xs leading-5 text-slate-500">밴드 코드·공용 비밀번호는 멤버들에게 공유하세요. 내 PIN과 관리자 PIN은 별도로 보관하세요. 관리자 PIN은 멤버 관리와 최종 확정 때 사용합니다.</p>
    </ActionForm>
    <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-blue-700">이미 밴드가 있나요? 접속하기</Link>
  </Card></main>;
}
