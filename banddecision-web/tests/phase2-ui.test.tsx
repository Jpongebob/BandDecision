// @vitest-environment jsdom
import {createElement} from 'react';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const actions=vi.hoisted(()=>({
 save:vi.fn(async()=>({ok:true,added:true,removed:true})),
 attendance:vi.fn(async(input:{plan:string;version:number;attending:string[]})=>({ok:true,version:input.version+1} as {ok:boolean;version?:number;error?:string})),
}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/app/live-actions',()=>({saveAvailabilityChanges:actions.save,setPlanAttendance:actions.attendance,liveVoteAction:vi.fn(async()=>({})),withdrawSongVoteAction:vi.fn(),setSongConfirmationAction:vi.fn(),deleteBandSongAction:vi.fn(),updateBandSongAction:vi.fn(async()=>({})),saveLivePlanAction:vi.fn(async()=>({}))}));
vi.mock('@/app/actions',()=>({difficultyAction:vi.fn()}));
import {SchedulePlanner} from '../src/components/schedule-planner';
import {SavedDatesSheet} from '../src/components/saved-dates-sheet';
import {PlanAttendanceEditor} from '../src/components/plan-attendance';
import {SongList} from '../src/components/song-list';
import {SongVoteFields} from '../src/components/song-vote-fields';
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import {planIcs} from '../src/components/plan-share';
import type {Participant,SongInput} from '../src/services/recommendations';
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');this.dispatchEvent(new Event('close'));}});
afterEach(cleanup);beforeEach(()=>{actions.save.mockClear();actions.attendance.mockClear();});

describe('confirmed days are locked in the calendar',()=>{
 const members=[{id:'me',nickname:'Me',part:'기타'},{id:'a',nickname:'Ann',part:'보컬'}];
 const props={today:'2026-11-06',members,available:[{memberId:'me',date:'2026-11-20'},{memberId:'a',date:'2026-11-20'}],memberId:'me',plans:[{date:'2026-11-20',attending:['나','Ann'],absent:[]}]};
 const day=(d:string)=>document.querySelector(`[data-day="${d}"]`) as HTMLButtonElement;
 const panel=()=>screen.getByRole('region',{name:'선택한 날짜 현황'});
 it('a second tap on a plan day changes nothing and tells a member to ask the leader',()=>{
  render(createElement(SchedulePlanner,props));
  fireEvent.click(day('2026-11-20'));fireEvent.click(day('2026-11-20'));
  expect(day('2026-11-20').getAttribute('aria-pressed')).toBe('false');
  expect(day('2026-11-20').getAttribute('aria-label')).toContain('바꿀 수 없음');
  expect(panel().textContent).toContain('직접 바꿀 수 없어요');
  expect(within(panel()).getByRole('button',{name:'저장'})).toHaveProperty('disabled',true);
 });
 it('points the leader to the attendance list',()=>{
  render(createElement(SchedulePlanner,{...props,leader:true}));
  fireEvent.click(day('2026-11-20'));
  expect(within(panel()).getByRole('link',{name:'합주 계획'}).getAttribute('href')).toBe('/plans');
 });
 it('the saved list shows a lock instead of a remove button and leaves plan days out of bulk removal',()=>{
  render(createElement(SavedDatesSheet,{today:'2026-11-06',endDate:'2026-12-31',saved:['2026-11-10','2026-11-20'],count:()=>1,total:2,plans:new Map([['2026-11-20',props.plans[0]]]),label:'가능한 날 2개'}));
  expect(document.querySelector('[data-remove-date="2026-11-20"]')).toBeNull();
  expect(document.querySelector('[data-remove-date="2026-11-10"]')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/가능한 날 2개/}));
  expect(screen.getByRole('img',{name:/11월 20일.*뺄 수 없어요/})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'여러 개 빼기'}));
  fireEvent.click(screen.getByRole('button',{name:'이 달 전체 선택'}));
  expect(screen.getByRole('button',{name:'선택한 1개 빼기'})).toBeTruthy();
  expect(screen.queryByRole('checkbox',{name:/11월 20일/})).toBeNull();
 });
});

describe('leader attendance editor',()=>{
 const members=[{id:'L',nickname:'Lee',part:'기타',leader:true,noDates:false},{id:'M',nickname:'Min',part:'베이스',leader:false,noDates:false},{id:'N',nickname:'Na',part:'건반',leader:false,noDates:true}];
 const plan={id:'p1',version:3,date:'2026-11-20',start:'20:00',end:'22:00'};
 it('shows who changed, saves the whole list, then undoes with the next version',async()=>{
  render(createElement(PlanAttendanceEditor,{plan,members,attending:['L','M']}));
  expect(screen.getByText('2/3명 참석')).toBeTruthy();
  expect(screen.getByText('날짜를 아직 안 냈어요')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Min 참석 여부'})).getByRole('radio',{name:'불참'}));
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Na 참석 여부'})).getByRole('radio',{name:'참석'}));
  expect(screen.getByText('2명 바뀜')).toBeTruthy();
  expect(screen.getByText('Min → 불참, Na → 참석')).toBeTruthy();
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'저장'}));});
  expect(actions.attendance).toHaveBeenLastCalledWith({plan:'p1',version:3,attending:['L','N']});
  expect(screen.getByRole('status').textContent).toContain('참석자를 저장했어요');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'되돌리기'}));});
  expect(actions.attendance).toHaveBeenLastCalledWith({plan:'p1',version:4,attending:['L','M']});
 });
 it('cannot save with nobody attending',()=>{
  render(createElement(PlanAttendanceEditor,{plan,members,attending:['L']}));
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Lee 참석 여부'})).getByRole('radio',{name:'불참'}));
  expect(screen.getByRole('button',{name:'저장'})).toHaveProperty('disabled',true);
  expect(screen.getByRole('alert').textContent).toContain('한 명은');
 });
});

