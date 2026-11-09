import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({user:{id:'u',bandContext:undefined} as {id:string;bandContext?:undefined}|null,context:{status:'ready',band:{id:'band'}} as {status:string;band:{id:string}},result:{data:null as unknown,error:null as {message:string}|null},eq:vi.fn(),select:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:()=>({select:(fields:string)=>{mock.select(fields);const q={eq:(...args:unknown[])=>{mock.eq(...args);return q;},maybeSingle:async()=>mock.result};return q;}})}),getCurrentUser:async()=>mock.user}));
vi.mock('@/lib/band-context',()=>({getBandContext:async()=>mock.context}));
import {GET} from '../src/app/api/plans/[planId]/calendar.ics/route';
const id='b0000000-0000-4000-8000-000000000001';
const get=(planId=id)=>GET(new Request('https://example.test/api/plans/'+planId+'/calendar.ics'),{params:Promise.resolve({planId})});
beforeEach(()=>{vi.clearAllMocks();mock.user={id:'u'};mock.context={status:'ready',band:{id:'band'}};mock.result={data:{id,rehearsal_date:'2026-11-20',starts_at:'20:00:00',ends_at:'22:00:00',location:'서울',memo:'연습',attendee_count:4,participant_count:5,confirmed_plan_songs:[{title_snapshot:'둘째 곡',display_order:2},{title_snapshot:'첫 곡',display_order:1}]},error:null};});
it('returns a private inline calendar file generated from the authorized DB record',async()=>{
 const r=await get();expect(r.status).toBe(200);expect(r.headers.get('Content-Type')).toContain('text/calendar');expect(r.headers.get('Content-Disposition')).toContain('inline;');expect(r.headers.get('Cache-Control')).toBe('private, no-store');const body=(await r.text()).replace(/\r\n /g,'');expect(body).toContain('DTSTART:20261120T110000Z');expect(body.indexOf('첫 곡')).toBeLessThan(body.indexOf('둘째 곡'));expect(mock.eq.mock.calls).toEqual([['id',id],['band_id','band']]);
});
it('rejects invalid IDs without querying plan data',async()=>{expect((await get('bad')).status).toBe(400);expect(mock.select).not.toHaveBeenCalled();});
it('does not expose calendar data without a PIN-verified identity',async()=>{mock.user=null;expect((await get()).status).toBe(401);expect(mock.select).not.toHaveBeenCalled();});
it('returns 404 for missing or foreign-band records and no-membership users',async()=>{mock.result.data=null;expect((await get()).status).toBe(404);mock.context={status:'none',band:{id:'band'}};mock.select.mockClear();expect((await get()).status).toBe(404);expect(mock.select).not.toHaveBeenCalled();});
it('does not leak DB errors or cache error responses',async()=>{mock.result.error={message:'private database diagnostic'};const r=await get();expect(r.status).toBe(503);expect(await r.text()).not.toContain('private database');expect(r.headers.get('Cache-Control')).toContain('no-store');});
