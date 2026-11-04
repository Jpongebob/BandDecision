import type { SupabaseClient } from '@supabase/supabase-js';
import type { Participant,Unavailable,SongInput } from '@/services/recommendations';

export async function loadRoundData(db:SupabaseClient,bandId:string,roundId:string,today:string){
 const[{data:round},{data:rawParticipants},{data:submissions},{data:rawUnavailable}]=await Promise.all([
  db.from('planning_rounds').select('*').eq('id',roundId).eq('band_id',bandId).maybeSingle(),
  db.from('round_participants').select('*').eq('round_id',roundId),
  db.from('round_submissions').select('member_id,status').eq('round_id',roundId),
  db.from('unavailable_dates').select('member_id,unavailable_date,reason').eq('band_id',bandId),
 ]);
 if(!round)return null;
 const raw=rawParticipants??[],ids=raw.map(p=>p.member_id);
 const{data:members}=await db.from('band_members').select('id,skill').in('id',ids.length?ids:['00000000-0000-0000-0000-000000000000']);
 const skill=new Map((members??[]).map(m=>[m.id,m.skill]));
 const participants:Participant[]=raw.map(p=>({id:p.member_id,userId:p.user_id_snapshot,nickname:p.nickname_snapshot,part:p.part_label_snapshot,partKey:p.part_key_snapshot,skill:skill.get(p.member_id)??3}));
 const unavailable:Unavailable[]=(rawUnavailable??[]).map(x=>({memberId:x.member_id,date:x.unavailable_date,reason:x.reason}));
 const submittedIds=(submissions??[]).filter(x=>x.status!=='pending').map(x=>x.member_id);
 return{round,participants,unavailable,submissions:submissions??[],submittedIds,today};
}

export async function loadSongs(db:SupabaseClient,bandId:string,roundId:string|null){
 const{data:songs}=await db.from('songs').select('id,title,artist').eq('band_id',bandId).order('id');
 const ids=(songs??[]).map(s=>s.id);
 const[{data:difficulties},{data:votes}]=await Promise.all([
  ids.length?db.from('song_difficulties').select('*').in('song_id',ids):Promise.resolve({data:[]}),
  roundId&&ids.length?db.from('song_votes').select('*').eq('round_id',roundId).in('song_id',ids):Promise.resolve({data:[]}),
 ]);
 const inputs:SongInput[]=(songs??[]).map(song=>({id:song.id,title:song.title,artist:song.artist,
  difficulties:Object.fromEntries((difficulties??[]).filter(d=>d.song_id===song.id).map(d=>[d.part_key,d.difficulty])),
  votes:(votes??[]).filter(v=>v.song_id===song.id).map(v=>({memberId:v.member_id,choice:v.choice,reason:v.reason})),
 }));
 return inputs;
}
