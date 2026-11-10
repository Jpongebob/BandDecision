// @vitest-environment jsdom
import {createElement} from 'react';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const actions=vi.hoisted(()=>({remove:vi.fn(async()=>({success:'계획을 삭제했습니다.'} as {success?:string;error?:string}))}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()}),usePathname:()=>'/songs/12'}));
vi.mock('@/app/live-actions',()=>({deleteLivePlanAction:actions.remove,saveLivePlanAction:vi.fn(async()=>({})),saveAvailabilityChanges:vi.fn(),setPlanAttendance:vi.fn()}));
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import {PlanDeleteControl} from '../src/components/plan-delete';
import {SideNav} from '../src/components/side-nav';
import {SchedulePlanner} from '../src/components/schedule-planner';
import {planShareText} from '../src/lib/calendar-export';
import {timeRangeLabel} from '../src/lib/day-format';
import type {SavedPlan} from '../src/lib/live-planning';
afterEach(cleanup);beforeEach(()=>actions.remove.mockClear());

const members=[{id:'a',userId:'ua',nickname:'Ann',part:'기타',partKey:'기타',skill:null},{id:'b',userId:'ub',nickname:'Bo',part:'베이스',partKey:'베이스',skill:null},{id:'c',userId:'uc',nickname:'Cy',part:'드럼',partKey:'드럼',skill:null}];
// Day 20: only Ann still has the day saved (the others took it back before the lock); the plan was saved 3/3.
const data={band_id:'band',version:7,members,available:[{memberId:'a',date:'2026-11-20'},{memberId:'a',date:'2026-11-21'},{memberId:'b',date:'2026-11-21'}],songs:[]};
const member=(id:string,name:string,attending:boolean)=>({id:'r'+id,source_member_id:id,nickname_snapshot:name,part_snapshot:'',attending,reason_snapshot:null});
const plan:SavedPlan={id:'p1',version:2,rehearsal_date:'2026-11-20',location:'Room A',memo:'목표',starts_at:'20:00:00',ends_at:'22:00:00',participant_count:3,attendee_count:3,confirmed_plan_members:[member('a','Ann',true),member('b','Bo',true),member('c','Cy',true)],confirmed_plan_songs:[]};
const saveButton=()=>screen.getByRole('button',{name:'계획 수정 저장'});

describe('editing a plan',()=>{
 it('keeps the saved attendance on the same day and waits for a real change',()=>{
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}));
  const saved=view.container.querySelector('[data-saved-attendance]') as HTMLElement;
  expect(saved.textContent).toContain('3/3명 참석');
  expect(saved.textContent).toContain('참석자 명단');
  expect(screen.queryByText('참석 가능한 멤버만으로 진행할게요')).toBeNull();
  expect(saveButton()).toHaveProperty('disabled',true);
  expect(screen.getByText('바뀐 내용이 없어요')).toBeTruthy();
  fireEvent.change(view.container.querySelector('textarea[name="memo"]')!,{target:{value:'새 목표'}});
  expect(saveButton()).toHaveProperty('disabled',false);
  expect(screen.queryByText('바뀐 내용이 없어요')).toBeNull();
  fireEvent.change(view.container.querySelector('textarea[name="memo"]')!,{target:{value:' 목표 '}});
  expect(saveButton()).toHaveProperty('disabled',true);
  fireEvent.change(view.container.querySelector('input[name="location"]')!,{target:{value:'Room B'}});
  expect(saveButton()).toHaveProperty('disabled',false);
 });
 it('a time change alone wakes the button; equal times keep it off with the field alert',()=>{
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}));
  const end=view.container.querySelector('select[name="ends_at"]') as HTMLSelectElement;
  fireEvent.change(end,{target:{value:'22:30'}});
  expect(saveButton()).toHaveProperty('disabled',false);
  fireEvent.change(end,{target:{value:'20:00'}});
  expect(saveButton()).toHaveProperty('disabled',true);
  expect(screen.getByRole('alert').textContent).toBe('시작과 끝 시간이 같아요.');
  expect(screen.queryByText('바뀐 내용이 없어요')).toBeNull();
 });
 it('moving to another day counts that day again and asks for agreement',()=>{
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10',plan}));
  fireEvent.click(view.container.querySelector('[data-day="2026-11-21"]')!);
  expect(view.container.querySelector('[data-saved-attendance]')).toBeNull();
  expect(document.body.textContent).toContain('참석 안 됨: Cy');
  expect(saveButton()).toHaveProperty('disabled',true);
  expect(document.body.textContent).toContain('체크해 주세요');
  fireEvent.click(screen.getByRole('checkbox'));
  expect(saveButton()).toHaveProperty('disabled',false);
 });
 it('a new plan does not wait for changes',()=>{
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-10'}));
  fireEvent.click(view.container.querySelector('[data-day="2026-11-21"]')!);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button',{name:'이 날로 확정하기'})).toHaveProperty('disabled',false);
 });
});

