import { loadVerifiedPlanningPage } from '@/lib/live-planning';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { recommendSongs } from '@/services/recommendations';

export default async function SongRecommendationsPage() {
  const db = await createClient();
  if (!db) return null;
  const page=await loadVerifiedPlanningPage(db,'songs');
  if(!page)return <Card><CardTitle>밴드 가입 후 이용할 수 있습니다</CardTitle></Card>;
  const{data}=page;
  const ranked=recommendSongs(data.members,data.songs.filter(song=>!song.confirmedAt),data.skill_enabled===true);
  return (
    <div className="space-y-4">
      <div><h1 className="mt-2 text-3xl font-black">곡 추천</h1><p className="mt-2 text-sm text-slate-500">현재 멤버 {data.members.length}명 · 찬성 {Math.ceil(2*data.members.length/3)}명 이상{data.skill_enabled?' · 점수 = 찬성×3 − 부담×2':' · 찬성 인원순 추천'}</p></div>
      {data.skill_enabled&&ranked.length>0&&data.members.some(m=>m.skill===null)&&<Card><p className="text-sm text-amber-800">실력이 미설정인 멤버가 있습니다. 밴드장이 실력을 설정하면 부담 점수와 곡 추천을 계산합니다. 날짜만 먼저 확정할 수 있습니다.</p></Card>}
      {ranked.map((song, index) => (
        <Card key={song.id} className={song.status === 'eligible' ? 'border-blue-200' : ''}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-blue-700">{song.status === 'eligible' ? `추천 ${index + 1}위` : '추천 보류'}</p><CardTitle className="mt-1">{song.title}</CardTitle><p className="mt-1 text-sm text-slate-500">{song.artist}</p></div>
            <Badge className={song.status === 'eligible' ? 'bg-emerald-50 text-emerald-700' : ''}>{song.status === 'eligible' ? `점수 ${song.score}` : song.status === 'waiting_votes' ? `미응답 ${song.pendingCount}명` : song.status === 'insufficient_agree' ? `찬성 ${song.yesCount}/${song.requiredYes}` : song.status==='skill_pending'?'멤버 실력 미설정':'파트 난이도 미등록'}</Badge>
          </div>
          {song.status === 'eligible' && <p className="mt-3 text-sm text-slate-600">찬성 {song.yesCount} · 반대 {song.noCount}{data.skill_enabled&&<> · 멤버별 부담 합 {song.burden}</>}</p>}
        </Card>
      ))}
      {data.songs.some(song=>song.confirmedAt)&&<Card><p className="text-sm">확정곡은 추가 투표 없이 합주 계획에 넣을 수 있습니다.</p></Card>}{ranked.length === 0 && <Card><CardTitle>추천할 후보곡이 없습니다</CardTitle></Card>}
    </div>
  );
}
