'use server';
import { prepareTestMembers } from '@/lib/test-band-provision';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { FormState } from '@/app/actions';
import { createClient } from '@/lib/supabase/server';
import { anonymousSignInError } from '@/lib/auth-errors';
import { bandCodeSchema, bandLoginErrors, bandPasswordSchema, createCodeBandSchema, pinSchema, profileInputSchema } from '@/lib/band-login-validation';

type Database = NonNullable<Awaited<ReturnType<typeof createClient>>>;
function fields(form: FormData) { return Object.fromEntries(form.entries()); }
function responseError(error: { message: string } | null, data: unknown): FormState | null {
  if (error) return { error: '요청을 완료하지 못했습니다. 연결과 데이터베이스 설정을 확인한 뒤 다시 시도해 주세요.' };
  const result = data as { error?: string; ok?: boolean } | null;
  if (result?.error) return { error: bandLoginErrors[result.error] ?? '요청을 처리하지 못했습니다.' };
  if (!result?.ok) return { error: '처리 결과를 확인하지 못했습니다. 다시 시도해 주세요.' };
  return null;
}
async function guestClient(): Promise<{ client: Database | null; error?: string }> {
  const client = await createClient();
  if (!client) return { client: null, error: 'Supabase 연결 설정이 필요합니다.' };
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (user && !user.is_anonymous) return { client: null, error: '다른 접속 세션에서 먼저 로그아웃하세요.' };
  if (!user || authError) {
    const { error } = await client.auth.signInAnonymously();
    if (error) return { client: null, error: anonymousSignInError(error) };
  }
  return { client };
}
async function execute(name: string, args: Record<string, unknown>): Promise<FormState | null> {
  const client = await createClient();
  if (!client) return { error: 'Supabase 연결 설정이 필요합니다.' };
  const { data, error } = await client.rpc(name, args);
  return responseError(error, data);
}
function refreshIdentity() { revalidatePath('/', 'layout'); }

export async function beginBandAccessAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ code: bandCodeSchema, password: bandPasswordSchema }).safeParse(fields(form));
  if (!parsed.success) return { error: '밴드 코드 10자리와 4자 이상의 공용 비밀번호를 확인하세요.' };
  const guest = await guestClient();
  if (!guest.client) return { error: guest.error };
  const { data, error } = await guest.client.rpc('begin_band_access', { p_code: parsed.data.code, p_password: parsed.data.password });
  const failure = responseError(error, data);
  if (failure) return failure;
  redirect('/login/member');
}
export async function createCodeBandAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = createCodeBandSchema.safeParse(fields(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '입력 내용을 확인하세요.' };
  const guest = await guestClient();
  if (!guest.client) return { error: guest.error };
  const { name, nickname, part, password, pin, admin_pin } = parsed.data;
  const { data, error } = await guest.client.rpc('create_code_band', { p_name: name, p_nickname: nickname, p_part: part, p_password: password, p_pin: pin, p_admin_pin: admin_pin });
  const failure = responseError(error, data);
  if (failure) return failure;
  refreshIdentity();
  redirect('/settings/band');
}
export async function memberPinLoginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ member: z.uuid(), pin: pinSchema }).safeParse(fields(form));
  if (!parsed.success) return { error: '내 프로필과 숫자 6자리 PIN을 입력하세요.' };
  const failure = await execute('member_pin_login', { p_member: parsed.data.member, p_pin: parsed.data.pin });
  if (failure) return failure;
  refreshIdentity();
  redirect('/dashboard');
}
export async function registerBandProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = profileInputSchema.safeParse(fields(form));
  if (!parsed.success) return { error: '닉네임·파트·숫자 6자리 PIN을 확인하세요.' };
  const failure = await execute('register_band_profile', { p_nickname: parsed.data.nickname, p_part: parsed.data.part, p_pin: parsed.data.pin });
  if (failure) return failure;
  refreshIdentity();
  redirect('/dashboard');
}
export async function unlockBandAdminAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = pinSchema.safeParse(form.get('admin_pin'));
  if (!parsed.success) return { error: '관리자 PIN은 숫자 6자리입니다.' };
  const failure = await execute('unlock_band_admin', { p_pin: parsed.data });
  if (failure) return failure;
  refreshIdentity();
  return { success: '밴드장은 로그인 상태에서 별도 관리자 잠금 해제 없이 관리할 수 있습니다.' };
}
export async function configureBandLoginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ password: bandPasswordSchema, admin_pin: pinSchema }).safeParse(fields(form));
  if (!parsed.success) return { error: '공용 비밀번호와 숫자 6자리 관리자 PIN을 확인하세요.' };
  const failure = await execute('configure_band_login', { p_password: parsed.data.password, p_admin_pin: parsed.data.admin_pin });
  if (failure) return failure;
  refreshIdentity();
  return { success: '밴드 접속 설정을 저장했습니다. 기존 코드 접속 기기는 다시 로그인해야 합니다.' };
}
export async function changeMemberPinAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({
    pin: pinSchema,
    current_pin: z.union([pinSchema, z.literal('')]).optional(),
    member: z.union([z.uuid(), z.literal('')]).optional(),
  }).safeParse(fields(form));
  if (!parsed.success) return { error: 'PIN은 숫자 6자리로 입력하세요.' };
  const failure = await execute('change_member_pin', { p_pin: parsed.data.pin, p_current_pin: parsed.data.current_pin || null, p_member: parsed.data.member || null });
  if (failure) return failure;
  refreshIdentity();
  return { success: 'PIN을 저장했습니다. 이 멤버의 다른 기기는 로그아웃됩니다.' };
}


export async function createTestBandAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ nickname: z.string().trim().min(1).max(30), password: bandPasswordSchema, pin: pinSchema, member_pin: pinSchema }).refine(data=>data.pin!==data.member_pin).safeParse(fields(form));
  if (!parsed.success) return { error: '닉네임, 4자 이상 공용 비밀번호, 숫자 6자리 개인 PIN과 다른 테스트 멤버 PIN을 확인하세요.' };
  const guest = await guestClient();
  if (!guest.client) return { error: guest.error };
  const { data, error } = await guest.client.rpc('create_test_band', {
    p_nickname: parsed.data.nickname, p_password: parsed.data.password, p_pin: parsed.data.pin,
  });
  const failure = responseError(error, data);
  if (failure) return failure;
  const setupError=await prepareTestMembers(guest.client,parsed.data.password,parsed.data.member_pin);
  refreshIdentity();
  if(setupError)redirect('/bands/test?notice=setup_incomplete');
  redirect('/dashboard');
}

export async function addTestMembersAction(_: FormState, form: FormData): Promise<FormState> {
 const parsed=z.object({password:bandPasswordSchema,member_pin:pinSchema}).safeParse(fields(form));
 if(!parsed.success)return {error:'공용 비밀번호와 테스트 멤버용 숫자 6자리 PIN을 입력하세요.'};
 const client=await createClient();if(!client)return {error:'Supabase 연결 설정이 필요합니다.'};
 const failure=await prepareTestMembers(client,parsed.data.password,parsed.data.member_pin);
 refreshIdentity();
 if(failure)return {error:failure};
 redirect('/dashboard');
}
