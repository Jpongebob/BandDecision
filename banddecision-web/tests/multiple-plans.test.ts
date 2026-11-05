vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({count:2,role:'leader',single:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({from:(table:string)=>{const result={error:null,count:5,data:table==='confirmed_plans'?Array.from({length:state.count},(_,i)=>({id:'plan'+i,rehearsal_date:'2026-12-'+(10+i),starts_at:'20:00:00',ends_at:'22:00:00',attendee_count:5,participant_count:5,confirmed_plan_members:[],confirmed_plan_songs:[{id:'s'+i,title_snapshot:'Song '+i,artist_snapshot:'Band'}]})):table==='planning_rounds'?{id:'round',version:1,start_date:'2026-11-05',end_date:'2027-01-03'}:[]};const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,maybeSingle:async()=>{state.single(table);return result;},then:(resolve:(v:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};return q;}}),getCurrentUser:async()=>({id:'u',nickname:'Leader'})}));
vi.mock('@/lib/band-context',()=>({getActiveMember:async()=>({data:{id:'m',band_id:'b',role:state.role}}),getBandContext:async()=>({status:'ready',member:{id:'m',band_id:'b',role:state.role},band:{name:'Band'}})}));
vi.mock('@/lib/round-data',()=>({loadRoundData:async()=>({participants:[],unavailable:[],submittedIds:[]}),loadSongs:async()=>[]}));
vi.mock('@/services/recommendations',()=>({recommendDates:()=>[{date:'2026-11-06',attendanceCount:5,attendees:[],absentees:[]}],recommendSongs:()=>[]}));
import PlansPage from '../src/app/(protected)/plans/page';
import Dashboard from '../src/app/(protected)/dashboard/page';
beforeEach(()=>{state.count=2;state.role='leader';vi.clearAllMocks();});
describe('multiple confirmed plan views',()=>{
 it('renders every saved snapshot and queries a collection',async()=>{const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('Song 0');expect(html).toContain('Song 1');expect(html).toContain('2/5');expect(state.single).not.toHaveBeenCalledWith('confirmed_plans');});
 it('renders all plans on the home screen',async()=>{const html=renderToStaticMarkup(await Dashboard());expect(html).toContain('Song 0');expect(html).toContain('Song 1');expect(state.single).not.toHaveBeenCalledWith('confirmed_plans');});
 it('shows five plans with deletion controls and no sixth confirmation form',async()=>{state.count=5;const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('5/5');expect(html).toContain('Song 4');expect(html).toContain('이 계획 삭제');expect(html).not.toContain('선택 내용 미리보기');});
 it('ordinary members read all plans without delete or confirm controls',async()=>{state.role='member';const html=renderToStaticMarkup(await PlansPage());expect(html).toContain('Song 1');expect(html).not.toContain('이 계획 삭제');expect(html).not.toContain('선택 내용 미리보기');});
});

