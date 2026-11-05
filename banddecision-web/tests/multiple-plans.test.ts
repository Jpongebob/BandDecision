import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({count:2,role:'leader',past:false}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({}),getCurrentUser:async()=>({id:'u',nickname:'Leader'})}));
vi.mock('@/lib/band-context',()=>({getActiveMember:async()=>({data:{id:'m',band_id:'b',role:state.role},error:null}),getBandContext:async()=>({status:'ready',member:{id:'m',band_id:'b',role:state.role},band:{id:'b',name:'Band'}})}));
vi.mock('@/lib/live-planning',()=>({loadHomeContext:async()=>({member_count:1,pending_votes:2,unset_skills:0,my_skill:3,upcoming_unavailable:['2026-12-05']}),loadMemberCount:async()=>1,loadPlanSummaries:async()=>Array.from({length:state.count},(_,i)=>({id:'p'+i,rehearsal_date:state.past&&i===0?'2026-11-04':'2026-12-'+(10+i),starts_at:'20:00:00',ends_at:'22:00:00',attendee_count:1,participant_count:1,confirmed_plan_songs:i===0?[]:[{id:'s'+i,title_snapshot:'Song '+i}]})),loadLivePlanning:async()=>({band_id:'b',version:1,members:[],unavailable:[],songs:[]}),loadPlans:async()=>Array.from({length:state.count},(_,i)=>({id:'p'+i,version:1,rehearsal_date:state.past&&i===0?'2026-11-04':'2026-12-'+(10+i),starts_at:'20:00:00',ends_at:'22:00:00',attendee_count:1,participant_count:1,confirmed_plan_members:[],confirmed_plan_songs:i===0?[]:[{id:'s'+i,source_song_id:i,title_snapshot:'Song '+i,artist_snapshot:'Band',display_order:1}]})),liveRecommendations:()=>({dates:[],songs:[]}),seoulToday:()=> '2026-11-05'}));
import PlansPage from '../src/app/(protected)/plans/page';
import Dashboard from '../src/app/(protected)/dashboard/page';
beforeEach(()=>{state.count=2;state.role='leader';state.past=false;});
describe('editable date-only plan views',()=>{
 it('renders all plans and labels date-only plans',async()=>{const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('Song 1');expect(html).toContain('곡 미정');expect(html).toContain('계획 수정');expect(html).toContain('계획 삭제');expect(html).not.toContain('미리보기');});
 it('home lists date-only and song plans',async()=>{const html=renderToStaticMarkup(await Dashboard());expect(html).toContain('내가 할 일');expect(html).toContain('미투표 곡');expect(html).toContain('다가오는 합주');expect(html).toContain('곡 미정');expect(html).not.toContain('회차');});
 it('at capacity keeps all editors but hides new confirmation',async()=>{state.count=5;const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('Song 4');expect(html).toContain('계획이 5개');expect(html.match(/계획 수정 저장/g)).toHaveLength(5);expect(html).not.toContain('>합주 날짜 확정<');});
 it('ordinary members can read but cannot edit/delete/create plans',async()=>{state.role='member';const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('Song 1');expect(html).not.toContain('계획 수정');expect(html).not.toContain('계획 삭제');expect(html).not.toContain('합주 날짜 확정');});
});

it('archives old plans without consuming upcoming capacity or exposing edit forms',async()=>{state.count=5;state.past=true;const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('지난 합주');expect(html).toContain('data-archived-plan-id="p0"');expect(html).toContain('예정된 계획 4/5개');expect(html).toContain('합주 날짜 확정');expect(html.match(/계획 수정 저장/g)).toHaveLength(4);});
