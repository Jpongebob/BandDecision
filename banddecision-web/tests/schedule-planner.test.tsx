// @vitest-environment jsdom
import {createElement} from 'react';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const nav=vi.hoisted(()=>({push:vi.fn()}));
const save=vi.hoisted(()=>vi.fn(async(input:{add:string[];remove:string[]})=>(void input,{ok:true,added:true,removed:true} as {ok:boolean;added:boolean;removed:boolean;error?:string})));
vi.mock('next/navigation',()=>({useRouter:()=>({push:nav.push,refresh:vi.fn()})}));
vi.mock('@/app/live-actions',()=>({saveAvailabilityChanges:save}));
import {SchedulePlanner} from '../src/components/schedule-planner';
import {SavedDatesSheet} from '../src/components/saved-dates-sheet';
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');this.dispatchEvent(new Event('close'));}});
afterEach(cleanup);beforeEach(()=>{save.mockClear();nav.push.mockClear();});

const members=[{id:'me',nickname:'Me',part:'기타'},{id:'a',nickname:'Ann',part:'보컬'},{id:'b',nickname:'Bo',part:'드럼'},{id:'c',nickname:'Cy',part:'건반'}];
// today 2026-11-06 (금). I saved 11/07; Ann has 11/07 and 11/10; Bo has 11/10; Cy never answered.
const available=[{memberId:'me',date:'2026-11-07'},{memberId:'a',date:'2026-11-07'},{memberId:'a',date:'2026-11-10'},{memberId:'b',date:'2026-11-10'}];
const props={today:'2026-11-06',members,available,memberId:'me',plans:[{date:'2026-11-20',attending:['나','Ann'],absent:['Bo','Cy']}]};
const day=(d:string)=>document.querySelector(`[data-day="${d}"]`) as HTMLButtonElement;
const panel=()=>screen.getByRole('region',{name:'선택한 날짜 현황'});
const saveButton=()=>within(panel()).getByRole('button',{name:'저장'}) as HTMLButtonElement;

