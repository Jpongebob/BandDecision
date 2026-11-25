'use server';


import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { bandCodeSchema } from '@/lib/band-login-validation';

export type FormState={error?:string;success?:string};
function value(form:FormData,key:string){return String(form.get(key)??'').trim();}
function siteOrigin(){const configured=process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/,'');if(configured)return configured;const vercelHost=process.env.VERCEL_URL?.trim();return vercelHost?`https://${vercelHost}`:'http://localhost:3000';}
function errorText(error:{message:string;code?:string}){const code=error.message.match(/[A-Z_]{4,}/)?.[0]??error.code;const map:Record<string,string>={PLAN_LIMIT_REACHED:'서버에 합주 개수 제한 해제 SQL(030)을 먼저 적용해 주세요.',PLAN_NOT_FOUND:'이미 삭제되었거나 찾을 수 없는 계획입니다.',ALREADY_IN_BAND:'이미 활성 밴드에 가입되어 있습니다.',FORBIDDEN:'이 작업을 수행할 권한이 없습니다.',INVITE_INVALID:'초대 링크를 확인해 주세요.',INVITE_USED:'이미 사용한 초대 링크입니다.',INVITE_EXPIRED:'만료된 초대 링크입니다.',INVALID_INPUT:'입력 내용을 확인해 주세요.',ROUND_INVALID:'현재 진행 중인 회차가 없습니다.',ROUND_STALE:'정보가 변경되었습니다. 최신 정보를 확인해 주세요.',SUBMISSIONS_PENDING:'모든 참여자가 일정을 제출해야 합니다.',DATE_OUT_OF_RANGE:'선택할 수 없는 날짜입니다.',NO_ATTENDEES:'참석 가능한 멤버가 없습니다.',PARTIAL_ACK_REQUIRED:'부분 참석 확인이 필요합니다.',DIFFICULTY_STALE:'다른 멤버가 난이도를 수정했습니다. 최신 정보를 불러온 뒤 다시 수정해 주세요.',SONG_NOT_ELIGIBLE:'추천 조건을 충족하지 않는 곡이 있습니다.',TRANSFER_LEADERSHIP_REQUIRED:'밴드장 권한을 먼저 이전해 주세요.',INVALID_TARGET:'현재 밴드의 활성 일반 멤버를 선택해 주세요.',TARGET_PIN_REQUIRED:'대상 멤버의 개인 PIN을 먼저 설정해 주세요.',OUTSIDE_ACK_REQUIRED:'회차 밖 날짜 저장 동의가 필요합니다.',DUPLICATE_CONFLICT:'같은 날짜의 사유가 서로 다릅니다. 하나로 정리해 주세요.'};return map[code??'']??'요청을 완료하지 못했습니다. 연결 상태와 서버 설정을 확인하고 다시 시도해 주세요.';}
async function clientOrError(){const client=await createClient();if(!client)return{client:null,error:'Supabase URL과 anon key를 .env.local에 설정해 주세요.'};return{client,error:null};}

export async function signOutAction(){const{client}=await clientOrError();if(client){const{error}=await client.rpc('end_band_session');if(error)throw new Error('로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.');await client.auth.signOut();}redirect('/login');}

