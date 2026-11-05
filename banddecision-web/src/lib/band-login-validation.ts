import { z } from 'zod';

export const pinSchema = z.string().transform(value=>value.replace(/\s/g,'' )).pipe(z.string().regex(/^[0-9]{6}$/, 'PIN은 숫자 6자리로 입력해 주세요.'));
export const bandPasswordSchema = z.string().trim().min(4).max(64)
  .refine(value => new TextEncoder().encode(value).length <= 72, '비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.');
export const bandCodeSchema = z.string().transform(value=>value.replace(/\s/g,'').toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{10}$/));
export const profileInputSchema = z.object({
  nickname: z.string().trim().min(1).max(30),
  part: z.string().trim().min(1).max(30),
  pin: pinSchema,
});
export const createCodeBandSchema = profileInputSchema.extend({
  name: z.string().trim().min(2).max(40),
  password: bandPasswordSchema,
  admin_pin: pinSchema,
}).refine(data => data.pin !== data.admin_pin, { message: '내 PIN과 관리자 PIN은 다르게 설정해 주세요.' });

export const bandLoginErrors: Record<string, string> = {
  BAD_BAND_CREDENTIALS: '밴드 코드 또는 공용 비밀번호를 확인해 주세요.',
  BAD_PIN: '개인 PIN을 확인해 주세요. PIN을 잊었다면 밴드장에게 초기화를 요청하세요.',
  BAND_ACCESS_EXPIRED: '밴드 접속 시간이 만료됐습니다. 밴드 코드부터 다시 입력해 주세요.',
  RATE_LIMITED: '입력 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.',
  DUPLICATE_NICKNAME: '이미 사용 중인 닉네임입니다. 기존 프로필을 선택하거나 다른 닉네임을 입력하세요.',
  FORBIDDEN: '현재 밴드에서 이 작업을 수행할 권한이 없습니다.',
  ALREADY_SIGNED_IN: '이미 로그인 중입니다. 다른 프로필을 사용하려면 먼저 로그아웃하세요.',
  GUEST_SESSION_REQUIRED: '기존 계정에서 로그아웃한 뒤 밴드 코드로 접속해 주세요.',
  UNAUTHENTICATED: '로그인이 필요합니다.',
  INVALID_INPUT: '입력 내용을 확인해 주세요. PIN은 숫자 6자리이며 내 PIN과 관리자 PIN은 달라야 합니다.',
};
