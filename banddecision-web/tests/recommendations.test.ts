import { describe,expect,it } from 'vitest';
import { recommendDates,recommendSongs,type Participant,type SongInput } from '../src/services/recommendations';
const participants:Participant[]=Array.from({length:5},(_,i)=>({id:`m${i+1}`,userId:`u${i+1}`,nickname:`멤버${i+1}`,part:'기타',partKey:'guitar',skill:i===0?2:4}));
describe('date recommendations',()=>{
 it('waits for each round participant and sorts attendance then date',()=>{
  const dates=recommendDates({participants,submittedIds:['m1','m2','m3','m4'],startDate:'2026-11-04',endDate:'2026-11-06',today:'2026-11-04',unavailable:[{memberId:'m1',date:'2026-11-04',reason:'x'},{memberId:'m2',date:'2026-11-04',reason:'x'}]});expect(dates).toEqual([]);
  const ready=recommendDates({participants,submittedIds:participants.map(p=>p.id),startDate:'2026-11-04',endDate:'2026-11-06',today:'2026-11-04',unavailable:[{memberId:'m1',date:'2026-11-04',reason:'x'},{memberId:'m2',date:'2026-11-04',reason:'x'}]});expect(ready.map(x=>x.date)).toEqual(['2026-11-05','2026-11-06','2026-11-04']);expect(ready[0]?.attendanceCount).toBe(5);expect(ready[2]?.attendanceCount).toBe(3);
 });
 it('excludes dates with zero attendees',()=>{const p=participants.slice(0,2);const result=recommendDates({participants:p,submittedIds:p.map(x=>x.id),startDate:'2026-11-04',endDate:'2026-11-04',today:'2026-11-04',unavailable:p.map(x=>({memberId:x.id,date:'2026-11-04',reason:'x'}))});expect(result).toHaveLength(0);});
});
describe('song recommendations',()=>{
 const song=(id:number,voteCount:number,yesCount:number):SongInput=>({id,title:`곡${id}`,artist:'밴드',difficulties:{guitar:4},votes:Array.from({length:voteCount},(_,i)=>({memberId:`m${i}`,choice:i<yesCount?'yes':'no'} as const))});
 it('uses ceil(2N/3), requires every vote and scores per member burden',()=>{const result=recommendSongs(participants,[song(1,5,4)]);expect(result[0]).toMatchObject({status:'eligible',requiredYes:4,burden:2,score:8});expect(recommendSongs(participants,[song(2,4,4)])[0]?.status).toBe('waiting_votes');expect(recommendSongs(participants,[song(3,5,3)])[0]?.status).toBe('insufficient_agree');});
 it('orders eligible score ties by yes, burden, then id',()=>{const a=song(1,5,4),b=song(2,5,4);a.difficulties.guitar=4;b.difficulties.guitar=4;expect(recommendSongs(participants,[b,a]).map(x=>x.id)).toEqual([1,2]);});
 it('marks missing required part difficulty',()=>{const s=song(1,5,5);s.difficulties={};expect(recommendSongs(participants,[s])[0]?.status).toBe('difficulty_pending');});
 it('uses dynamic thresholds for seven-member and solo groups',()=>{const seven=participants.concat([{...participants[0]!,id:'m6'},{...participants[0]!,id:'m7'}]);expect(recommendSongs(seven,[{...song(1,7,5),difficulties:{guitar:2}}])[0]).toMatchObject({status:'eligible',requiredYes:5});expect(recommendSongs([participants[0]!],[{...song(2,1,1),difficulties:{guitar:2}}])[0]).toMatchObject({status:'eligible',requiredYes:1});});
 it('matches the documented five-yes, burden-three score of nine',()=>{const team=participants.map((p,i)=>({...p,skill:[1,3,4,4,4][i]!}));expect(recommendSongs(team,[{...song(1,5,5),difficulties:{guitar:4}}])[0]).toMatchObject({status:'eligible',burden:3,score:9});});
});
