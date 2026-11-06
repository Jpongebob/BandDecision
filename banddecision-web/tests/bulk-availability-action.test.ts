import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:mock.rpc})}));
vi.mock('next/cache',()=>({revalidatePath:mock.refresh}));
import {deleteAvailabilityDatesAction} from '../src/app/live-actions';
function form(dates:string,consent='yes'){const f=new FormData();f.set('dates_json',dates);f.set('confirm_delete_dates',consent);f.set('member_id','someone-else');return f;}
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({error:null});});
it.each(['[]','broken','[null]','["2026-02-30"]','["2026-11-06","2026-11-06"]'])('rejects malformed selection %s before DB mutation',async dates=>{
 expect((await deleteAvailabilityDatesAction({},form(dates))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();
});
it('requires consent and sends only the selected dates, never a member ID',async()=>{
 expect((await deleteAvailabilityDatesAction({},form('["2026-11-06"]',''))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();
 expect((await deleteAvailabilityDatesAction({},form('["2026-11-06","2026-12-01"]'))).success).toBeTruthy();
 expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('delete_band_availability_dates',{p_dates:['2026-11-06','2026-12-01']});expect(mock.refresh).toHaveBeenCalledOnce();
});
it('retains a permission error without refreshing',async()=>{
 mock.rpc.mockResolvedValue({error:{message:'FORBIDDEN'}});expect((await deleteAvailabilityDatesAction({},form('["2026-11-06"]'))).error).toBeTruthy();expect(mock.refresh).not.toHaveBeenCalled();
});
