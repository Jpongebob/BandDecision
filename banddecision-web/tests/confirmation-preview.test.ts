// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({saveLivePlanAction:vi.fn(async()=>({}))}));
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import type {LivePlanning,SavedPlan} from '../src/lib/live-planning';
const data:LivePlanning={band_id:'band',version:1,members:[{id:'one',userId:'u',nickname:'One',part:'기타',partKey:'기타',skill:3},{id:'two',userId:'v',nickname:'Two',part:'기타',partKey:'기타',skill:3}],unavailable:[{memberId:'two',date:'2026-11-06',reason:'work'},{memberId:'one',date:'2026-11-07',reason:'class'}],songs:[]};
const props={data,songs:[],today:'2026-11-05'};
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
function choose(day:string){fireEvent.click(screen.getByRole('button',{name:/달력에서 날짜 선택|2026-11-/}));fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+day+' ·')}));}
const button=()=>screen.getByRole('button',{name:'합주 날짜 확정'}) as HTMLButtonElement;
afterEach(cleanup);
describe('direct date-only confirmation',()=>{
 it('allows immediate date-only confirmation with no preview or required songs',()=>{const view=render(createElement(ConfirmPlanForm,props));expect(button().disabled).toBe(true);choose('2026-11-05');expect(button().disabled).toBe(false);expect(screen.queryByText(/미리보기/)).toBeNull();expect(view.container.querySelectorAll('input[name=song_id]')).toHaveLength(0);});
 it('shows attendance immediately and does not reuse acknowledgement after changing date',()=>{render(createElement(ConfirmPlanForm,props));choose('2026-11-06');expect(button().disabled).toBe(true);fireEvent.click(screen.getByLabelText(/부분 참석으로 진행/));expect(button().disabled).toBe(false);choose('2026-11-07');expect(button().disabled).toBe(true);expect((screen.getByLabelText(/부분 참석으로 진행/) as HTMLInputElement).checked).toBe(false);});
 it('edits an existing plan with its version and retains existing selected songs',()=>{const plan:SavedPlan={id:'p',version:4,rehearsal_date:'2026-11-05',starts_at:'20:00',ends_at:'22:00',participant_count:2,attendee_count:2,confirmed_plan_members:[],confirmed_plan_songs:[{id:'s',source_song_id:1,title_snapshot:'Saved song',artist_snapshot:'Band',display_order:1}]};const view=render(createElement(ConfirmPlanForm,{...props,plan}));expect(view.container.querySelector('input[name=plan_id]')?.getAttribute('value')).toBe('p');expect(view.container.querySelector('input[name=plan_version]')?.getAttribute('value')).toBe('4');expect((screen.getByLabelText(/Saved song/) as HTMLInputElement).checked).toBe(true);expect(screen.getByRole('button',{name:'계획 수정 저장'})).toBeTruthy();});
});


describe('automatically visible compact date suggestions',()=>{
 it('shows five recommended options immediately with no extra reveal step',()=>{
  const view=render(createElement(ConfirmPlanForm,props));
  expect(screen.getByRole('group',{name:'추천 날짜'})).toBeTruthy();
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(screen.getAllByRole('radio')[0].closest('details')).toBeNull();
  expect(view.container.querySelectorAll('input[name=recommended_date]')).toHaveLength(5);
 });
 it('selecting a suggestion updates the calendar and enables date-only confirmation',()=>{
  render(createElement(ConfirmPlanForm,props));
  fireEvent.click(screen.getByRole('radio',{name:/2026-11-05/}));
  expect((document.querySelector('input[name=date]') as HTMLInputElement).value).toBe('2026-11-05');
  expect(button().disabled).toBe(false);
  expect(screen.getByRole('radio',{name:/2026-11-05/}).getAttribute('value')).toBe('2026-11-05');
 });
 it('sorts by attendance and leaves existing dates untouched until selected',()=>{
  render(createElement(ConfirmPlanForm,props));
  const radios=screen.getAllByRole('radio') as HTMLInputElement[];
  expect(radios.map(r=>r.value)).toEqual(['2026-11-05','2026-11-08','2026-11-09','2026-11-10','2026-11-11']);
  expect((document.querySelector('input[name=date]') as HTMLInputElement).value).toBe('');
 });
 it('clears earlier partial-attendance consent when a suggested date is selected',()=>{
  const view=render(createElement(ConfirmPlanForm,props));
  choose('2026-11-06');
  fireEvent.click(screen.getByLabelText(/부분 참석으로 진행/));
  fireEvent.click(screen.getByRole('radio',{name:/2026-11-08/}));
  expect((view.container.querySelector('input[name=ack_partial]') as HTMLInputElement).value).toBe('false');
  expect(button().disabled).toBe(false);
 });
});

it('calendar includes days beyond top five and disables dates with no attendees',()=>{
 const view=render(createElement(ConfirmPlanForm,{...props,data:{...data,unavailable:[...data.unavailable,{memberId:'one',date:'2026-11-12',reason:'x'},{memberId:'two',date:'2026-11-12',reason:'x'}]}}));
 fireEvent.click(screen.getByRole('button',{name:'달력에서 날짜 선택'}));
 expect((screen.getByRole('button',{name:'2026-11-12 · 0/2명'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
 fireEvent.click(screen.getByRole('button',{name:'2026-12-30 · 2/2명'}));
 expect((view.container.querySelector('input[name=date]') as HTMLInputElement).value).toBe('2026-12-30');
 expect(button().disabled).toBe(false);
});

it('keeps recommendation eligibility unchanged for new-plan song choices',()=>{const waiting={id:3,title:'Waiting song',artist:'Band',votes:[],difficulties:{},status:'waiting_votes' as const,yesCount:0,noCount:0,pendingCount:2,burden:null,score:null,requiredYes:2};const view=render(createElement(ConfirmPlanForm,{...props,songs:[waiting]}));expect(view.container.querySelector('input[name=song_id]')).toBeNull();expect(screen.getByText(/추천 조건을 갖춘 곡이 없습니다/)).toBeTruthy();});
