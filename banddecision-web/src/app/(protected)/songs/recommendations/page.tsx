import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { loadRoundData, loadSongs } from '@/lib/round-data';
import { recommendSongs } from '@/services/recommendations';

export default async function SongRecommendationsPage() {
  const db = await createClient();
  if (!db) return null;
  const user=await getCurrentUser(db);
  if (!user) return null;
  const { data: member } = await db.from('band_members').select('band_id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!member) return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
  const { data: round } = await db.from('planning_rounds').select('id,start_date,end_date').eq('band_id', member.band_id).in('status', ['collecting', 'ready']).maybeSingle();
  if (!round) return <Card><CardTitle>진행 중 회차가 없습니다</CardTitle></Card>;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const data = await loadRoundData(db, member.band_id, round.id, today);
  if (!data) return null;
  const songs = await loadSongs(db, member.band_id, round.id);
  const ranked = recommendSongs(data.participants, songs);
  return (
    <div className="space-y-4">
      <div><h1 className="text-3xl font-black">곡 추천</h1><p className="mt-2 text-sm text-slate-500">회차 참여자 {data.participants.length}명 · 찬성 {ranked[0]?.requiredYes ?? 0}명 이상 · 점수 = 찬성×3 − 부담×2</p></div>
      {ranked.map((song, index) => (
        <Card key={song.id} className={song.status === 'eligible' ? 'border-blue-200' : ''}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-700">{song.status === 'eligible' ? `추천 ${index + 1}위` : '추천 보류'}</p><CardTitle className="mt-1">{song.title}</CardTitle><p className="mt-1 text-sm text-slate-500">{song.artist}</p></div>
            <Badge className={song.status === 'eligible' ? 'bg-emerald-50 text-emerald-700' : ''}>{song.status === 'eligible' ? `점수 ${song.score}` : song.status === 'waiting_votes' ? `미응답 ${song.pendingCount}명` : song.status === 'insufficient_agree' ? `찬성 ${song.yesCount}/${song.requiredYes}` : '파트 난이도 미등록'}</Badge>
          </div>
          {song.status === 'eligible' && <p className="mt-3 text-sm text-slate-600">찬성 {song.yesCount} · 반대 {song.noCount} · 멤버별 부담 합 {song.burden}</p>}
        </Card>
      ))}
      {ranked.length === 0 && <Card><CardTitle>후보곡을 먼저 등록해 주세요</CardTitle></Card>}
    </div>
  );
}
