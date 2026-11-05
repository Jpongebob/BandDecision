import {expect,it} from 'vitest';
import {splitPlans} from '../src/lib/plan-dates';
import {recommendSongs,type Participant} from '../src/services/recommendations';
it('today remains upcoming and older records are preserved in descending archive order',()=>{const result=splitPlans([{rehearsal_date:'2026-11-04'},{rehearsal_date:'2026-10-31'},{rehearsal_date:'2026-11-05'},{rehearsal_date:'2026-12-01'}],'2026-11-05');expect(result.upcoming.map(p=>p.rehearsal_date)).toEqual(['2026-11-05','2026-12-01']);expect(result.past.map(p=>p.rehearsal_date)).toEqual(['2026-11-04','2026-10-31']);});
it('does not invent skill or burden scores for an unassigned member',()=>{const member:Participant={id:'m',userId:'u',nickname:'Me',part:'기타',partKey:'기타',skill:null};const song={id:1,title:'Song',artist:'Band',difficulties:{'기타':2},votes:[{memberId:'m',choice:'yes' as const}]};expect(recommendSongs([member],[song])[0]).toMatchObject({status:'skill_pending',burden:null,score:null});expect(recommendSongs([{...member,skill:3}],[song])[0].status).toBe('eligible');});

it('disabled skill scoring neither blocks missing skills nor uses retained skill values',()=>{
 const people=[{id:'m',userId:'u',nickname:'Member',part:'기타',partKey:'기타',skill:null}];
 const songs=[{id:1,title:'Song',artist:'Artist',difficulties:{기타:5},votes:[{memberId:'m',choice:'yes' as const}]}];
 expect(recommendSongs(people,songs,false)[0]).toMatchObject({status:'eligible',burden:0,score:3});
 expect(recommendSongs(people,songs,true)[0].status).toBe('skill_pending');
});
