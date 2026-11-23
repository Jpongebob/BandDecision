// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/app/live-actions',()=>({saveAvailabilityChanges:vi.fn(),saveLivePlanAction:vi.fn()}));
import {answeredMonths,silentIn} from '../src/lib/availability-months';
import {ScheduleView} from '../src/components/schedule-view';
import {SchedulePlanner} from '../src/components/schedule-planner';
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
afterEach(cleanup);

const members=[{id:'me',nickname:'Me',part:'기타'},{id:'a',nickname:'Ann',part:'보컬'},{id:'b',nickname:'Bo',part:'드럼'},{id:'c',nickname:'Cy',part:'건반'}];
// today 2026-11-23. Ann answered both months; Bo only November (one past day counts); Cy nothing; I only December.
const available=[{memberId:'a',date:'2026-11-24'},{memberId:'a',date:'2026-12-02'},{memberId:'b',date:'2026-11-05'},{memberId:'me',date:'2026-12-02'},{memberId:'me',date:'2026-11-24'}];
const plans=[{date:'2026-11-28',attending:['나','Ann'],absent:['Bo','Cy'],attendingIds:['me','a'],absentIds:['b','c']}];
const props={today:'2026-11-23',members,available,memberId:'me',plans};

describe('미응답 is judged per month',()=>{
 it('a past day in the month counts; another month does not',()=>{
  const answered=answeredMonths(available);
  expect(silentIn(members,answered,'2026-11').map(m=>m.id)).toEqual(['c']);
  expect(silentIn(members,available,'2026-12').map(m=>m.id)).toEqual(['b','c']);
 });
 it('the 내 일정 day panel names the focused day\'s month',()=>{
  render(createElement(SchedulePlanner,props));
  const panel=screen.getByRole('region',{name:'선택한 날짜 현황'});
  expect(panel.textContent).toContain('미응답 1 · Cy · 11월 날짜를 아직 안 냈어요');
  fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
  fireEvent.click(document.querySelector('[data-day="2026-12-03"]')!);
  expect(panel.textContent).toContain('미응답 2 · Bo, Cy · 12월 날짜를 아직 안 냈어요');
 });
 it('the plan form counts 미응답 for the chosen day\'s month',()=>{
  const data={band_id:'band',version:1,members:members.map(m=>({...m,userId:'u'+m.id,partKey:m.part,skill:null})),available,songs:[]};
  render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-23'}));
  expect(document.body.textContent).toContain('Cy(건반) 님이 11월 날짜를 아직 안 냈어요');
  fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
  fireEvent.click(document.querySelector('[data-day="2026-12-02"]')!);
  expect(document.body.textContent).toContain('Bo(드럼), Cy(건반) 님이 12월 날짜를 아직 안 냈어요');
 });
});

describe('멤버별 (leader only)',()=>{
 it('only the leader gets the switch',()=>{
  render(createElement(ScheduleView,{...props,leader:false}));
  expect(screen.queryByRole('button',{name:'멤버별'})).toBeNull();
  expect(screen.getByRole('heading',{name:'내 일정'})).toBeTruthy();
 });
 it('phone: chips say 미응답 for the shown month, the calendar shows one member and plan attendance',()=>{
  render(createElement(ScheduleView,{...props,leader:true}));
  fireEvent.click(screen.getByRole('button',{name:'멤버별'}));
  const chips=screen.getByRole('group',{name:'멤버 고르기'});
  expect(within(chips).getByRole('button',{name:/Bo/}).textContent).toBe('Bo0일');
  expect(within(chips).getByRole('button',{name:/Cy/}).textContent).toBe('Cy미응답');
  fireEvent.click(within(chips).getByRole('button',{name:/Ann/}));
  const day=(d:string)=>document.querySelector('[data-member-day="'+d+'"]') as HTMLElement;
  expect(day('2026-11-24').dataset.state).toBe('yes');expect(day('2026-11-25').dataset.state).toBe('no');expect(day('2026-11-22').dataset.state).toBe('past');
  expect(day('2026-11-28').textContent).toContain('합주 참석');
  expect(document.querySelector('[data-member-summary="a"]')?.textContent).toContain('11월 1일 가능 · 12월 1일 가능');
  fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
  expect(within(chips).getByRole('button',{name:/Bo/}).textContent).toBe('Bo미응답');
  fireEvent.click(within(chips).getByRole('button',{name:/Bo/}));
  expect(document.querySelector('[data-month-silent]')?.textContent).toBe('Bo 님은 12월 날짜를 아직 안 냈어요');
 });
 it('PC: rows per member with month 미응답, a total row and the 미응답 list by month',()=>{
  render(createElement(ScheduleView,{...props,leader:true}));
  fireEvent.click(screen.getByRole('button',{name:'멤버별'}));
  const row=(id:string)=>document.querySelector('[data-member-row="'+id+'"]')!;
  expect(row('me').querySelector('button')?.textContent).toContain('나');
  expect(row('b').querySelector('button')?.textContent).toContain('12월 미응답');
  expect(row('c').querySelector('button')?.textContent).toContain('미응답');
  expect((row('a').querySelector('[data-cell="2026-11-28"]') as HTMLElement).dataset.state).toBe('plan-참석');
  expect((row('b').querySelector('[data-cell="2026-11-28"]') as HTMLElement).dataset.state).toBe('plan-불참');
  expect(document.querySelector('[data-total="2026-11-24"]')?.textContent).toBe('2');
  const silent=screen.getByRole('region',{name:'미응답'}).textContent;
  expect(silent).toContain('11월 1명 · Cy');expect(silent).toContain('12월 2명 · Bo, Cy');
  // Four weeks per page: 11/23–12/20, then 12/21–12/31.
  expect(screen.getByRole('heading',{name:'11월 23일 – 12월 20일'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'다음 4주'}));
  expect(screen.getByRole('heading',{name:'12월 21일 – 12월 31일'})).toBeTruthy();
 });
 it('unsaved picks in 내 일정 survive a trip to 멤버별',()=>{
  render(createElement(ScheduleView,{...props,leader:true}));
  const cell=()=>document.querySelector('[data-day="2026-11-26"]') as HTMLButtonElement;
  fireEvent.click(cell());fireEvent.click(cell());
  expect(cell().dataset.state).toBe('adding');
  fireEvent.click(screen.getByRole('button',{name:'멤버별'}));
  fireEvent.click(screen.getAllByRole('button',{name:'내 일정'})[0]);
  expect(cell().dataset.state).toBe('adding');
 });
});
