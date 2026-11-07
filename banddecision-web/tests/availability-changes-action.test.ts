import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:mock.rpc})}));
vi.mock('next/cache',()=>({revalidatePath:mock.refresh}));
import {saveAvailabilityChanges} from '../src/app/live-actions';
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({error:null});});
it('saves additions and removals with one actor-scoped transaction',async()=>{
 expect(await saveAvailabilityChanges({add:['2026-11-12','2026-11-12'],remove:['2026-11-10']})).toEqual({ok:true,added:true,removed:true});
 expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('change_band_availability',{p_add:['2026-11-12'],p_remove:['2026-11-10']});expect(mock.refresh).toHaveBeenCalledOnce();
});
it('reports no partial success after a DB failure and retains the draft',async()=>{
 mock.rpc.mockResolvedValue({error:{message:'FORBIDDEN'}});
 expect(await saveAvailabilityChanges({add:['2026-11-12'],remove:['2026-11-10']})).toMatchObject({ok:false,added:false,removed:false});expect(mock.refresh).not.toHaveBeenCalled();
});
it('rejects malformed or overlapping dates without a request',async()=>{
 for(const input of [{add:['2026-02-30'],remove:[]},{add:['2026-11-12'],remove:['2026-11-12']}])expect((await saveAvailabilityChanges(input)).ok).toBe(false);
 expect(mock.rpc).not.toHaveBeenCalled();
});
it('does not request or refresh for an unchanged calendar',async()=>{
 expect((await saveAvailabilityChanges({add:[],remove:[]})).ok).toBe(true);expect(mock.rpc).not.toHaveBeenCalled();expect(mock.refresh).not.toHaveBeenCalled();
});
