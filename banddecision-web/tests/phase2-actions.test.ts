import {beforeEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:mock.rpc})}));
vi.mock('next/navigation',()=>({redirect:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:mock.refresh}));
import {saveAvailabilityChanges,setPlanAttendance,updateBandSongAction,deleteBandSongAction} from '../src/app/live-actions';
const plan='b0000000-0000-4000-8000-000000000001',a='b0000000-0000-4000-8000-00000000000a',b='b0000000-0000-4000-8000-00000000000b';
function form(fields:Record<string,string>){const f=new FormData();Object.entries(fields).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({data:null,error:null});});

describe('leader attendance',()=>{
 it('sends the whole attending list with the expected version and returns the next version',async()=>{
  expect(await setPlanAttendance({plan,version:3,attending:[a,b]})).toEqual({ok:true,version:4});
  expect(mock.rpc).toHaveBeenCalledWith('set_plan_attendance',{p_plan:plan,p_expected_version:3,p_attending:[a,b]});
  expect(mock.refresh).toHaveBeenCalled();
 });
 it('rejects an empty or invalid list before calling the database',async()=>{
  expect((await setPlanAttendance({plan,version:3,attending:[]})).error).toBe('참석하는 멤버가 한 명은 있어야 해요.');
  expect((await setPlanAttendance({plan,version:3,attending:[a,a]})).ok).toBe(false);
  expect((await setPlanAttendance({plan,version:0,attending:[a]})).ok).toBe(false);
  expect((await setPlanAttendance({plan:'x',version:3,attending:[a]})).ok).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('explains a stale plan without refreshing',async()=>{
  mock.rpc.mockResolvedValue({error:{message:'PLAN_STALE'}});
  expect((await setPlanAttendance({plan,version:3,attending:[a]})).error).toContain('다른 창');
  expect(mock.refresh).not.toHaveBeenCalled();
 });
});

describe('confirmed days are locked for members',()=>{
 it('shows a clear message when the database refuses a confirmed day',async()=>{
  mock.rpc.mockResolvedValue({error:{message:'DATE_LOCKED'}});
  const result=await saveAvailabilityChanges({add:[],remove:['2026-11-20']});
  expect(result.ok).toBe(false);expect(result.error).toContain('밴드장에게 알려');
 });
});

describe('song edits and uploader deletion',()=>{
 it('trims and saves title and artist',async()=>{
  mock.rpc.mockResolvedValue({data:true,error:null});
  expect((await updateBandSongAction({},form({song_id:'7',title:'  새 제목 ',artist:' 가수 '}))).success).toContain('받은 투표는 그대로');
  expect(mock.rpc).toHaveBeenCalledWith('update_band_song',{p_song:7,p_title:'새 제목',p_artist:'가수'});
 });
 it('says nothing changed when the database reports no change',async()=>{
  mock.rpc.mockResolvedValue({data:false,error:null});
  expect((await updateBandSongAction({},form({song_id:'7',title:'a',artist:'b'}))).success).toBe('바뀐 내용이 없어요.');
 });
 it('rejects blank or overlong fields',async()=>{
  for(const fields of [{song_id:'7',title:' ',artist:'b'},{song_id:'7',title:'a',artist:'x'.repeat(121)},{song_id:'0',title:'a',artist:'b'}])expect((await updateBandSongAction({},form(fields))).error).toBeTruthy();
  expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('maps the uploader deletion limits to messages',async()=>{
  mock.rpc.mockResolvedValue({error:{message:'SONG_HAS_VOTES'}});
  expect((await deleteBandSongAction({},form({song_id:'7',confirm_delete_song:'yes'}))).error).toBe('다른 멤버가 투표한 곡은 밴드장만 지울 수 있어요.');
  mock.rpc.mockResolvedValue({error:{message:'SONG_CONFIRMED'}});
  expect((await deleteBandSongAction({},form({song_id:'7',confirm_delete_song:'yes'}))).error).toBe('확정곡은 밴드장만 지울 수 있어요.');
 });
});
