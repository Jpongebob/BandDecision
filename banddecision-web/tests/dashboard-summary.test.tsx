import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({role:'member'}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({}),getCurrentUser:async()=>({id:'u',nickname:'멤버'})}));
vi.mock('@/lib/band-context',()=>({getBandContext:async()=>({status:'ready',member:{role:state.role},band:{name:'우리 밴드'}})}));
vi.mock('@/lib/live-planning',()=>({seoulToday:()=> '2026-11-07',loadHomeContext:async()=>({member_count:6,upcoming_plan_count:3,upcoming_plans:[0,1,2].map(n=>({id:'p'+n,rehearsal_date:'2026-11-'+(15+n),starts_at:'20:00:00',ends_at:'22:00:00',location:['첫 장소','둘째 장소','셋째 장소'][n],memo:'이번 합주 목표',participant_count:6,attendee_count:5,confirmed_plan_songs:[{title_snapshot:'홈에 노출하지 않을 곡'}]}))})}));
import Dashboard from '../src/app/(protected)/dashboard/page';
beforeEach(()=>{state.role='member';});
it('shows venues for all upcoming rehearsals and keeps song details in the plans page',async()=>{
 const html=renderToStaticMarkup(await Dashboard());for(const place of ['첫 장소','둘째 장소','셋째 장소'])expect(html).toContain(place);
 expect(html).toContain('D-8');expect(html).toContain('이번 합주 목표');expect(html).not.toContain('홈에 노출하지 않을 곡');expect(html).not.toContain('내가 할 일');
});
it('only shows the leader role for leader accounts',async()=>{
 expect(renderToStaticMarkup(await Dashboard())).not.toContain('밴드장</span>');state.role='leader';expect(renderToStaticMarkup(await Dashboard())).toContain('밴드장</span>');
});
