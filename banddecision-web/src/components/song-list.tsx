import {DeleteSongForm} from '@/components/delete-song-form';
import {SongVoteFields} from '@/components/song-vote-fields';
import { liveVoteAction as voteAction,withdrawSongVoteAction,setSongConfirmationAction } from '@/app/live-actions';
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActionForm } from '@/components/action-form';
import { addSongAction, difficultyAction } from '@/app/actions';
import type { Participant, SongInput } from '@/services/recommendations';

export function SongList({
  bandId,
  memberId,
  participants,
  songs,
  detailed=false,
  difficultyEnabled=false,
  emptyText,
  canManage=false,
  register=true,
}: {
  bandId: string;
  memberId: string;
  participants: Participant[];
  songs: SongInput[];
  detailed?: boolean;
  difficultyEnabled?: boolean;
  emptyText?:string;
  canManage?:boolean;
  register?:boolean;
}) {
  const parts = [...new Map(participants.map((participant) => [participant.partKey, participant])).values()];

  const canVote = participants.some(participant => participant.id === memberId);

  return (
    <div className="space-y-4">
      {!detailed&&register&&<Card className="p-3 sm:p-4"><details open><summary className="cursor-pointer text-sm font-semibold">후보곡 등록</summary>
        <p className="mt-1 text-sm text-slate-600">밴드 멤버 누구나 후보곡을 추가할 수 있습니다.</p>
        <ActionForm action={addSongAction} className="mt-4 sm:grid-cols-2">
          <input type="hidden" name="band_id" value={bandId} />
          <label className="text-sm font-semibold">곡 제목<input name="title" maxLength={120} required className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-semibold">아티스트<input name="artist" maxLength={120} required className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
        </ActionForm></details>
      </Card>}



      {songs.map((song) => {
        const yes = song.votes.filter((vote) => vote.choice === 'yes').length;
        const no = song.votes.filter((vote) => vote.choice === 'no').length;
        const mine = song.votes.find((vote) => vote.memberId === memberId);

        return (
          <Card key={song.id} data-song-id={song.id} className="p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Link href={`/songs/${song.id}`} className="break-all text-base font-bold hover:text-blue-700">{song.title}</Link>{song.confirmedAt&&<span className="ml-2 text-xs font-semibold text-emerald-700">확정곡</span>}<p className="text-sm text-slate-500">{song.artist}</p></div>
              {!song.confirmedAt&&<Badge>찬성 {yes} · 반대 {no} · 미응답 {Math.max(0, participants.length - yes - no)}</Badge>}
            </div>

            {!detailed&&<>{difficultyEnabled&&<p className="mt-2 text-xs leading-5 text-slate-500">{parts.map(p=>p.part+' '+(song.difficulties[p.partKey]??'미등록')).join(' · ')}</p>}<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span>{song.confirmedAt?'추가 투표 없이 계획에 선택 가능':'내 투표: '+(mine?(mine.choice==='yes'?'찬성':'반대'):'미투표')}</span><Link className="inline-flex min-h-9 items-center rounded-lg bg-blue-50 px-3 font-semibold text-blue-700" href={`/songs/${song.id}`}>{song.confirmedAt?'곡 상세':'곡 상세 · 투표 수정'}</Link></div></>}
            {canManage&&(detailed||song.confirmedAt)&&<ActionForm action={setSongConfirmationAction} submit={song.confirmedAt?'확정 목록에서 삭제':'이 곡 확정'} className="mt-3 max-w-md gap-2"><input type="hidden" name="song_id" value={song.id}/><input type="hidden" name="confirmed" value={song.confirmedAt?'false':'true'}/>{detailed&&<p className="text-xs text-slate-500">{song.confirmedAt?'삭제하면 후보 상태로 돌아갑니다. 이미 저장된 합주 계획은 유지됩니다.':'밴드장이 직접 결정한 곡은 추천 조건과 관계없이 합주 계획에 넣을 수 있습니다.'}</p>}</ActionForm>}
            {detailed&&difficultyEnabled&&<details open className="mt-3"><summary className="cursor-pointer text-sm font-semibold">파트별 난이도 <span className="font-normal text-slate-500">{parts.map(p=>p.part+' '+(song.difficulties[p.partKey]??'미등록')).join(' · ')}</span></summary><div className="mt-3">
              {parts.length ? <div className="grid gap-2 sm:grid-cols-2">
                {parts.map((part) => {
                  const meta = song.difficultyMeta?.[part.partKey];
                  return <ActionForm key={part.partKey} action={difficultyAction} submit={`${part.part} 난이도 저장`} className="rounded-xl bg-slate-50 p-3">
                    <input type="hidden" name="song_id" value={song.id} />
                    <input type="hidden" name="part_key" value={part.partKey} />
                    <input type="hidden" name="expected_version" value={meta?.version ?? 0} />
                    <label className="text-xs font-semibold">{part.part}<select key={meta?.version??0} name="difficulty" defaultValue={song.difficulties[part.partKey] ?? ''} required className="mt-1 min-h-10 w-full rounded-lg border px-2"><option value="" disabled>난이도 선택</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                    {meta && <p className="mt-2 text-xs text-slate-500">마지막 수정: {meta.updatedBy ?? '알 수 없는 멤버'} · {new Date(meta.updatedAt).toLocaleString('ko-KR')} · v{meta.version}</p>}
                  </ActionForm>;
                })}
              </div> : <p className="text-sm text-slate-500">등록된 밴드 파트가 없습니다.</p>}
            </div></details>}

            {detailed&&!song.confirmedAt&&canVote && <div className="mt-3 border-t pt-3"><p className="text-xs text-slate-600">내 투표: {mine?(mine.choice==='yes'?'찬성':'반대'):'미투표'}</p>
              <details open className="mt-2" data-vote-editor><summary className="min-h-9 cursor-pointer text-sm font-semibold text-blue-700">{mine?'투표 수정':'투표하기'}</summary>
              <ActionForm key={memberId} action={voteAction} submit={mine?'투표 수정 저장':'투표 저장'} className="mt-2 max-w-lg gap-3">
                <input type="hidden" name="song_id" value={song.id}/>
                <SongVoteFields key={JSON.stringify([memberId,mine?.choice,mine?.reason])} choice={mine?.choice} reason={mine?.reason}/>
              </ActionForm>
              {mine&&<ActionForm action={withdrawSongVoteAction} submit="내 투표 취소" className="mt-3 max-w-lg gap-2"><input type="hidden" name="song_id" value={song.id}/><p className="text-xs text-slate-500">취소하면 미투표 상태로 돌아갑니다.</p></ActionForm>}
              </details></div>}

            {detailed&&song.confirmedAt&&<p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">확정곡입니다. 추가 투표 없이 합주 계획에서 바로 선택할 수 있습니다.</p>}
            {detailed&&!song.confirmedAt&&song.votes.some((vote) => vote.choice === 'no') && <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">반대 사유 보기</summary><ul className="mt-2 space-y-1">{song.votes.filter((vote) => vote.choice === 'no').map((vote) => <li key={vote.memberId} className="text-slate-600">{participants.find((participant) => participant.id === vote.memberId)?.nickname ?? '멤버'}: {vote.reason}</li>)}</ul></details>}
            {detailed&&canManage&&<DeleteSongForm songId={song.id} title={song.title} artist={song.artist}/>}
          </Card>
        );
      })}
      {songs.length === 0 && <Card><CardTitle>{emptyText??'아직 등록된 후보곡이 없습니다'}</CardTitle><p className="mt-2 text-sm text-slate-500">{emptyText?'전체 곡에서 내 투표를 확인하거나 수정할 수 있습니다.':'위에서 첫 후보곡을 등록할 수 있습니다.'}</p></Card>}
    </div>
  );
}