describe('song detail permissions',()=>{
 const participants:Participant[]=[{id:'m1',userId:'u1',nickname:'Up',part:'기타',partKey:'기타',skill:null},{id:'m2',userId:'u2',nickname:'Other',part:'드럼',partKey:'드럼',skill:null}];
 const song:SongInput={id:1,title:'Song',artist:'Artist',confirmedAt:null,createdBy:'u1',createdByNickname:'Up',createdAt:'2026-11-03T03:00:00Z',editedAt:null,difficulties:{},difficultyMeta:{},votes:[{memberId:'m1',choice:'yes'}]};
 const base={bandId:'b',participants,detailed:true};
 it('the uploader can edit and, before others vote, delete',()=>{
  render(createElement(SongList,{...base,memberId:'m1',userId:'u1',songs:[song]}));
  expect(screen.getByRole('button',{name:'곡 정보 수정'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'곡 삭제'})).toBeTruthy();
  expect(screen.queryByText('이 곡 확정하기')).toBeNull();
  expect(document.body.textContent).toContain('내가 11월 3일에 올렸어요');
 });
 it('after another member votes only the leader can delete',()=>{
  const voted={...song,votes:[...song.votes,{memberId:'m2',choice:'no' as const,reason:null}]};
  render(createElement(SongList,{...base,memberId:'m1',userId:'u1',songs:[voted]}));
  expect(screen.queryByRole('button',{name:'곡 삭제'})).toBeNull();
  expect(screen.getByText('다른 멤버가 투표해서 이제 밴드장만 지울 수 있어요.')).toBeTruthy();
 });
 it('other members see the uploader and the edit mark but no management card',()=>{
  render(createElement(SongList,{...base,memberId:'m2',userId:'u2',songs:[{...song,editedAt:'2026-11-04T00:00:00Z'}]}));
  expect(screen.queryByRole('button',{name:'곡 정보 수정'})).toBeNull();expect(screen.queryByRole('button',{name:'곡 삭제'})).toBeNull();
  expect(screen.getByText('수정됨')).toBeTruthy();
  expect(document.body.textContent).toContain('Up 님이 11월 3일에 올렸어요');
 });
 it('the leader always gets edit, confirm and delete',()=>{
  render(createElement(SongList,{...base,memberId:'m2',userId:'u2',canManage:true,songs:[{...song,votes:[...song.votes,{memberId:'m2',choice:'yes' as const}]}]}));
  expect(screen.getByRole('button',{name:'곡 정보 수정'})).toBeTruthy();
  expect(screen.getByText('이 곡 확정하기')).toBeTruthy();
  expect(screen.getByRole('button',{name:'곡 삭제'})).toBeTruthy();
 });
});

describe('optional reason for 반대',()=>{
 it('반대 saves at once and the reason box appears only after, marked optional',()=>{
  const view=render(createElement(SongVoteFields,{songId:1}));
  expect(screen.getByRole('button',{name:'반대'}).getAttribute('type')).toBe('submit');
  expect(view.container.querySelector('textarea')).toBeNull();
  view.rerender(createElement(SongVoteFields,{songId:1,choice:'no',reason:null}));
  const box=view.container.querySelector('textarea[name="reason"]') as HTMLTextAreaElement;
  expect(box.required).toBe(false);
  expect(document.body.textContent).toContain('(선택)');
 });
});

describe('rehearsal time',()=>{
 const data={band_id:'b',version:1,members:[{id:'m',userId:'u',nickname:'A',part:'기타',partKey:'기타',skill:null}],available:[{memberId:'m',date:'2026-11-20'}],songs:[]};
 it('defaults to 8–10 pm, keeps an edited plan time, and blocks equal times',()=>{
  const view=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-06'}));
  const start=()=>view.container.querySelector('select[name="starts_at"]') as HTMLSelectElement,end=()=>view.container.querySelector('select[name="ends_at"]') as HTMLSelectElement;
  expect(start().value).toBe('20:00');expect(end().value).toBe('22:00');
  fireEvent.change(end(),{target:{value:'20:00'}});
  expect(screen.getByText('시작과 끝 시간이 같아요.')).toBeTruthy();
  fireEvent.change(end(),{target:{value:'00:30'}});
  expect(document.body.textContent).toContain('다음 날 끝나는 걸로');
  cleanup();
  const plan={id:'p',version:1,rehearsal_date:'2026-11-20',starts_at:'19:15:00',ends_at:'21:00:00',participant_count:1,attendee_count:1,confirmed_plan_members:[],confirmed_plan_songs:[]};
  const edit=render(createElement(ConfirmPlanForm,{data,songs:[],today:'2026-11-06',plan}));
  expect((edit.container.querySelector('select[name="starts_at"]') as HTMLSelectElement).value).toBe('19:15');
 });
 it('a calendar file for a plan past midnight ends on the next day',()=>{
  const ics=planIcs({id:'p',date:'2026-11-30',start:'22:00:00',end:'00:30:00',songs:[],attending:1,total:1});
  expect(ics).toContain('DTSTART;TZID=Asia/Seoul:20261130T220000');
  expect(ics).toContain('DTEND;TZID=Asia/Seoul:20261201T003000');
 });
});
