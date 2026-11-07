// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/actions',()=>({addSongAction:vi.fn(async()=>({})),difficultyAction:vi.fn(async()=>({success:'difficulty saved'})),voteAction:vi.fn(async()=>({success:'vote saved'}))}));
vi.mock('@/app/live-actions',()=>({liveVoteAction:vi.fn(async()=>({success:'vote saved'})),withdrawSongVoteAction:vi.fn(async()=>({success:'withdrawn'}))}));
import { SongList } from '../src/components/song-list';
import type { Participant, SongInput } from '../src/services/recommendations';
afterEach(cleanup);
const participants:Participant[]=[{id:'m',userId:'u',nickname:'Me',part:'기타',partKey:'기타',skill:3}];
const song:SongInput={id:1,title:'Test',artist:'Band',difficulties:{'기타':2},difficultyMeta:{'기타':{version:1,updatedAt:'2026-11-05T00:00:00Z',updatedBy:'A'}},votes:[{memberId:'m',choice:'yes'}]};
const props={difficultyEnabled:true,detailed:true,bandId:'band',memberId:'m',participants,songs:[song]};
const pressed=(name:string)=>screen.getByRole('button',{name}).getAttribute('aria-pressed');
describe('saved song form refresh consistency',()=>{
 it('removes difficulty fields while off and restores saved values after enabling again',()=>{
  const view=render(createElement(SongList,props));
  expect((view.container.querySelector('select[name="difficulty"]') as HTMLSelectElement).value).toBe('2');
  view.rerender(createElement(SongList,{...props,difficultyEnabled:false}));
  expect(view.container.querySelector('select[name="difficulty"]')).toBeNull();
  expect(screen.getByRole('button',{name:'찬성'})).toBeTruthy();
  view.rerender(createElement(SongList,props));
  expect((view.container.querySelector('select[name="difficulty"]') as HTMLSelectElement).value).toBe('2');
  expect((view.container.querySelector('input[name="expected_version"]') as HTMLInputElement).value).toBe('1');
 });

 it('resets a draft when the signed-in member changes',()=>{
  const unvoted={...song,votes:[]};
  const view=render(createElement(SongList,{...props,songs:[unvoted]}));
  fireEvent.click(screen.getByRole('button',{name:'반대'}));
  fireEvent.change(view.container.querySelector('textarea[name="reason"]')!,{target:{value:'old draft'}});
  view.rerender(createElement(SongList,{...props,memberId:'next',participants:[{...participants[0],id:'next'}],songs:[unvoted]}));
  expect(pressed('반대')).toBe('false');
  expect(view.container.querySelector('textarea[name="reason"]')).toBeNull();
 });
 it('offers immediate voting when a member joins the current roster',()=>{
  render(createElement(SongList,{...props,memberId:'new-member',participants:[...participants,{...participants[0],id:'new-member'}]}));
  expect(screen.getByRole('button',{name:'찬성'}).getAttribute('type')).toBe('submit');
  expect(pressed('찬성')).toBe('false');
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
  expect(pressed('찬성')).toBe('true');
  view.rerender(createElement(SongList,{...props,songs:[{...song,votes:[{memberId:'m',choice:'no',reason:'새 사유'}]}]}));
  expect(pressed('반대')).toBe('true');
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
  fireEvent.submit(view.container.querySelector('form[data-vote-editor]')!);
  await screen.findByText('vote saved');
  view.rerender(createElement(SongList,{...props,songs:[{...song,votes:[{memberId:'m',choice:'no',reason:'saved reason'}]}]}));
  expect(screen.getByText('vote saved')).toBeTruthy();
  expect(pressed('반대')).toBe('true');
 });
});

it('list contains summaries and detail links instead of repeated editors',()=>{const view=render(createElement(SongList,{...props,detailed:false}));expect(view.container.querySelector('select[name=difficulty]')).toBeNull();expect(view.container.querySelector('form[data-vote-editor]')).toBeNull();expect(screen.getByRole('link',{name:/Test/}).getAttribute('href')).toBe('/songs/1');});
it('list offers one-tap voting only for songs I have not voted on',()=>{const view=render(createElement(SongList,{...props,detailed:false,songs:[{...song,votes:[]}]}));expect(view.container.querySelectorAll('form[data-vote-editor]')).toHaveLength(1);expect(screen.getByText('미투표')).toBeTruthy();});
