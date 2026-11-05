'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import type {FormState} from '@/app/actions';
const date=z.iso.date(),reason=z.string().trim().min(1).max(200);
const text=(f:FormData,k:string)=>String(f.get(k)??'');
function failure(message:string):FormState{
 const code=message.match(/[A-Z_]{4,}/)?.[0]??'';
 const messages:Record<string,string>={FORBIDDEN:'이 작업을 수행할 권한이 없습니다.',INVALID_INPUT:'입력 내용을 확인해 주세요.',DATE_ALREADY_SAVED:'이미 저장된 날짜입니다. 저장된 목록에서 수정하세요.',DATE_NOT_FOUND:'이미 삭제된 날짜입니다. 새로고침 후 확인하세요.',PLANNING_STALE:'멤버·일정·투표가 바뀌었습니다. 최신 내용을 확인하고 다시 저장하세요.',PLAN_STALE:'다른 창에서 계획을 수정했습니다. 새로고침 후 확인하세요.',PLAN_NOT_FOUND:'이미 삭제되었거나 찾을 수 없는 계획입니다.',PLAN_LIMIT_REACHED:'계획은 최대 5개입니다. 기존 계획을 삭제한 뒤 추가하세요.',PARTIAL_ACK_REQUIRED:'불참 멤버를 확인하고 부분 참석에 동의해 주세요.',NO_ATTENDEES:'참석 가능한 멤버가 없습니다.',NO_MEMBERS:'활성 멤버가 없습니다.',SONG_NOT_ELIGIBLE:'추가하려는 곡의 투표·난이도 조건이 바뀌었습니다. 날짜만 먼저 저장할 수도 있습니다.',DATE_OUT_OF_RANGE:'지난 날짜로 새 계획을 만들 수 없습니다.',DUPLICATE_CONFLICT:'같은 날짜를 중복으로 입력하지 마세요.'};
 return{error:messages[code]??'저장하지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'};
}
async function execute(name:string,args:Record<string,unknown>,success:string):Promise<FormState>{
 const db=await createClient();if(!db)return{error:'Supabase 연결 설정을 확인하세요.'};
 const{error}=await db.rpc(name,args);if(error)return failure(error.message);
 revalidatePath('/','layout');return{success};
}
export async function addAvailabilityAction(_:FormState,form:FormData):Promise<FormState>{
 let raw:unknown;try{raw=JSON.parse(text(form,'dates_json'));}catch{return{error:'날짜 목록을 확인하세요.'};}
 const parsed=z.array(z.object({date,reason})).min(1).max(366).safeParse(raw);
 if(!parsed.success)return{error:'날짜와 불참 사유를 입력하세요.'};
 return execute('save_band_unavailability',{p_dates:parsed.data},'날짜를 저장했습니다.');
}
export async function editAvailabilityAction(_:FormState,form:FormData):Promise<FormState>{
 const parsed=z.object({old:date,next:date,reason}).safeParse({old:text(form,'old_date'),next:text(form,'date'),reason:text(form,'reason')});
 if(!parsed.success)return{error:'날짜와 불참 사유를 확인하세요.'};
 return execute('update_band_unavailability',{p_date:parsed.data.old,p_new_date:parsed.data.next,p_reason:parsed.data.reason},'날짜를 수정했습니다.');
}
export async function deleteAvailabilityAction(_:FormState,form:FormData):Promise<FormState>{
 const parsed=date.safeParse(text(form,'date'));if(!parsed.success)return{error:'삭제할 날짜를 확인하세요.'};
 return execute('delete_band_unavailability',{p_date:parsed.data},'날짜를 삭제했습니다.');
}
export async function liveVoteAction(_:FormState,form:FormData):Promise<FormState>{
 const parsed=z.object({song:z.coerce.number().int().positive(),choice:z.enum(['yes','no']),reason:z.string().trim().max(300)}).safeParse({song:text(form,'song_id'),choice:text(form,'choice'),reason:text(form,'reason')});
 if(!parsed.success||parsed.data.choice==='no'&&!parsed.data.reason)return{error:'반대하는 경우 사유를 입력하세요.'};
 return execute('vote_band_song',{p_song:parsed.data.song,p_choice:parsed.data.choice,p_reason:parsed.data.choice==='no'?parsed.data.reason:null},'투표를 저장했습니다.');
}
export async function saveLivePlanAction(_:FormState,form:FormData):Promise<FormState>{
 const parsed=z.object({band:z.uuid(),date,version:z.coerce.number().int().nonnegative(),plan:z.uuid().nullable(),planVersion:z.number().int().positive().nullable(),songs:z.array(z.number().int().positive())}).safeParse({band:text(form,'band_id'),date:text(form,'date'),version:text(form,'version')||-1,plan:text(form,'plan_id')||null,planVersion:text(form,'plan_version')?Number(text(form,'plan_version')):null,songs:form.getAll('song_id').map(Number)});
 if(!parsed.success||new Set(parsed.data.songs).size!==parsed.data.songs.length)return{error:'날짜·곡과 최신 정보를 확인하세요.'};
 const p=parsed.data;
 return execute('save_rehearsal_plan',{p_band:p.band,p_date:p.date,p_song_ids:p.songs,p_expected_version:p.version,p_plan:p.plan,p_expected_plan_version:p.planVersion,p_ack_partial:text(form,'ack_partial')==='true'},p.plan?'계획을 수정했습니다.':'합주 날짜를 확정했습니다.');
}
export async function deleteLivePlanAction(_:FormState,form:FormData):Promise<FormState>{
 const parsed=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),confirm:z.literal('yes')}).safeParse({id:text(form,'plan_id'),version:text(form,'plan_version'),confirm:text(form,'confirm_delete')});
 if(!parsed.success)return{error:'삭제할 계획과 동의를 확인하세요.'};
 return execute('delete_live_plan',{p_plan:parsed.data.id,p_expected_version:parsed.data.version},'계획을 삭제했습니다.');
}
