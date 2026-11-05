import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadLivePlanning,liveRecommendations} from '../src/lib/live-planning';
const base={band_id:'b',version:2,members:[{id:'m',userId:'u',nickname:'Me',part:'기타',partKey:'기타',skill:3}],unavailable:[],songs:[]};
const client=(data:unknown,error:unknown=null)=>({rpc:vi.fn(async()=>({data,error})),from:vi.fn()});
describe('single coherent current planning context',()=>{
 it('reads current members/dates/votes in one RPC and no serial selects',async()=>{const db=client(base);expect(await loadLivePlanning(db as unknown as SupabaseClient,'b')).toEqual(base);expect(db.rpc).toHaveBeenCalledWith('band_planning_context');expect(db.from).not.toHaveBeenCalled();});
 it.each([null,{...base,band_id:'other'},{...base,version:-1},{...base,members:[{...base.members[0],skill:null}]}])('fails closed for invalid or wrong-band context %j',async data=>{await expect(loadLivePlanning(client(data) as unknown as SupabaseClient,'b')).rejects.toThrow('DATA_LOAD_FAILED');});
 it('fails closed on RPC errors instead of empty schedules',async()=>{await expect(loadLivePlanning(client(null,{code:'57014'}) as unknown as SupabaseClient,'b')).rejects.toThrow('DATA_LOAD_FAILED');});
 it('new members immediately affect recommendations with no submission gate',()=>{const joined={...base,members:[...base.members,{...base.members[0],id:'new',userId:'new-user'}],unavailable:[{memberId:'new',date:'2026-11-05',reason:'work'}]};const {dates}=liveRecommendations(joined,'2026-11-05');expect(dates).toHaveLength(60);expect(dates.find(d=>d.date==='2026-11-05')?.attendanceCount).toBe(1);expect(dates.find(d=>d.date==='2026-11-06')?.attendanceCount).toBe(2);});
});
