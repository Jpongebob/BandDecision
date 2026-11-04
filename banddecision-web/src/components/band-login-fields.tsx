import { Input } from '@/components/ui/input';

export function PinField({ name = 'pin', label = '내 PIN (숫자 6자리)', required = true }: { name?: string; label?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold">{label}<Input name={name} type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="off" required={required} /></label>;
}
export function BandPasswordField() {
  return <label className="grid gap-1 text-sm font-semibold">공용 비밀번호 (4자 이상)<Input name="password" type="password" minLength={4} maxLength={64} autoComplete="off" required /></label>;
}
export function ProfileFields() {
  return <><label className="grid gap-1 text-sm font-semibold">닉네임<Input name="nickname" autoComplete="nickname" maxLength={30} required /></label><label className="grid gap-1 text-sm font-semibold">담당 파트<Input name="part" placeholder="기타, 보컬, 드럼…" maxLength={30} required /></label><PinField /></>;
}
