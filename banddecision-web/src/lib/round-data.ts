import type { SupabaseClient } from '@supabase/supabase-js';
import type { Participant,Unavailable,SongInput } from '@/services/recommendations';

function requireSuccessfulQueries(results: {error?: {code?: string} | null}[]) {
 if(results.some(result=>result.error)) throw new Error('DATA_LOAD_FAILED');
}

export async function loadRoundData(db:SupabaseClient,bandId:string,roundId:string,today:string){
 const results=await Promise.all([
  db.from('planning_rounds').select('*').eq('id',roundId).eq('band_id',bandId).maybeSingle(),
  db.from('round_participants').select('*').eq('round_id',roundId),
  db.from('round_submissions').select('member_id,status').eq('round_id',roundId),
  db.from('unavailable_dates').select('member_id,unavailable_date,reason').eq('band_id',bandId),
  db.from('band_members').select('id,skill').eq('band_id',bandId),
 ]);
 requireSuccessfulQueries(results);
 const[{data:round},{data:rawParticipants},{data:submissions},{data:rawUnavailable},{data:members}]=results;
 if(!round)return null;
 const raw=rawParticipants??[];
 const skill=new Map((members??[]).map(m=>[m.id,m.skill]));
 const participants:Participant[]=raw.map(p=>{
  const memberSkill=skill.get(p.member_id);
  if(typeof memberSkill!=='number'||!Number.isInteger(memberSkill)||memberSkill<1||memberSkill>5)
    throw new Error('MEMBER_SKILL_MISSING');
  return{id:p.member_id,userId:p.user_id_snapshot,nickname:p.nickname_snapshot,part:p.part_label_snapshot,partKey:p.part_key_snapshot,skill:memberSkill};
 });
 const unavailable:Unavailable[]=(rawUnavailable??[]).map(x=>({memberId:x.member_id,date:x.unavailable_date,reason:x.reason}));
 const submittedIds=(submissions??[]).filter(x=>x.status!=='pending').map(x=>x.member_id);
 return{round,participants,unavailable,submissions:submissions??[],submittedIds,today};
}

export async function loadSongs(db:SupabaseClient,bandId:string,roundId:string|null){
 const songsResult=await db.from('songs').select('id,title,artist').eq('band_id',bandId).order('id');
 requireSuccessfulQueries([songsResult]);
 const{data:songs}=songsResult;
 const ids=(songs??[]).map(s=>s.id);
 const details=await Promise.all([
  ids.length?db.from('song_difficulties').select('song_id,part_key,difficulty,version,updated_at,updated_by,profiles(nickname)').in('song_id',ids):Promise.resolve({data:[],error:null}),
  roundId&&ids.length?db.from('song_votes').select('*').eq('round_id',roundId).in('song_id',ids):Promise.resolve({data:[],error:null}),
 ]);
 requireSuccessfulQueries(details);
 const[{data:difficulties},{data:votes}]=details;
 const inputs:SongInput[]=(songs??[]).map(song=>{
  const rows=(difficulties??[]).filter(d=>d.song_id===song.id);
  return{id:song.id,title:song.title,artist:song.artist,
   difficulties:Object.fromEntries(rows.map(d=>[d.part_key,d.difficulty])),
   difficultyMeta:Object.fromEntries(rows.map(d=>{const relation=d.profiles;const profile=Array.isArray(relation)?relation[0] as {nickname:string}|undefined:relation as {nickname:string}|null;return[d.part_key,{version:d.version,updatedAt:d.updated_at,updatedBy:profile?.nickname??null}]})),
   votes:(votes??[]).filter(v=>v.song_id===song.id).map(v=>({memberId:v.member_id,choice:v.choice,reason:v.reason})),
  };
 });
 return inputs;
}
