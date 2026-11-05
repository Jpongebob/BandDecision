// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/actions', () => ({ confirmPlanAction: vi.fn(async () => ({})) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ConfirmPlanForm } from '../src/components/confirm-plan-form';
import type { DateRecommendation, Participant, SongRanking } from '../src/services/recommendations';

const one: Participant = { id: 'one', userId: 'one', nickname: 'One', part: '기타', partKey: 'guitar', skill: 3 };
const two = { ...one, id: 'two', userId: 'two', nickname: 'Two' };
const dates: DateRecommendation[] = [
  { date: '2026-11-05', attendanceCount: 1, attendees: [one], absentees: [{ ...two, reason: 'work' }] },
  { date: '2026-11-06', attendanceCount: 1, attendees: [two], absentees: [{ ...one, reason: 'class' }] },
];
const songs: SongRanking[] = [1, 2].map(id => ({
  id, title: id === 1 ? 'Song A' : 'Song B', artist: 'Artist', difficulties: { guitar: 3 }, votes: [],
  status: 'eligible', yesCount: 2, noCount: 0, pendingCount: 0, burden: 0, score: 6, requiredYes: 2,
}));
function preview() { fireEvent.click(screen.getByRole('button', { name: '선택 내용 미리보기' })); }
function confirmButton() { return screen.getByRole('button', { name: '이 계획으로 확정' }) as HTMLButtonElement; }
afterEach(cleanup);
describe('confirmation acknowledgement boundaries', () => {
  it('does not reuse a partial-attendance acknowledgement for another date', () => {
    render(createElement(ConfirmPlanForm, { roundId: 'round', version: 1, participantCount: 2, dates, songs }));
    fireEvent.click(screen.getByLabelText(/Song A/));
    preview();
    fireEvent.click(screen.getByLabelText(/부분 참석 계획/));
    expect(confirmButton().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText(/합주 날짜/), { target: { value: '2026-11-06' } });
    expect(screen.queryByRole('button', { name: '이 계획으로 확정' })).toBeNull();
    preview();
    expect((screen.getByLabelText(/부분 참석 계획/) as HTMLInputElement).checked).toBe(false);
    expect(confirmButton().disabled).toBe(true);
  });
  it('requires a fresh preview and acknowledgement after changing selected songs', () => {
    render(createElement(ConfirmPlanForm, { roundId: 'round', version: 1, participantCount: 2, dates, songs }));
    fireEvent.click(screen.getByLabelText(/Song A/)); preview();
    fireEvent.click(screen.getByLabelText(/부분 참석 계획/));
    fireEvent.click(screen.getByLabelText(/Song B/));
    expect(screen.queryByRole('button', { name: '이 계획으로 확정' })).toBeNull();
    preview();
    expect(confirmButton().disabled).toBe(true);
  });
});
