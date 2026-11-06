import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
const state=vi.hoisted(()=>({verify:vi.fn(),identity:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({getVerifiedAuthUser:state.verify,getCurrentUser:state.identity}));
vi.mock('@/lib/band-context',()=>({getActiveMember:async()=>({data:{id:'m',band_id:'b',role:'leader'},error:null})}));
import {loadVerifiedPlanningPage} from '../src/lib/live-planning';
const data={band_id:'b',version:1,members:[],available:[]};
it('does not issue private RPCs before Auth verification completes',async()=>{
 let resolve!:(v:unknown)=>void;state.verify.mockReturnValue(new Promise(r=>{resolve=r;}));state.identity.mockResolvedValue({id:'u'});
 const rpc=vi.fn(async()=>({data,error:null}));const task=loadVerifiedPlanningPage({rpc} as unknown as SupabaseClient,'attendance');
 await Promise.resolve();expect(rpc).not.toHaveBeenCalled();expect(state.identity).not.toHaveBeenCalled();resolve({id:'u'});await task;
 expect(rpc).toHaveBeenCalledWith('band_attendance_context');
});
it('starts identity and data together only after verified Auth, rather than waiting for identity',async()=>{
 state.verify.mockResolvedValue({id:'u'});let finish!:(v:unknown)=>void;state.identity.mockReturnValue(new Promise(r=>{finish=r;}));
 const rpc=vi.fn(async()=>({data,error:null}));const task=loadVerifiedPlanningPage({rpc} as unknown as SupabaseClient,'attendance');
 await vi.waitFor(()=>expect(rpc).toHaveBeenCalledOnce());finish({id:'u'});expect((await task)?.data).toEqual(data);
});
it('does not query identity or data for an invalid Auth user',async()=>{
 state.verify.mockResolvedValue(null);state.identity.mockClear();const rpc=vi.fn();expect(await loadVerifiedPlanningPage({rpc} as unknown as SupabaseClient,'attendance')).toBeNull();expect(rpc).not.toHaveBeenCalled();expect(state.identity).not.toHaveBeenCalled();
});
it('rejects a wrong-band response even after identity resolves',async()=>{
 state.verify.mockResolvedValue({id:'u'});state.identity.mockResolvedValue({id:'u'});
 await expect(loadVerifiedPlanningPage({rpc:async()=>({data:{...data,band_id:'other'},error:null})} as unknown as SupabaseClient,'attendance')).rejects.toThrow('DATA_LOAD_FAILED');
});
