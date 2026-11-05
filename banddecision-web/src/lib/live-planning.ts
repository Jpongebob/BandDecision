import {getCurrentUser,getVerifiedAuthUser} from '@/lib/supabase/server';
import {getActiveMember} from '@/lib/band-context';
import { cache } from 'react';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recommendDates, recommendSongs } from '@/services/recommendations';
const participant=z.object({id:z.string(),userId:z.string(),nickname:z.string(),part:z.string(),partKey:z.string(),skill:z.number().int().min(1).max(5).nullable()});
const schema=z.object({band_id:z.string(),version:z.number().int().nonnegative(),members:z.array(participant),unavailable:z.array(z.object({memberId:z.string(),date:z.iso.date(),reason:z.string()})),songs:z.array(z.object({id:z.number().int().positive(),title:z.string(),artist:z.string(),confirmedAt:z.string().nullable().optional(),difficulties:z.record(z.string(),z.number()),difficultyMeta:z.record(z.string(),z.object({version:z.number().int().positive(),updatedAt:z.string(),updatedBy:z.string().nullable()})),votes:z.array(z.object({memberId:z.string(),choice:z.enum(['yes','no']),reason:z.string().nullable()}))}))});
export type LivePlanning=z.infer<typeof schema>;
const attendanceSchema=schema.omit({songs:true});
export type AttendancePlanning=z.infer<typeof attendanceSchema>;
export async function loadVerifiedPlanningPage(db:SupabaseClient,kind:'attendance'|'full'='full'){
 // No private RPC is started until server-side getUser has succeeded.
 const verified=await getVerifiedAuthUser(db);if(!verified)return null;
 const[user,result]=await Promise.all([getCurrentUser(db),db.rpc(kind==='attendance'?'band_attendance_context':'band_planning_context')]);
 if(!user)return null;
 const{data:member,error}=await getActiveMember(db,user.id,user.bandContext);
 if(error)throw new Error('DATA_LOAD_FAILED');if(!member)return null;
 const parsed=(kind==='attendance'?attendanceSchema:schema).safeParse(result.data);
 if(result.error||!parsed.success||parsed.data.band_id!==member.band_id)throw new Error('DATA_LOAD_FAILED');
 return {user,member,data:parsed.data};
}
export function attendanceRecommendations(data:AttendancePlanning,today:string){
 const endDate=new Date(Date.parse(today+'T00:00:00Z')+59*86400000).toISOString().slice(0,10);
 return recommendDates({participants:data.members,unavailable:data.unavailable,submittedIds:data.members.map(m=>m.id),startDate:today,endDate,today});
}
export async function loadMemberCount(db:SupabaseClient,bandId:string):Promise<number>{
 const{count,error}=await db.from('band_members').select('id',{count:'exact',head:true}).eq('band_id',bandId).eq('status','active');
 if(error||typeof count!=='number')throw new Error('DATA_LOAD_FAILED');return count;
}
export type PlanSummary=Pick<SavedPlan,'id'|'rehearsal_date'|'starts_at'|'ends_at'|'participant_count'|'attendee_count'>&{confirmed_plan_songs:{title_snapshot:string}[]};
export async function loadPlanSummaries(db:SupabaseClient,bandId:string,today:string):Promise<PlanSummary[]>{
 const{data,error}=await db.from('confirmed_plans').select('id,rehearsal_date,starts_at,ends_at,participant_count,attendee_count,confirmed_plan_songs(title_snapshot)').eq('band_id',bandId).gte('rehearsal_date',today).order('rehearsal_date').order('confirmed_at').order('id');
 if(error)throw new Error('DATA_LOAD_FAILED');return (data??[]) as PlanSummary[];
}

export const loadLivePlanning=cache(async(db:SupabaseClient,bandId:string)=>{
 const{data,error}=await db.rpc('band_planning_context');
 const parsed=schema.safeParse(data);
 if(error||!parsed.success||parsed.data.band_id!==bandId)throw new Error('DATA_LOAD_FAILED');
 return parsed.data;
});
export function liveRecommendations(data:LivePlanning,today:string){
 const endDate=new Date(Date.parse(today+'T00:00:00Z')+59*86400000).toISOString().slice(0,10);
 return {dates:recommendDates({participants:data.members,unavailable:data.unavailable,submittedIds:data.members.map(m=>m.id),startDate:today,endDate,today}),songs:recommendSongs(data.members,data.songs)};
}
export type SavedPlan={id:string;version:number;rehearsal_date:string;starts_at:string;ends_at:string;participant_count:number;attendee_count:number;confirmed_plan_members:{id:string;nickname_snapshot:string;part_snapshot:string;attending:boolean;reason_snapshot:string|null}[];confirmed_plan_songs:{id:string;source_song_id:number|null;title_snapshot:string;artist_snapshot:string;display_order:number}[]};
export async function loadPlans(db:SupabaseClient,bandId:string):Promise<SavedPlan[]>{
 const{data,error}=await db.from('confirmed_plans').select('*,confirmed_plan_members(*),confirmed_plan_songs(*)').eq('band_id',bandId).order('rehearsal_date').order('confirmed_at').order('id');
 if(error)throw new Error('DATA_LOAD_FAILED');
 return (data??[]) as SavedPlan[];
}
export function seoulToday(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});}

export async function loadHomeContext(db:SupabaseClient){
 const{data,error}=await db.rpc('band_home_context');
 const parsed=z.object({member_count:z.number().int().nonnegative(),pending_votes:z.number().int().nonnegative(),unset_skills:z.number().int().nonnegative(),my_skill:z.number().int().min(1).max(5).nullable(),upcoming_unavailable:z.array(z.iso.date())}).safeParse(data);
 if(error||!parsed.success)throw new Error('DATA_LOAD_FAILED');return parsed.data;
}