describe('tap once to see, tap again to change',()=>{
 it('starts without changes and keeps past days out of reach',()=>{
  render(createElement(SchedulePlanner,props));
  expect(saveButton().disabled).toBe(true);expect(within(panel()).getByText('바뀐 날짜 없음')).toBeTruthy();
  expect(day('2026-11-05').disabled).toBe(true);
  expect(day('2026-11-06').getAttribute('aria-current')).toBe('date');
 });
 it('first tap only shows who can come; the second tap stages an addition and a third cancels it',()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(day('2026-11-10'));
  expect(within(panel()).getByText('11월 10일 (화)')).toBeTruthy();
  expect(panel().textContent).toContain('가능 2 · Ann, Bo');
  expect(panel().textContent).toContain('미응답 1 · Cy');
  expect(day('2026-11-10').getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(day('2026-11-10'));
  expect(day('2026-11-10').getAttribute('aria-pressed')).toBe('true');
  expect(day('2026-11-10').textContent).toContain('3/4');
  expect(panel().textContent).toContain('가능 3 · Ann, Bo, 나');
  expect(within(panel()).getByText('1일 추가')).toBeTruthy();
  fireEvent.click(day('2026-11-10'));
  expect(day('2026-11-10').getAttribute('aria-pressed')).toBe('false');
  expect(saveButton().disabled).toBe(true);
 });
 it('removes a saved day and saves additions and removals together',async()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(day('2026-11-07'));fireEvent.click(day('2026-11-07'));
  expect(day('2026-11-07').textContent).toContain('빼기');
  fireEvent.click(day('2026-11-12'));fireEvent.click(day('2026-11-12'));
  expect(within(panel()).getByText('1일 추가 · 1일 빼기')).toBeTruthy();
  await act(async()=>{fireEvent.click(saveButton());});
  expect(save).toHaveBeenCalledWith({add:['2026-11-12'],remove:['2026-11-07']});
  expect(await screen.findByText('저장했어요 · 1일 추가, 1일 빼기')).toBeTruthy();
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'되돌리기'}));});
  expect(save).toHaveBeenLastCalledWith({add:['2026-11-07'],remove:['2026-11-12']});
 });
 it('shows a failed save and keeps the staged changes',async()=>{
  save.mockResolvedValueOnce({ok:false,added:false,removed:false,error:'저장하지 못했습니다.'});
  render(createElement(SchedulePlanner,props));
  fireEvent.click(day('2026-11-12'));fireEvent.click(day('2026-11-12'));
  await act(async()=>{fireEvent.click(saveButton());});
  expect(screen.getByRole('alert').textContent).toBe('저장하지 못했습니다.');
  expect(day('2026-11-12').getAttribute('aria-pressed')).toBe('true');
 });
 it('selects a range across the month without touching saved or rehearsal days',()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(screen.getByRole('button',{name:'기간으로'}));
  fireEvent.click(day('2026-11-06'));fireEvent.click(day('2026-11-09'));
  for(const d of ['2026-11-06','2026-11-08','2026-11-09'])expect(day(d).getAttribute('aria-pressed')).toBe('true');
  expect(day('2026-11-07').getAttribute('aria-pressed')).toBe('false');
  expect(within(panel()).getByText('3일 추가')).toBeTruthy();
 });
 it('adds a whole month except saved and rehearsal days, then clears it again',()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(screen.getByRole('button',{name:'이번 달 전체'}));
  expect(within(panel()).getByText('23일 추가')).toBeTruthy();
  expect(day('2026-11-20').getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button',{name:'전체 해제'}));
  expect(saveButton().disabled).toBe(true);
 });
 it('only allows this month and next month',()=>{
  render(createElement(SchedulePlanner,props));
  expect((screen.getByRole('button',{name:'이전 달'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
  expect(screen.getByText('2026년 12월')).toBeTruthy();
  expect((screen.getByRole('button',{name:'다음 달'}) as HTMLButtonElement).disabled).toBe(true);
 });
 it('shows the confirmed rehearsal snapshot on a rehearsal day',()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(day('2026-11-20'));
  expect(day('2026-11-20').textContent).toContain('합주');
  expect(within(panel()).getByText('합주 확정')).toBeTruthy();
  expect(panel().textContent).toContain('참석 2 · 나, Ann');
  expect(panel().textContent).toContain('2/4명 참석');
 });
 it('asks before leaving with unsaved changes and lets me keep choosing',()=>{
  render(createElement('div',null,createElement('a',{href:'/songs'},'합주곡'),createElement(SchedulePlanner,props)));
  fireEvent.click(day('2026-11-12'));fireEvent.click(day('2026-11-12'));
  fireEvent.click(screen.getByText('합주곡'));
  const dialog=screen.getByRole('dialog',{name:'저장하지 않은 변경이 있어요',hidden:true});
  expect(dialog.hasAttribute('open')).toBe(true);
  fireEvent.click(within(dialog).getByRole('button',{name:'계속 고르기'}));
  expect(dialog.hasAttribute('open')).toBe(false);
  fireEvent.click(screen.getByText('합주곡'));
  fireEvent.click(within(dialog).getByRole('button',{name:'저장하지 않고 이동'}));
  expect(nav.push).toHaveBeenCalledWith('/songs');expect(save).not.toHaveBeenCalled();
 });
});

describe('saved dates sheet',()=>{
 const sheet={today:'2026-11-06',endDate:'2026-12-31',saved:['2026-11-07','2026-11-21','2026-12-05'],count:()=>2,total:4,plans:new Map(),label:'가능한 날 3개'};
 it('groups by month with counts and folds months',()=>{
  render(createElement(SavedDatesSheet,sheet));
  fireEvent.click(screen.getByRole('button',{name:/가능한 날 3개/}));
  const months=[...document.querySelectorAll('dialog button[aria-expanded]')] as HTMLButtonElement[];
  expect(months.map(b=>[b.textContent,b.getAttribute('aria-expanded')])).toEqual([['11월2개접기','true'],['12월1개펼치기','false']]);
  expect(screen.queryByText('12월 5일 (토)')).toBeNull();
  fireEvent.click(months[1]);
  expect(screen.getByText('12월 5일 (토)')).toBeTruthy();
 });
 it('removes one date at once and can undo it',async()=>{
  render(createElement(SavedDatesSheet,sheet));
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'11월 21일 (토) 빼기',hidden:true}));});
  expect(save).toHaveBeenCalledWith({add:[],remove:['2026-11-21']});
  expect(await screen.findByText('11월 21일을 뺐어요')).toBeTruthy();
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'되돌리기',hidden:true}));});
  expect(save).toHaveBeenLastCalledWith({add:['2026-11-21'],remove:[]});
 });
 it('removes exactly the picked dates in one call and keeps them on failure',async()=>{
  save.mockResolvedValueOnce({ok:false,added:false,removed:false,error:'다시 시도하세요.'});
  render(createElement(SavedDatesSheet,sheet));
  fireEvent.click(screen.getByRole('button',{name:/여러 개 빼기/,hidden:true}));
  fireEvent.click(screen.getByRole('checkbox',{name:'11월 7일 (토) 선택',hidden:true}));
  const go=screen.getByRole('button',{name:'선택한 1개 빼기',hidden:true});
  await act(async()=>{fireEvent.click(go);});
  expect(save).toHaveBeenCalledWith({add:[],remove:['2026-11-07']});
  expect(screen.getByRole('alert',{hidden:true}).textContent).toBe('다시 시도하세요.');
  expect(screen.getByRole('checkbox',{name:'11월 7일 (토) 선택',hidden:true}).getAttribute('aria-checked')).toBe('true');
 });
});
