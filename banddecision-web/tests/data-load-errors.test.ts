import { describe, expect, it } from 'vitest';
import { loadRoundData, loadSongs } from '../src/lib/round-data';
type Db=Parameters<typeof loadRoundData>[0];
const rows:Record<string,unknown>={
 planning_rounds:{id:'r',band_id:'b'}, round_participants:[{member_id:'m',user_id_snapshot:'u',nickname_snapshot:'Me',part_key_snapshot:'기타',part_label_snapshot:'기타'}],
 round_submissions:[{member_id:'m',status:'submitted'}], unavailable_dates:[],band_members:[{id:'m',skill:3}],
 songs:[{id:1,title:'Song',artist:'Band'}],song_difficulties:[],song_votes:[],
};
function db(failure?:string,missingSkill=false):Db {
 return {from:(table:string)=>{
  const result={data:missingSkill&&table==='band_members'?[]:rows[table],error:table===failure?{code:'57014',message:'PRIVATE database detail'}:null};
  const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,maybeSingle:async()=>result,
   then:(resolve:(value:unknown)=>unknown,reject?:(reason:unknown)=>unknown)=>Promise.resolve(result).then(resolve,reject)};
  return q;
 }} as unknown as Db;
}
describe('partial query failures never become invented recommendations',()=>{
 it.each(['round_participants','round_submissions','unavailable_dates','band_members'])('fails closed for %s query errors',async table=>{
  await expect(loadRoundData(db(table),'b','r','2026-11-05')).rejects.toThrow();
 });
 it.each(['songs','song_difficulties','song_votes'])('fails closed for %s query errors',async table=>{
  await expect(loadSongs(db(table),'b','r')).rejects.toThrow();
 });
 it('never substitutes skill 3 when a current participant skill is missing',async()=>{
  await expect(loadRoundData(db(undefined,true),'b','r','2026-11-05')).rejects.toThrow();
 });
});
