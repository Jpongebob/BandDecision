// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({saveLivePlanAction:vi.fn(async()=>({}))}));
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import type {LivePlanning,SavedPlan} from '../src/lib/live-planning';
import {dayLabel} from '../src/lib/day-format';
const data:LivePlanning={band_id:'band',version:1,members:[{id:'one',userId:'u',nickname:'One',part:'기타',partKey:'기타',skill:3},{id:'two',userId:'v',nickname:'Two',part:'기타',partKey:'기타',skill:3}],available:Array.from({length:57},(_,i)=>new Date(Date.UTC(2026,10,5+i)).toISOString().slice(0,10)).flatMap(date=>['one','two'].filter(memberId=>!(date==='2026-11-06'&&memberId==='two')&&!(date==='2026-11-07'&&memberId==='one')).map(memberId=>({date,memberId}))),songs:[]};
const props={data,songs:[],today:'2026-11-05'};
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
const esc=(s:string)=>s.replace(/[()]/g,'\\$&');
// Calendar cells are labelled "11월 5일 (목), 2/2명 참석"; recommended cards "11월 5일 (목) · 2/2명 참석".
function choose(day:string){fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+esc(dayLabel(day))+', ')}));}
const radio=(day:string)=>screen.getByRole('radio',{name:new RegExp('^'+esc(dayLabel(day)))});
const button=()=>screen.getByRole('button',{name:'이 날로 확정하기'}) as HTMLButtonElement;
afterEach(cleanup);
describe('direct date-only confirmation',()=>{
 it('allows immediate date-only confirmation with no preview or required songs',()=>{const view=render(createElement(ConfirmPlanForm,props));expect(button().disabled).toBe(true);choose('2026-11-05');expect(button().disabled).toBe(false);expect(screen.queryByText(/미리보기/)).toBeNull();expect(view.container.querySelectorAll('input[name=song_id]')).toHaveLength(0);});
 it('shows attendance immediately and does not reuse acknowledgement after changing date',()=>{render(createElement(ConfirmPlanForm,props));choose('2026-11-06');expect(button().disabled).toBe(true);fireEvent.click(screen.getByLabelText(/참석 가능한 멤버만으로 진행/));expect(button().disabled).toBe(false);choose('2026-11-07');expect(button().disabled).toBe(true);expect((screen.getByLabelText(/참석 가능한 멤버만으로 진행/) as HTMLInputElement).checked).toBe(false);});
 it('edits an existing plan with its version and retains existing selected songs',()=>{const plan:SavedPlan={id:'p',version:4,rehearsal_date:'2026-11-05',starts_at:'20:00',ends_at:'22:00',participant_count:2,attendee_count:2,confirmed_plan_members:[],confirmed_plan_songs:[{id:'s',source_song_id:1,title_snapshot:'Saved song',artist_snapshot:'Band',display_order:1}]};const view=render(createElement(ConfirmPlanForm,{...props,plan}));expect(view.container.querySelector('input[name=plan_id]')?.getAttribute('value')).toBe('p');expect(view.container.querySelector('input[name=plan_version]')?.getAttribute('value')).toBe('4');expect(screen.getByRole('button',{name:/Saved song/}).getAttribute('aria-pressed')).toBe('true');expect(view.container.querySelector('input[name=song_id]')?.getAttribute('value')).toBe('1');expect(screen.getByRole('button',{name:'계획 수정 저장'})).toBeTruthy();});
});

describe('automatically visible compact date suggestions',()=>{
 it('shows four recommended options immediately with no extra reveal step',()=>{
  const view=render(createElement(ConfirmPlanForm,props));
  expect(screen.getByRole('group',{name:'추천 날짜'})).toBeTruthy();
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  expect(screen.getAllByRole('radio')[0].closest('details')).toBeNull();
  expect(view.container.querySelectorAll('input[name=recommended_date]')).toHaveLength(4);
 });
 it('selecting a suggestion updates the calendar and enables date-only confirmation',()=>{
  render(createElement(ConfirmPlanForm,props));
  fireEvent.click(radio('2026-11-05'));
  expect((document.querySelector('input[name=date]') as HTMLInputElement).value).toBe('2026-11-05');
  expect(button().disabled).toBe(false);
  expect(radio('2026-11-05').getAttribute('value')).toBe('2026-11-05');
  expect(screen.getByRole('button',{name:new RegExp('^'+esc(dayLabel('2026-11-05'))+', ')}).getAttribute('aria-pressed')).toBe('true');
 });
 it('sorts by attendance and leaves existing dates untouched until selected',()=>{
  render(createElement(ConfirmPlanForm,props));
  const radios=screen.getAllByRole('radio') as HTMLInputElement[];
  expect(radios.map(r=>r.value)).toEqual(['2026-11-05','2026-11-08','2026-11-09','2026-11-10']);
  expect((document.querySelector('input[name=date]') as HTMLInputElement).value).toBe('');
 });
 it('skips dates that already have a rehearsal',()=>{
  render(createElement(ConfirmPlanForm,{...props,takenDates:['2026-11-08']}));
  expect((screen.getAllByRole('radio') as HTMLInputElement[]).map(r=>r.value)).toEqual(['2026-11-05','2026-11-09','2026-11-10','2026-11-11']);
  expect(screen.getByRole('button',{name:/^11월 8일 \(일\), 2\/2명 참석, 이미 합주 있음$/})).toBeTruthy();
 });
 it('clears earlier partial-attendance consent when a suggested date is selected',()=>{
  const view=render(createElement(ConfirmPlanForm,props));
  choose('2026-11-06');
  fireEvent.click(screen.getByLabelText(/참석 가능한 멤버만으로 진행/));
  fireEvent.click(radio('2026-11-08'));
  expect((view.container.querySelector('input[name=ack_partial]') as HTMLInputElement).value).toBe('false');
  expect(button().disabled).toBe(false);
 });
});

it('calendar includes days beyond the suggestions and disables dates with no attendees',()=>{
 const view=render(createElement(ConfirmPlanForm,{...props,data:{...data,available:data.available.filter(row=>row.date!=='2026-11-12')}}));
 expect((screen.getByRole('button',{name:'11월 12일 (목), 0/2명 참석'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
 fireEvent.click(screen.getByRole('button',{name:'12월 30일 (수), 2/2명 참석'}));
 expect((view.container.querySelector('input[name=date]') as HTMLInputElement).value).toBe('2026-12-30');
 expect(button().disabled).toBe(false);
});

it('keeps recommendation eligibility unchanged for new-plan song choices',()=>{const waiting={id:3,title:'Waiting song',artist:'Band',votes:[],difficulties:{},status:'waiting_votes' as const,yesCount:0,noCount:0,pendingCount:2,burden:null,score:null,requiredYes:2};const view=render(createElement(ConfirmPlanForm,{...props,songs:[waiting]}));expect(view.container.querySelector('input[name=song_id]')).toBeNull();expect(screen.getByText(/투표를 통과한 곡이 아직 없어요/)).toBeTruthy();});
