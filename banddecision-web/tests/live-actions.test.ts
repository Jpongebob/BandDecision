import {beforeEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),refresh:vi.fn(),redirect:vi.fn((path:string)=>{throw Error("redirect:"+path);})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:mock.rpc})}));
vi.mock('next/navigation',()=>({redirect:mock.redirect}));
vi.mock('next/cache',()=>({revalidatePath:mock.refresh}));
import {deleteBandSongAction,addAvailabilityAction,editAvailabilityAction,deleteAvailabilityAction,saveLivePlanAction,deleteLivePlanAction,liveVoteAction,setSongConfirmationAction,withdrawSongVoteAction} from '../src/app/live-actions';
const id='b0000000-0000-4000-8000-000000000001';
function form(fields:Record<string,string>,songs:string[]=[]){const f=new FormData();Object.entries(fields).forEach(([k,v])=>f.set(k,v));songs.forEach(s=>f.append('song_id',s));return f;}
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockResolvedValue({error:null});});
describe('continuous planning actions',()=>{
 it('creates date-only plans with an empty song array and no round',async()=>{expect((await saveLivePlanAction({},form({band_id:id,date:'2026-12-01',version:'3'}))).success).toBeTruthy();expect(mock.rpc).toHaveBeenCalledWith('save_rehearsal_plan',{p_band:id,p_date:'2026-12-01',p_song_ids:[],p_expected_version:3,p_plan:null,p_expected_plan_version:null,p_ack_partial:false});});
 it('edits a specific versioned plan rather than adding a new plan',async()=>{await saveLivePlanAction({},form({band_id:id,date:'2026-12-01',version:'3',plan_id:id,plan_version:'2'},['1']));expect(mock.rpc.mock.calls[0][1]).toMatchObject({p_plan:id,p_expected_plan_version:2,p_song_ids:[1]});});
 it.each(['','-1','x'])('rejects missing or invalid planning version %s',async version=>{expect((await saveLivePlanAction({},form({band_id:id,date:'2026-12-01',version}))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();});
 it('rejects duplicate song IDs',async()=>{expect((await saveLivePlanAction({},form({band_id:id,date:'2026-12-01',version:'3'},['1','1']))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();});
 it('does not mutate or refresh after stale plan errors',async()=>{mock.rpc.mockResolvedValue({error:{message:'PLAN_STALE'}});expect((await saveLivePlanAction({},form({band_id:id,date:'2026-12-01',version:'3',plan_id:id,plan_version:'1'}))).error).toContain('다른 창');expect(mock.refresh).not.toHaveBeenCalled();});
 it('adds only submitted dates without replacement or round fields',async()=>{await addAvailabilityAction({},form({dates_json:'[{"date":"2026-12-01","reason":"work"}]'}));expect(mock.rpc).toHaveBeenCalledWith('save_band_unavailability',{p_dates:[{date:'2026-12-01',reason:'work'}]});});
 it('rejects empty bulk save and malformed JSON rather than clearing all dates',async()=>{for(const dates_json of ['[]','broken'])expect((await addAvailabilityAction({},form({dates_json}))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();});
 it('edits a saved date and reason',async()=>{await editAvailabilityAction({},form({old_date:'2026-12-01',date:'2026-12-02',reason:'changed'}));expect(mock.rpc).toHaveBeenCalledWith('update_band_unavailability',{p_date:'2026-12-01',p_new_date:'2026-12-02',p_reason:'changed'});});
 it('deletes exactly the selected date',async()=>{await deleteAvailabilityAction({},form({date:'2026-12-01'}));expect(mock.rpc).toHaveBeenCalledWith('delete_band_unavailability',{p_date:'2026-12-01'});});
 it('retains plan deletion consent and version',async()=>{expect((await deleteLivePlanAction({},form({plan_id:id,plan_version:'2'}))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();await deleteLivePlanAction({},form({plan_id:id,plan_version:'2',confirm_delete:'yes'}));expect(mock.rpc).toHaveBeenCalledWith('delete_live_plan',{p_plan:id,p_expected_version:2});});
 it('votes without a round and clears no reason on yes',async()=>{await liveVoteAction({},form({song_id:'1',choice:'yes',reason:'old'}));expect(mock.rpc).toHaveBeenCalledWith('vote_band_song',{p_song:1,p_choice:'yes',p_reason:null});});
 it('requires a negative-vote reason',async()=>{expect((await liveVoteAction({},form({song_id:'1',choice:'no',reason:' '}))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();});
});

it('withdraws only the current actor vote and rejects invalid song IDs',async()=>{for(const song_id of ['', 'x','0'])expect((await withdrawSongVoteAction({},form({song_id}))).error).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();expect((await withdrawSongVoteAction({},form({song_id:'2',member_id:'someone-else'}))).success).toBeTruthy();expect(mock.rpc).toHaveBeenCalledWith('withdraw_band_song_vote',{p_song:2});});

it('adds and edits dates without a reason field',async()=>{await addAvailabilityAction({},form({dates_json:'[{"date":"2026-12-01"}]'}));expect(mock.rpc).toHaveBeenCalledWith('save_band_unavailability',{p_dates:[{date:'2026-12-01'}]});await editAvailabilityAction({},form({old_date:'2026-12-01',date:'2026-12-02'}));expect(mock.rpc).toHaveBeenCalledWith('update_band_unavailability',{p_date:'2026-12-01',p_new_date:'2026-12-02'});});

it('validates repertoire state and refreshes after explicit confirm/remove',async()=>{
 for(const fields of [{song_id:'0',confirmed:'true'},{song_id:'1',confirmed:'yes'}])expect((await setSongConfirmationAction({},form(fields))).error).toBeTruthy();
 expect(mock.rpc).not.toHaveBeenCalled();
 await setSongConfirmationAction({},form({song_id:'2',confirmed:'true'}));expect(mock.rpc).toHaveBeenLastCalledWith('set_song_confirmation',{p_song:2,p_confirmed:true});
 await setSongConfirmationAction({},form({song_id:'2',confirmed:'false'}));expect(mock.rpc).toHaveBeenLastCalledWith('set_song_confirmation',{p_song:2,p_confirmed:false});
});

it('deletes only after explicit confirmation then returns to songs',async()=>{
 for(const fields of [{song_id:'1',confirm_delete_song:''},{song_id:'0',confirm_delete_song:'yes'}])expect((await deleteBandSongAction({},form(fields))).error).toBeTruthy();
 expect(mock.rpc).not.toHaveBeenCalled();
 await expect(deleteBandSongAction({},form({song_id:'12',confirm_delete_song:'yes'}))).rejects.toThrow('redirect:/songs');
 expect(mock.rpc).toHaveBeenCalledWith('delete_band_song',{p_song:12});expect(mock.refresh).toHaveBeenCalledWith('/','layout');
});
it('does not redirect or refresh after denied song deletion',async()=>{
 mock.rpc.mockResolvedValue({error:{message:'FORBIDDEN'}});
 expect((await deleteBandSongAction({},form({song_id:'12',confirm_delete_song:'yes'}))).error).toBeTruthy();expect(mock.redirect).not.toHaveBeenCalled();expect(mock.refresh).not.toHaveBeenCalled();
});
