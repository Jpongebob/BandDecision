import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), revalidate: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error('redirect:' + path); }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  rpc: mocks.rpc, auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut },
}) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import { removeMemberAction, transferLeaderAction, skillAction, leaveBandAction, submitUnavailableAction, voteAction, confirmPlanAction, deletePlanAction } from '../src/app/actions';

const band = '50000000-0000-4000-8000-000000000001';
const member = '50000000-0000-4000-8000-000000000002';
function form(fields: Record<string, string>, songs: string[] = []) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  songs.forEach(value => data.append('song_id', value));
  return data;
}
const transfer = { band_id: band, member_id: member, confirm_transfer: 'yes' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
});
describe('leadership handoff actions', () => {
  it('requires explicit confirmation before making a server request', async () => {
    expect((await transferLeaderAction({}, form({ ...transfer, confirm_transfer: '' }))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([{ member_id: 'not-a-member' }, { band_id: '' }])('rejects malformed handoff fields %j', async invalid => {
    expect((await transferLeaderAction({}, form({ ...transfer, ...invalid }))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves PIN leading zeroes, calls the transactional RPC and refreshes the complete app role state', async () => {
    await expect(transferLeaderAction({}, form(transfer))).rejects.toThrow('redirect:/settings/band?notice=leadership_transferred');
    expect(mocks.rpc).toHaveBeenCalledWith('transfer_leadership', { p_band: band, p_member: member });
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout');
  });
  it('allows a legacy no-code band to let the database validate a PIN-free handoff', async () => {
    await expect(transferLeaderAction({}, form({ ...transfer, admin_pin: '' }))).rejects.toThrow('redirect:/settings/band?notice=leadership_transferred');
    expect(mocks.rpc).toHaveBeenCalledWith('transfer_leadership', { p_band: band, p_member: member });
  });
  it('does not report success or revalidate when the database denies authority', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'FORBIDDEN' } });
    const result = await transferLeaderAction({}, form(transfer));
    expect(result.error).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('does not echo sensitive database diagnostics', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'private SQL contains a password', code: 'XX000' } });
    const result = await transferLeaderAction({}, form(transfer));
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain('password');
    expect(result.error).not.toContain('private SQL');
  });
});
describe('reviewed form boundaries', () => {
  it.each(['0', '6', '2.5', 'NaN'])('rejects invalid member skill %j before RPC', async skill => {
    expect((await skillAction({}, form({ member_id: member, skill }))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('sends an explicitly chosen valid skill, including the leader own member ID, to the server', async () => {
    expect((await skillAction({}, form({ member_id: member, skill: '4' }))).success).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith('update_member_skill', { p_member: member, p_skill: 4 });
  });
  it('rejects malformed availability JSON without touching saved data', async () => {
    expect((await submitUnavailableAction({}, form({ round_id: band, dates_json: '{broken' }))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects invalid calendar dates and whitespace reasons', async () => {
    for (const dates of [[{ date: '2026-02-30', reason: 'work' }], [{ date: '2026-11-05', reason: ' ' }]]) {
      expect((await submitUnavailableAction({}, form({ round_id: band, dates_json: JSON.stringify(dates) }))).error).toBeTruthy();
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('supports an explicitly empty none submission', async () => {
    expect((await submitUnavailableAction({}, form({ round_id: band, dates_json: '[]' }))).success).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith('save_unavailability', { p_round: band, p_dates: [], p_ack_outside: false });
  });
  it('requires a negative vote reason and deletes it on yes', async () => {
    expect((await voteAction({}, form({ round_id: band, song_id: '1', choice: 'no', reason: ' ' }))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
    await voteAction({}, form({ round_id: band, song_id: '1', choice: 'yes', reason: 'old reason' }));
    expect(mocks.rpc).toHaveBeenCalledWith('cast_vote', { p_round: band, p_song: 1, p_choice: 'yes', p_reason: null });
  });
  it('rejects duplicate song IDs and omitted version during finalization', async () => {
    const base = { round_id: band, date: '2026-11-05', version: '1' };
    expect((await confirmPlanAction({}, form(base, ['1', '1']))).error).toBeTruthy();
    expect((await confirmPlanAction({}, form({ ...base, version: '' }, ['1']))).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('does not redirect or claim success on a stale confirmation', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'ROUND_STALE' } });
    expect((await confirmPlanAction({}, form({ round_id: band, date: '2026-11-05', version: '4' }, ['1']))).error).toContain('변경');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('clears the Auth session after a successful band leave', async () => {
    await expect(leaveBandAction()).rejects.toThrow('redirect:/login');
    expect(mocks.rpc).toHaveBeenCalledWith('leave_band');
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]!);
  });
  it('keeps the session intact when leaving is denied', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'TRANSFER_LEADERSHIP_REQUIRED' } });
    await expect(leaveBandAction()).rejects.toThrow('redirect:/settings/band?notice=leave_failed');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});


describe('plan deletion and capacity actions',()=>{
 it.each([{plan_id:band,confirm_delete:''},{plan_id:'bad',confirm_delete:'yes'}])('requires a valid plan and explicit consent',async fields=>{
  expect((await deletePlanAction({},form(fields))).error).toBeTruthy();expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('deletes only the chosen plan and refreshes both lists',async()=>{
  expect((await deletePlanAction({},form({plan_id:band,confirm_delete:'yes'}))).success).toBeTruthy();
  expect(mocks.rpc).toHaveBeenCalledWith('delete_rehearsal_plan',{p_plan:band});
  expect(mocks.revalidate).toHaveBeenCalledWith('/plans');expect(mocks.revalidate).toHaveBeenCalledWith('/dashboard');
 });
 it('keeps the UI unchanged when deletion is denied',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'FORBIDDEN'}});
  expect((await deletePlanAction({},form({plan_id:band,confirm_delete:'yes'}))).error).toContain('권한');
  expect(mocks.revalidate).not.toHaveBeenCalled();
 });
 it('explains capacity failure without deleting or redirecting',async()=>{
  mocks.rpc.mockResolvedValue({error:{message:'PLAN_LIMIT_REACHED'}});
  expect((await confirmPlanAction({},form({round_id:band,date:'2026-11-05',version:'5'},['1']))).error).toContain('5개');
  expect(mocks.redirect).not.toHaveBeenCalled();expect(mocks.revalidate).not.toHaveBeenCalled();
 });
});

it('member removal requires explicit confirmation and a valid target before RPC',async()=>{
 for(const fields of [{member_id:member,confirm_remove:''},{member_id:'invalid',confirm_remove:'yes'}])expect((await removeMemberAction({},form(fields))).error).toBeTruthy();
 expect(mocks.rpc).not.toHaveBeenCalled();
 expect((await removeMemberAction({},form({member_id:member,confirm_remove:'yes'}))).success).toBeTruthy();
 expect(mocks.rpc).toHaveBeenCalledWith('remove_member',{p_member:member});
});