export async function createInviteAction(_: FormState, form: FormData): Promise<FormState> {
  const bandId = value(form, 'band_id');
  const { client, error } = await clientOrError();
  if (!client) return { error: error! };
  const [identityResult, settingsResult] = await Promise.all([
    client.rpc('current_band_identity'),
    client.rpc('band_login_settings'),
  ]);
  if (identityResult.error || settingsResult.error) return { error: '초대 설정을 불러오지 못했습니다. 연결과 인증 마이그레이션 적용 여부를 확인하세요.' };
  const identity = identityResult.data as { band_id?: string } | null;
  const settings = settingsResult.data as { role?: string; admin_unlocked?: boolean; code?: string | null } | null;
  if (identity?.band_id !== bandId || settings?.role !== 'leader') {
    return { error: '멤버 초대는 현재 밴드의 밴드장만 가능합니다.' };
  }
  if (settings.code) {
    const code = bandCodeSchema.safeParse(settings.code);
    if (!code.success) return { error: '밴드 코드 설정을 확인하세요.' };
    return { success: siteOrigin() + '/login?code=' + encodeURIComponent(code.data) };
  }
  return { error: '밴드 코드 접속을 먼저 설정해 주세요.' };
}
export async function startRoundAction(_:FormState,form:FormData):Promise<FormState>{const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('start_round',{p_band:value(form,'band_id')});if(rpcError)return{error:errorText(rpcError)};revalidatePath('/dashboard');revalidatePath('/schedule');redirect('/schedule');}
export async function submitUnavailableAction(_:FormState,form:FormData):Promise<FormState>{
 const round=value(form,'round_id'),ack=value(form,'ack_outside')==='true';let dates:unknown;
 try{dates=JSON.parse(value(form,'dates_json'));}catch{return{error:'날짜 목록을 확인해 주세요.'};}
 const parsed=z.array(z.object({date:z.iso.date(),reason:z.string().trim().min(1).max(200)})).max(366).safeParse(dates);
 if(!z.uuid().safeParse(round).success||!parsed.success)return{error:'회차와 날짜·불참 사유를 확인해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('save_unavailability',{p_round:round,p_dates:parsed.data,p_ack_outside:ack});
 if(rpcError)return{error:errorText(rpcError)};revalidatePath('/schedule');revalidatePath('/schedule/recommendations');revalidatePath('/plans');return{success:'일정을 저장했습니다.'};
}
export async function addSongAction(_:FormState,form:FormData):Promise<FormState>{const title=value(form,'title'),artist=value(form,'artist'),band=value(form,'band_id');if(title.length<1||title.length>120||artist.length<1||artist.length>120)return{error:'곡 제목과 아티스트를 1~120자로 입력해 주세요.'};const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('add_song',{p_band:band,p_title:title,p_artist:artist});if(rpcError)return{error:errorText(rpcError)};revalidatePath('/songs');revalidatePath('/songs/recommendations');revalidatePath('/plans');return{success:'후보곡을 추가했습니다.'};}
export async function difficultyAction(_:FormState,form:FormData):Promise<FormState>{
 const songId=Number(value(form,'song_id')),difficulty=Number(value(form,'difficulty')),expectedVersion=Number(value(form,'expected_version')),part=value(form,'part_key');
 if(!Number.isSafeInteger(songId)||songId<1||!Number.isInteger(difficulty)||difficulty<1||difficulty>5||!Number.isInteger(expectedVersion)||expectedVersion<0||!part)return{error:'곡·파트·난이도(1~5)와 수정 버전을 확인해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('update_song_difficulty',{p_song:songId,p_part:part,p_difficulty:difficulty,p_expected_version:expectedVersion});
 if(rpcError)return{error:errorText(rpcError)};
 revalidatePath('/songs');revalidatePath(`/songs/${songId}`);revalidatePath('/songs/recommendations');revalidatePath('/plans');
 return{success:'난이도를 저장했어요.'};
}
export async function voteAction(_:FormState,form:FormData):Promise<FormState>{
 const round=value(form,'round_id'),song=Number(value(form,'song_id')),choice=value(form,'choice'),reason=value(form,'reason');
 if(!z.uuid().safeParse(round).success||!Number.isSafeInteger(song)||song<1||!['yes','no'].includes(choice)||(choice==='no'&&(reason.length<1||reason.length>300)))return{error:'회차·곡·찬반을 확인하고 반대 시 사유를 입력해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('cast_vote',{p_round:round,p_song:song,p_choice:choice,p_reason:choice==='no'?reason:null});
 if(rpcError)return{error:errorText(rpcError)};revalidatePath('/songs');revalidatePath('/songs/recommendations');revalidatePath('/plans');return{success:'투표를 저장했습니다.'};
}
export async function confirmPlanAction(_:FormState,form:FormData):Promise<FormState>{
 const ids=form.getAll('song_id').map(Number),round=value(form,'round_id'),date=value(form,'date'),versionRaw=value(form,'version'),version=Number(versionRaw);
 if(!ids.length)return{error:'추천 곡을 하나 이상 선택해 주세요.'};
 if(!z.uuid().safeParse(round).success||!z.iso.date().safeParse(date).success||!/^\d+$/.test(versionRaw)||!Number.isSafeInteger(version)||version<0||ids.some(id=>!Number.isSafeInteger(id)||id<1)||new Set(ids).size!==ids.length)return{error:'회차·날짜·곡 선택과 최신 버전을 확인해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('confirm_rehearsal_plan',{p_round:round,p_date:date,p_song_ids:ids,p_expected_version:version,p_ack_partial:value(form,'ack_partial')==='true'});
 if(rpcError)return{error:errorText(rpcError)};revalidatePath('/plans');revalidatePath('/dashboard');redirect('/plans');
}
export async function skillAction(_:FormState,form:FormData):Promise<FormState>{
 const member=value(form,'member_id'),raw=value(form,'skill'),skill=raw===''?null:Number(raw);
 if(!z.uuid().safeParse(member).success||(skill!==null&&(!Number.isInteger(skill)||skill<1||skill>5)))return{error:'멤버와 실력(1~5)을 확인해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('update_member_skill',{p_member:member,p_skill:skill});
 if(rpcError)return{error:errorText(rpcError)};revalidatePath('/','layout');return{success:'실력을 수정했습니다.'};
}
export async function partAction(_:FormState,form:FormData):Promise<FormState>{const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('update_member_part',{p_member:value(form,'member_id'),p_part:value(form,'part')});if(rpcError)return{error:errorText(rpcError)};revalidatePath('/','layout');return{success:'파트를 변경했습니다. 추천에 바로 반영됩니다.'};}
export async function transferLeaderAction(_: FormState, form: FormData): Promise<FormState> {
  if (value(form, 'confirm_transfer') !== 'yes') return { error: '밴드장 권한 이양 내용을 확인하고 동의해 주세요.' };
  const parsed = z.object({ band: z.uuid(), member: z.uuid() })
    .safeParse({ band: value(form, 'band_id'), member: value(form, 'member_id') });
  if (!parsed.success) return { error: '권한을 넘길 대상 멤버를 확인해 주세요.' };
  const { client, error } = await clientOrError();
  if (!client) return { error: error! };
  const { error: rpcError } = await client.rpc('transfer_leadership', {
    p_band: parsed.data.band, p_member: parsed.data.member,
  });
  if (rpcError) return { error: errorText(rpcError) };
  revalidatePath('/', 'layout');
  redirect('/settings/band?notice=leadership_transferred');
}
export async function removeMemberAction(_:FormState,form:FormData):Promise<FormState>{if(value(form,'confirm_remove')!=='yes'||!z.uuid().safeParse(value(form,'member_id')).success)return{error:'내보낼 멤버와 확인 내용을 확인하세요.'};const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('remove_member',{p_member:value(form,'member_id')});if(rpcError)return{error:errorText(rpcError)};revalidatePath('/','layout');return{success:'멤버를 내보냈습니다.'};}
export async function leaveBandAction(){
 const{client}=await clientOrError();if(!client)return;
 const{error}=await client.rpc('leave_band');if(error)redirect('/settings/band?notice=leave_failed');
 await client.auth.signOut();revalidatePath('/','layout');redirect('/login');
}
export async function requestDeletionAction(_:FormState):Promise<FormState>{void _;const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('request_account_deletion');return rpcError?{error:errorText(rpcError)}:{success:'계정 삭제 요청을 접수했습니다. 운영자가 정책에 따라 처리합니다.'};}
export async function profileAction(_:FormState,form:FormData):Promise<FormState>{const nick=value(form,'nickname');if(nick.length<1||nick.length>30)return{error:'닉네임은 1~30자로 입력해 주세요.'};const{client,error}=await clientOrError();if(!client)return{error:error!};const{error:rpcError}=await client.rpc('update_my_nickname',{p_nickname:nick});if(rpcError)return{error:errorText(rpcError)};revalidatePath('/','layout');return{success:'프로필을 저장했습니다.'};}


export async function deletePlanAction(_:FormState,form:FormData):Promise<FormState>{
 const id=value(form,'plan_id');
 if(!z.uuid().safeParse(id).success||value(form,'confirm_delete')!=='yes')return{error:'삭제할 계획과 삭제 동의를 확인해 주세요.'};
 const{client,error}=await clientOrError();if(!client)return{error:error!};
 const{error:rpcError}=await client.rpc('delete_rehearsal_plan',{p_plan:id});
 if(rpcError)return{error:errorText(rpcError)};
 revalidatePath('/plans');revalidatePath('/dashboard');return{success:'합주 계획을 삭제했습니다.'};
}
