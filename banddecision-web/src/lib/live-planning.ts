import {cache} from 'react';
import {twoMonthWindow} from '@/lib/calendar-window';
import {getCurrentUser,getVerifiedAuthUser} from '@/lib/supabase/server';
import {getActiveMember} from '@/lib/band-context';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recommendAvailableDates, recommendSongs } from '@/services/recommendations';
const participant=z.object({id:z.string(),userId:z.string(),nickname:z.string(),part:z.string(),partKey:z.string(),skill:z.number().int().min(1).max(5).nullable()});
const schema=z.object({band_id:z.string(),version:z.number().int().nonnegative(),skill_enabled:z.boolean().optional(),members:z.array(participant),available:z.array(z.object({memberId:z.string(),date:z.iso.date()})),songs:z.array(z.object({id:z.number().int().positive(),title:z.string(),artist:z.string(),confirmedAt:z.string().nullable().optional(),difficulties:z.record(z.string(),z.number()),difficultyMeta:z.record(z.string(),z.object({version:z.number().int().positive(),updatedAt:z.string(),updatedBy:z.string().nullable()})),votes:z.array(z.object({memberId:z.string(),choice:z.enum(['yes','no']),reason:z.string().nullable()}))}))});
export type LivePlanning=z.infer<typeof schema>;
const attendanceSchema=schema.omit({songs:true});
export type AttendancePlanning=z.infer<typeof attendanceSchema>;
type VerifiedPlanningPage<T>={user:NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;member:NonNullable<Awaited<ReturnType<typeof getActiveMember>>['data']>;data:T;plans?:SavedPlan[]};
export function loadVerifiedPlanningPage(db:SupabaseClient,kind:'songs',includePlans?:false,songId?:number):Promise<VerifiedPlanningPage<LivePlanning>|null>;
export function loadVerifiedPlanningPage(db:SupabaseClient,kind:'full',includePlans:true):Promise<VerifiedPlanningPage<LivePlanning|null>|null>;
export function loadVerifiedPlanningPage(db:SupabaseClient,kind?:'full',includePlans?:false):Promise<VerifiedPlanningPage<LivePlanning>|null>;
export function loadVerifiedPlanningPage(db:SupabaseClient,kind:'attendance',includePlans?:boolean):Promise<VerifiedPlanningPage<AttendancePlanning>|null>;
export async function loadVerifiedPlanningPage(db:SupabaseClient,kind:'attendance'|'full'|'songs'='full',includePlans=false,songId:number|null=null):Promise<VerifiedPlanningPage<LivePlanning|AttendancePlanning|null>|null>{
 const verified=await getVerifiedAuthUser(db);if(!verified)return null;
 const membershipPromise=(async()=>{
  const user=await getCurrentUser(db);if(!user)return null;
  const{data:member,error}=await getActiveMember(db,user.id,user.bandContext);
  if(error)throw new Error('DATA_LOAD_FAILED');if(!member)return null;
  return {user,member};
 })();
 const contextPromise=membershipPromise.then(async context=>context?{...context,plans:includePlans?await loadPlans(db,context.member.band_id):undefined}:null);
 const planningRequest=()=>kind==='songs'?db.rpc('band_song_context',{p_song:songId}):db.rpc(kind==='attendance'?'band_attendance_context':'band_planning_context');
 // Members only read confirmed snapshots: do not load all votes, dates and difficulties.
 const planningPromise=includePlans&&kind==='full'
  ?membershipPromise.then(context=>context?.member.role==='leader'?planningRequest():null)
  :planningRequest();
 const[context,result]=await Promise.all([contextPromise,planningPromise]);
 if(!context)return null;
 if(includePlans&&kind==='full'&&context.member.role!=='leader')return {...context,data:null};
 if(!result)throw new Error('DATA_LOAD_FAILED');
 const parsed=(kind==='attendance'?attendanceSchema:schema).safeParse(result.data);
 if(result.error||!parsed.success||parsed.data.band_id!==context.member.band_id)throw new Error('DATA_LOAD_FAILED');
 return {...context,data:parsed.data};
}
export function attendanceRecommendations(data:AttendancePlanning,today:string){
 const{endDate}=twoMonthWindow(today);
 return recommendAvailableDates({participants:data.members,available:data.available,startDate:today,endDate,today});
}
// Compatibility for existing callers; current pages use verified parallel loaders.
export const loadLivePlanning=cache(async(db:SupabaseClient,bandId:string,scope:'full'|'songs'='full',songId:number|null=null)=>{
 const{data,error}=await (scope==='songs'?db.rpc('band_song_context',{p_song:songId}):db.rpc('band_planning_context'));
 const parsed=schema.safeParse(data);
 if(error||!parsed.success||parsed.data.band_id!==bandId)throw new Error('DATA_LOAD_FAILED');
 return parsed.data;
});
export function liveRecommendations(data:LivePlanning,today:string){
 const{endDate}=twoMonthWindow(today);
 return {dates:recommendAvailableDates({participants:data.members,available:data.available,startDate:today,endDate,today}),songs:recommendSongs(data.members,data.songs,data.skill_enabled===true)};
}
export type SavedPlan={id:string;version:number;rehearsal_date:string;location?:string|null;memo?:string|null;starts_at:string;ends_at:string;participant_count:number;attendee_count:number;confirmed_plan_members:{id:string;nickname_snapshot:string;part_snapshot:string;attending:boolean;reason_snapshot:string|null}[];confirmed_plan_songs:{id:string;source_song_id:number|null;title_snapshot:string;artist_snapshot:string;display_order:number}[]};
export async function loadPlans(db:SupabaseClient,bandId:string):Promise<SavedPlan[]>{
 const{data,error}=await db.from('confirmed_plans').select('id,version,rehearsal_date,location,memo,starts_at,ends_at,participant_count,attendee_count,confirmed_plan_members(id,nickname_snapshot,part_snapshot,attending,reason_snapshot),confirmed_plan_songs(id,source_song_id,title_snapshot,artist_snapshot,display_order)').eq('band_id',bandId).order('rehearsal_date').order('confirmed_at').order('id');
 if(error)throw new Error('DATA_LOAD_FAILED');
 return (data??[]) as SavedPlan[];
}
export function seoulToday(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});}

export async function loadHomeContext(db:SupabaseClient){
 const{data,error}=await db.rpc('band_home_context');
 const nextPlan=z.object({id:z.string(),rehearsal_date:z.iso.date(),location:z.string().nullable(),memo:z.string().nullable(),starts_at:z.string(),ends_at:z.string(),participant_count:z.number().int().nonnegative(),attendee_count:z.number().int().nonnegative(),confirmed_plan_songs:z.array(z.object({title_snapshot:z.string()}))});
 const parsed=z.object({upcoming_plan_count:z.number().int().nonnegative(),next_plan:nextPlan.nullable(),upcoming_plans:z.array(nextPlan).max(3).optional(),member_count:z.number().int().nonnegative()}).safeParse(data);
 if(error||!parsed.success)throw new Error('DATA_LOAD_FAILED');return {...parsed.data,upcoming_plans:parsed.data.upcoming_plans??(parsed.data.next_plan?[parsed.data.next_plan]:[])};
}