describe('deleting a plan',()=>{
 it('asks once more in place, then deletes with the plan version',async()=>{
  render(createElement(PlanDeleteControl,{planId:'p1',version:4,label:'이 계획 삭제',question:'삭제할까요?',triggerClassName:''}));
  fireEvent.click(screen.getByRole('button',{name:'이 계획 삭제'}));
  const box=screen.getByRole('group',{name:'이 계획 삭제'});
  fireEvent.click(within(box).getByRole('button',{name:'취소'}));
  expect(actions.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'이 계획 삭제'}));
  await act(async()=>{fireEvent.click(within(screen.getByRole('group',{name:'이 계획 삭제'})).getByRole('button',{name:'이 계획 삭제'}));});
  const form=(actions.remove.mock.calls[0] as unknown as [unknown,FormData])[1];
  expect([form.get('plan_id'),form.get('plan_version'),form.get('confirm_delete')]).toEqual(['p1','4','yes']);
 });
 it('shows the server error',async()=>{
  actions.remove.mockResolvedValueOnce({error:'다른 창에서 계획을 수정했습니다. 새로고침 후 확인하세요.'});
  render(createElement(PlanDeleteControl,{planId:'p1',version:4,label:'기록 삭제',question:'삭제할까요?',triggerClassName:''}));
  fireEvent.click(screen.getByRole('button',{name:'기록 삭제'}));
  await act(async()=>{fireEvent.click(within(screen.getByRole('group',{name:'기록 삭제'})).getByRole('button',{name:'기록 삭제'}));});
  expect(screen.getByRole('alert').textContent).toContain('새로고침');
 });
});

describe('share text and times',()=>{
 it('reads like a notice with names and numbered songs, and no link',()=>{
  const text=planShareText({id:'p',date:'2026-11-20',start:'22:00:00',end:'00:30:00',location:'Room A',memo:'목표',songs:['Song A','Song B'],artists:['Artist A',null],attending:2,total:3,band:'Our Band',attendees:['Ann','Bo'],absentees:['Cy']});
  expect(text).toBe('🎸 Our Band 합주 안내\n\n📅 11월 20일 (금) 오후 10:00 – 오전 12:30 (다음 날)\n📍 Room A\n👥 참석 2명: Ann, Bo\n   불참: Cy\n🎵 곡\n1. Song A – Artist A\n2. Song B\n📝 메모: 목표');
  expect(text).not.toContain('http');
 });
 it('older callers without names still get counts',()=>{
  expect(planShareText({id:'p',date:'2026-11-20',start:'20:00',end:'22:00',songs:[],attending:2,total:3})).toBe('🎸 합주 안내\n\n📅 11월 20일 (금) 오후 8:00 – 10:00\n👥 참석 2/3명');
 });
 it('marks an end after midnight as the next day',()=>{
  expect(timeRangeLabel('22:00:00','00:30:00')).toBe('오후 10:00 – 오전 12:30 (다음 날)');
  expect(timeRangeLabel('01:00','00:30')).toBe('오전 1:00 – 오전 12:30 (다음 날)');
  expect(timeRangeLabel('20:00','22:00')).toBe('오후 8:00 – 10:00');
 });
});

describe('PC menu and calendar details',()=>{
 it('marks the current tab and groups the settings',()=>{
  render(createElement(SideNav,{}));
  expect(screen.getByRole('link',{name:'합주곡'}).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link',{name:'홈'}).getAttribute('aria-current')).toBeNull();
  expect(screen.getByText('설정')).toBeTruthy();
  expect(screen.getByRole('link',{name:'밴드 관리'}).getAttribute('href')).toBe('/settings/band');
 });
 it('past days lose the saved check mark',()=>{
  render(createElement(SchedulePlanner,{today:'2026-11-10',members:[{id:'me',nickname:'Me',part:'기타'}],available:[{memberId:'me',date:'2026-11-05'},{memberId:'me',date:'2026-11-12'}],memberId:'me',plans:[]}));
  const past=document.querySelector('[data-day="2026-11-05"]')!,next=document.querySelector('[data-day="2026-11-12"]')!;
  expect(past.getAttribute('data-state')).toBe('past');
  expect(past.querySelector('svg')).toBeNull();
  expect(next.querySelector('svg')).toBeTruthy();
 });
});
