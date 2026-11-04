import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { SongList } from '@/components/song-list';
import { createClient } from '@/lib/supabase/server';
import { loadRoundData, loadSongs } from '@/lib/round-data';
import type { Participant } from '@/services/recommendations';

export default async function SongsPage() {
  const db = await createClient(); if (!db) return null;
  const { data: { user } } = await db.auth.getUser(); if (!user) return null;
  const { data: member } = await db.from('band_members').select('id,band_id,role,part_key,part_label,skill').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!member) return <Card><CardTitle>가입한 밴드가 없습니다</CardTitle></Card>;
  const { data: round } = await db.from('planning_rounds').select('id').eq('band_id', member.band_id).in('status', ['collecting', 'ready']).maybeSingle();
  let participants: Participant[] = [];
  if (round) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const data = await loadRoundData(db, member.band_id, round.id, today);
    participants = data?.participants ?? [];
  } else {
    const { data: members } = await db.from('band_members').select('id,user_id,part_key,part_label,skill,profiles(nickname)').eq('band_id', member.band_id).eq('status', 'active');
    participants = (members ?? []).map(p => {
      const relation = p.profiles; const profile = Array.isArray(relation) ? relation[0] as { nickname: string } | undefined : relation as { nickname: string } | null;
      return { id: p.id, userId: p.user_id, nickname: profile?.nickname ?? '멤버', part: p.part_label, partKey: p.part_key, skill: p.skill };
    });
  }
  const songs = await loadSongs(db, member.band_id, round?.id ?? null);
  return <div className="space-y-5"><div><h1 className="text-3xl font-black">합주곡</h1><p className="mt-2 text-sm text-slate-500">회차별 한 표씩 투표하고 반대 사유를 공유합니다.</p></div><div className="flex flex-wrap gap-2"><Link className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700" href="/songs/recommendations">곡 추천 보기 →</Link></div><SongList bandId={member.band_id} roundId={round?.id ?? null} isLeader={member.role === 'leader'} memberId={member.id} participants={participants} songs={songs}/></div>;
}
