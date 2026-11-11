// @vitest-environment jsdom
import {createElement} from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const save=vi.hoisted(()=>vi.fn(async()=>({success:'계획을 저장했습니다.'} as {success?:string;error?:string})));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/app/live-actions',()=>({saveLivePlanAction:save}));
import {ConfirmPlanForm,NewPlanForm} from '../src/components/confirm-plan-form';
import type {SavedPlan} from '../src/lib/live-planning';
afterEach(()=>{cleanup();save.mockClear();});

const members=[{id:'a',userId:'ua',nickname:'Ann',part:'기타',partKey:'기타',skill:null},{id:'b',userId:'ub',nickname:'Bo',part:'베이스',partKey:'베이스',skill:null}];
// Nobody saved the 20th any more (the plan's own day); both can come on the 21st and 22nd.
const data={band_id:'band',version:3,members,available:['2026-11-21','2026-11-22'].flatMap(date=>[{memberId:'a',date},{memberId:'b',date}]),songs:[]};
const member=(id:string,name:string)=>({id:'r'+id,source_member_id:id,nickname_snapshot:name,part_snapshot:'',attending:true,reason_snapshot:null});
const plan:SavedPlan={id:'p1',version:1,rehearsal_date:'2026-11-20',location:'Room',memo:null,starts_at:'20:00:00',ends_at:'22:00:00',participant_count:2,attendee_count:2,confirmed_plan_members:[member('a','Ann'),member('b','Bo')],confirmed_plan_songs:[]};
const cell=(day:string)=>document.querySelector('[data-day="'+day+'"]') as HTMLButtonElement;

describe('plan calendar',()=>{
 it('the plan keeps its own day selectable even when nobody saved it',()=>{
  render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}));
  fireEvent.click(cell('2026-11-21'));
  expect(cell('2026-11-20').disabled).toBe(false);
  fireEvent.click(cell('2026-11-20'));
  expect(document.querySelector('[data-saved-attendance]')).toBeTruthy();
 });
 it('other plans\' days are green and still selectable; the edited plan\'s own day is not marked',()=>{
  render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan,takenDates:['2026-11-22']}));
  expect(cell('2026-11-22').dataset.taken).toBe('true');expect(cell('2026-11-22').className).toContain('bg-plan-bg');expect(cell('2026-11-22').disabled).toBe(false);
  expect(cell('2026-11-20').dataset.taken).toBeUndefined();
  expect(document.body.textContent).toContain('같은 날 한 번 더 정할 수도 있어요');
 });
 it('moving the date says the rehearsal moves; a new plan says nothing about moving',()=>{
  render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}));
  expect(document.querySelector('[data-date-move]')).toBeNull();
  fireEvent.click(cell('2026-11-21'));
  expect(document.querySelector('[data-date-move]')?.textContent).toBe('이 합주를 11월 20일 (금)에서 11월 21일 (토)로 옮겨요. 참석자는 새 날짜에 가능한 멤버로 다시 정해져요.');
  cleanup();
  render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10'}));
  fireEvent.click(cell('2026-11-21'));
  expect(document.querySelector('[data-date-move]')).toBeNull();
 });
});

describe('new plan form',()=>{
 it('starts empty again after a save',async()=>{
  render(createElement(NewPlanForm,{data,songs:[],today:'2026-11-10'}));
  fireEvent.click(cell('2026-11-21'));
  fireEvent.change(document.querySelector('input[name="location"]')!,{target:{value:'Studio'}});
  fireEvent.change(document.querySelector('textarea[name="memo"]')!,{target:{value:'Goal'}});
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'이 날로 확정하기'}));});
  expect(save).toHaveBeenCalledTimes(1);
  expect((document.querySelector('input[name="location"]') as HTMLInputElement).value).toBe('');
  expect((document.querySelector('textarea[name="memo"]') as HTMLTextAreaElement).value).toBe('');
  expect(document.body.textContent).toContain('날짜를 골라 주세요');
 });
});

describe('edit form and newer plan versions',()=>{
 it('refills from a newer saved plan and still closes the sheet after its own save',async()=>{
  Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');}});
  const dialog=document.createElement('dialog');dialog.setAttribute('open','');document.body.appendChild(dialog);
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}),{container:dialog});
  fireEvent.change(document.querySelector('textarea[name="memo"]')!,{target:{value:'Mine'}});
  // Save here: the action succeeds and the page brings version 2 in the same update.
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'계획 수정 저장'}));view.rerender(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan:{...plan,version:2,memo:'Mine'}}));});
  expect(dialog.hasAttribute('open')).toBe(false);
  // Another device changes the plan later: the fields follow the newest saved values.
  view.rerender(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan:{...plan,version:3,memo:'From phone',location:'Room 2'}}));
  expect((document.querySelector('textarea[name="memo"]') as HTMLTextAreaElement).value).toBe('From phone');
  expect((document.querySelector('input[name="location"]') as HTMLInputElement).value).toBe('Room 2');
  dialog.remove();
 });
});
