import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionForm } from '@/components/action-form';
import { addSongAction, difficultyAction, voteAction } from '@/app/actions';
import type { Participant, SongInput } from '@/services/recommendations';

export function SongList({
  bandId,
  roundId,
  memberId,
  participants,
  songs,
}: {
  bandId: string;
  roundId: string | null;
  memberId: string;
  participants: Participant[];
  songs: SongInput[];
}) {
  const parts = [...new Map(participants.map((participant) => [participant.partKey, participant])).values()];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>후보곡 등록</CardTitle>
        <p className="mt-1 text-sm text-slate-600">밴드 멤버 누구나 후보곡을 추가할 수 있습니다.</p>
        <ActionForm action={addSongAction} className="mt-4 sm:grid-cols-2">
          <input type="hidden" name="band_id" value={bandId} />
          <label className="text-sm font-semibold">곡 제목<input name="title" maxLength={120} required className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-semibold">아티스트<input name="artist" maxLength={120} required className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
        </ActionForm>
      </Card>

      {songs.map((song) => {
        const yes = song.votes.filter((vote) => vote.choice === 'yes').length;
        const no = song.votes.filter((vote) => vote.choice === 'no').length;
        const mine = song.votes.find((vote) => vote.memberId === memberId);

        return (
          <Card key={song.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Link href={`/songs/${song.id}`} className="text-lg font-bold hover:text-blue-700">{song.title}</Link><p className="text-sm text-slate-500">{song.artist}</p></div>
              {roundId && <Badge>찬성 {yes} · 반대 {no} · 미응답 {Math.max(0, participants.length - yes - no)}</Badge>}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-bold">파트별 난이도</p>
              {parts.length ? <div className="grid gap-2 sm:grid-cols-2">
                {parts.map((part) => {
                  const meta = song.difficultyMeta?.[part.partKey];
                  return <ActionForm key={part.partKey} action={difficultyAction} submit={`${part.part} 난이도 저장`} className="rounded-xl bg-slate-50 p-3">
                    <input type="hidden" name="song_id" value={song.id} />
                    <input type="hidden" name="part_key" value={part.partKey} />
                    <input type="hidden" name="expected_version" value={meta?.version ?? 0} />
                    <label className="text-xs font-semibold">{part.part}<select name="difficulty" defaultValue={song.difficulties[part.partKey] ?? ''} required className="mt-1 min-h-10 w-full rounded-lg border px-2"><option value="" disabled>난이도 선택</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                    {meta && <p className="mt-2 text-xs text-slate-500">마지막 수정: {meta.updatedBy ?? '알 수 없는 멤버'} · {new Date(meta.updatedAt).toLocaleString('ko-KR')} · v{meta.version}</p>}
                  </ActionForm>;
                })}
              </div> : <p className="text-sm text-slate-500">등록된 밴드 파트가 없습니다.</p>}
            </div>

            {roundId && <div className="mt-5 border-t pt-4">
              <p className="mb-2 text-sm font-bold">내 투표</p>
              <ActionForm action={voteAction} submit="투표 저장">
                <input type="hidden" name="round_id" value={roundId} /><input type="hidden" name="song_id" value={song.id} />
                <label className="text-sm">찬반<select name="choice" defaultValue={mine?.choice ?? 'yes'} className="mt-1 min-h-11 w-full rounded-xl border px-3"><option value="yes">찬성</option><option value="no">반대</option></select></label>
                <label className="text-sm">반대 사유 (반대 선택 시 필수)<textarea name="reason" defaultValue={mine?.reason ?? ''} maxLength={300} className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2" /></label>
              </ActionForm>
            </div>}

            {roundId && song.votes.some((vote) => vote.choice === 'no') && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">반대 사유 보기</summary><ul className="mt-2 space-y-1">{song.votes.filter((vote) => vote.choice === 'no').map((vote) => <li key={vote.memberId} className="text-slate-600">{participants.find((participant) => participant.id === vote.memberId)?.nickname ?? '멤버'}: {vote.reason}</li>)}</ul></details>}
          </Card>
        );
      })}
      {songs.length === 0 && <Card><CardTitle>아직 등록된 후보곡이 없습니다</CardTitle><p className="mt-2 text-sm text-slate-500">위에서 첫 후보곡을 등록할 수 있습니다.</p></Card>}
    </div>
  );
}
