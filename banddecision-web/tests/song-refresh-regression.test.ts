// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/actions',()=>({addSongAction:vi.fn(async()=>({})),difficultyAction:vi.fn(async()=>({success:'difficulty saved'})),voteAction:vi.fn(async()=>({success:'vote saved'}))}));
import { SongList } from '../src/components/song-list';
import type { Participant, SongInput } from '../src/services/recommendations';
afterEach(cleanup);
const participants:Participant[]=[{id:'m',userId:'u',nickname:'Me',part:'기타',partKey:'기타',skill:3}];
const song:SongInput={id:1,title:'Test',artist:'Band',difficulties:{'기타':2},difficultyMeta:{'기타':{version:1,updatedAt:'2026-11-05T00:00:00Z',updatedBy:'A'}},votes:[{memberId:'m',choice:'yes'}]};
const props={bandId:'band',roundId:'round',memberId:'m',participants,songs:[song]};
describe('saved song form refresh consistency',()=>{
 it('resets an unsaved vote draft when a new planning round starts',()=>{
  const unvoted={...song,votes:[]};
  const view=render(createElement(SongList,{...props,songs:[unvoted]}));
  fireEvent.change(view.container.querySelector('select[name="choice"]')!,{target:{value:'no'}});
  fireEvent.change(view.container.querySelector('textarea[name="reason"]')!,{target:{value:'old draft'}});
  view.rerender(createElement(SongList,{...props,roundId:'new-round',songs:[unvoted]}));
  expect((view.container.querySelector('select[name="choice"]') as HTMLSelectElement).value).toBe('yes');
  expect((view.container.querySelector('textarea[name="reason"]') as HTMLTextAreaElement).value).toBe('');
 });
 it('does not offer round voting to a newly joined member excluded from the frozen roster',()=>{
  const view=render(createElement(SongList,{...props,memberId:'new-member'}));
  expect(view.container.querySelector('select[name="choice"]')).toBeNull();
  expect(screen.getByText(/새 회차부터/)).toBeTruthy();
 });
 it('does not pair a stale difficulty input with a new expected_version',()=>{
  const view=render(createElement(SongList,props));
  const updated={...song,difficulties:{'기타':4},difficultyMeta:{'기타':{version:2,updatedAt:'2026-11-05T00:01:00Z',updatedBy:'B'}}};
  view.rerender(createElement(SongList,{...props,songs:[updated]}));
  expect((view.container.querySelector('input[name="expected_version"]') as HTMLInputElement).value).toBe('2');
  expect((view.container.querySelector('select[name="difficulty"]') as HTMLSelectElement).value).toBe('4');
 });
 it('updates both saved vote choice and reason when fresh server props arrive',()=>{
  const view=render(createElement(SongList,props));
  view.rerender(createElement(SongList,{...props,songs:[{...song,votes:[{memberId:'m',choice:'no',reason:'새 사유'}]}]}));
  expect((view.container.querySelector('select[name="choice"]') as HTMLSelectElement).value).toBe('no');
  expect((view.container.querySelector('textarea[name="reason"]') as HTMLTextAreaElement).value).toBe('새 사유');
 });
});


describe('saved song feedback survives refreshed props',()=>{
 it('keeps difficulty success visible while syncing input and version',async()=>{
  const view=render(createElement(SongList,props));
  fireEvent.submit(view.container.querySelector('form:has(select[name="difficulty"])')!);
  await screen.findByText('difficulty saved');
  view.rerender(createElement(SongList,{...props,songs:[{...song,difficulties:{'기타':4},difficultyMeta:{'기타':{version:2,updatedAt:'2026-11-05T00:01:00Z',updatedBy:'B'}}}]}));
  expect(screen.getByText('difficulty saved')).toBeTruthy();
  expect((view.container.querySelector('select[name="difficulty"]') as HTMLSelectElement).value).toBe('4');
 });
 it('keeps vote success after server saved choice changes',async()=>{
  const view=render(createElement(SongList,props));
  fireEvent.submit(view.container.querySelector('form:has(select[name="choice"])')!);
  await screen.findByText('vote saved');
  view.rerender(createElement(SongList,{...props,songs:[{...song,votes:[{memberId:'m',choice:'no',reason:'saved reason'}]}]}));
  expect(screen.getByText('vote saved')).toBeTruthy();
  expect((view.container.querySelector('select[name="choice"]') as HTMLSelectElement).value).toBe('no');
 });
});
