import {z} from 'zod';
import {createClient,getCurrentUser} from '@/lib/supabase/server';
import {getBandContext} from '@/lib/band-context';
import {planIcs} from '@/lib/calendar-export';

const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(_request:Request,{params}:{params:Promise<{planId:string}>}){
 const{planId}=await params;
 if(!z.uuid().safeParse(planId).success)return new Response('잘못된 합주 주소입니다.',{status:400,headers:privateHeaders});
 const db=await createClient();if(!db)return new Response('연결 설정을 확인해 주세요.',{status:503,headers:privateHeaders});
 const user=await getCurrentUser(db);if(!user)return new Response('웹사이트에 로그인한 뒤 캘린더를 다시 열어 주세요.',{status:401,headers:privateHeaders});
 const context=await getBandContext(db,user.id,user.bandContext);
 if(context.status==='error')return new Response('밴드 정보를 불러오지 못했습니다.',{status:503,headers:privateHeaders});
 if(context.status!=='ready')return new Response('합주를 찾을 수 없습니다.',{status:404,headers:privateHeaders});
 const{data,error}=await db.from('confirmed_plans').select('id,rehearsal_date,starts_at,ends_at,location,memo,attendee_count,participant_count,confirmed_plan_songs(title_snapshot,display_order)').eq('id',planId).eq('band_id',context.band.id).maybeSingle();
 if(error)return new Response('합주를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',{status:503,headers:privateHeaders});
 if(!data)return new Response('합주를 찾을 수 없습니다.',{status:404,headers:privateHeaders});
 const body=planIcs({id:data.id,date:data.rehearsal_date,start:data.starts_at,end:data.ends_at,location:data.location,memo:data.memo,attending:data.attendee_count,total:data.participant_count,songs:[...data.confirmed_plan_songs].sort((a,b)=>a.display_order-b.display_order).map(s=>s.title_snapshot)});
 return new Response(body,{headers:{...privateHeaders,'Content-Type':'text/calendar; charset=utf-8; method=PUBLISH','Content-Disposition':'inline; filename="rehearsal-'+data.rehearsal_date+'.ics"'}});
}
