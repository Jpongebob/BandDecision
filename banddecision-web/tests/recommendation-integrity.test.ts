import { describe, expect, it } from 'vitest';
import { recommendSongs, type Participant, type SongInput } from '../src/services/recommendations';

const participants: Participant[] = ['one', 'two'].map(id => ({ id, userId: id, nickname: id, part: '기타', partKey: 'guitar', skill: 3 }));
const candidate: SongInput = { id: 1, title: '곡', artist: '밴드', difficulties: { guitar: 3 }, votes: [{ memberId: 'one', choice: 'yes' }, { memberId: 'two', choice: 'yes' }] };
describe('recommendation input integrity', () => {
  it('does not count an outsider vote as a missing participant response', () => {
    const result = recommendSongs(participants, [{ ...candidate, votes: [{ memberId: 'one', choice: 'yes' }, { memberId: 'outsider', choice: 'yes' }] }]);
    expect(result[0]).toMatchObject({ status: 'waiting_votes', yesCount: 1, pendingCount: 1, score: null });
  });
  it('does not count the same participant twice', () => {
    const result = recommendSongs(participants, [{ ...candidate, votes: [{ memberId: 'one', choice: 'yes' }, { memberId: 'one', choice: 'yes' }] }]);
    expect(result[0]).toMatchObject({ status: 'waiting_votes', yesCount: 1, pendingCount: 1 });
  });
  it('requires an own difficulty entry even when a part name matches an Object prototype key', () => {
    const team = participants.map(member => ({ ...member, partKey: 'constructor' }));
    expect(recommendSongs(team, [{ ...candidate, difficulties: {} }])[0]?.status).toBe('difficulty_pending');
    expect(recommendSongs(team, [{ ...candidate, difficulties: { constructor: 3 } }])[0]).toMatchObject({ status: 'eligible', score: 6 });
  });
  it.each([0, 6, Number.NaN, 2.5])('rejects malformed difficulty %s rather than producing an invalid score', difficulty => {
    expect(recommendSongs(participants, [{ ...candidate, difficulties: { guitar: difficulty } }])[0]).toMatchObject({ status: 'difficulty_pending', score: null });
  });
});
