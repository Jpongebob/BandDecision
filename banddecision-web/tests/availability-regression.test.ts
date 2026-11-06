// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({addAvailabilityAction:vi.fn(async()=>({success:'saved'})),editAvailabilityAction:vi.fn(async()=>({})),deleteAvailabilityAction:vi.fn(async()=>({}))}));
import {AvailabilityForm} from '../src/components/availability-form';
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
afterEach(cleanup);
const props={members:[{id:'me',nickname:'My name',part:'기타'},{id:'other',nickname:'Other name',part:'베이스'}],memberId:'me',available:[{memberId:'me',date:'2026-11-08'}],today:'2026-11-05',savedDates:[{date:'2026-11-08',reason:'original'}]};
function draft(view:ReturnType<typeof render>){return JSON.parse((view.container.querySelector('input[name=dates_json]') as HTMLInputElement).value) as {date:string;reason:string}[];}
describe('calendar new dates and separate saved rows',()=>{
 it('starts with an empty new draft and preserves the saved editor',()=>{const view=render(createElement(AvailabilityForm,props));expect(draft(view)).toEqual([]);expect(view.container.querySelectorAll('[data-saved-date]')).toHaveLength(1);expect(view.container.querySelector('input[name=old_date]')).toBeNull();expect(screen.queryByText(/이번 회차/)).toBeNull();});
 // Past and saved days stay clickable (they open the roster) but never enter the new-date draft.
 it('keeps past and saved dates out of the draft, and allows disjoint days with toggle removal',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(screen.getByRole('button',{name:/^2026-11-04 ·/}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-08 ·/}));expect(draft(view)).toEqual([]);fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-10 ·/}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));expect(draft(view).map(d=>d.date)).toEqual(['2026-11-10']);});
 it('selects ranges across months without adding saved days or replacing saved rows',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(screen.getByRole('button',{name:'기간 선택'}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'다음 달'}));fireEvent.click(screen.getByRole('button',{name:/^2026-12-02 ·/}));expect(draft(view)).toHaveLength(26);expect(draft(view).some(d=>d.date==='2026-11-08')).toBe(false);expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(false);expect(draft(view).every(d=>d.reason===undefined)).toBe(true);fireEvent.click(screen.getByRole('button',{name:'선택 초기화'}));expect(draft(view)).toEqual([]);expect(view.container.querySelectorAll('[data-saved-date]')).toHaveLength(1);});
 it('keeps individual saved edit and delete controls',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(view.container.querySelector('[data-saved-date]')!);expect(screen.getByRole('button',{name:'날짜 삭제'})).toBeTruthy();expect(view.container.querySelector('[name=reason]')).toBeNull();expect(screen.queryByText('original')).toBeNull();});

});

it('limits month navigation to this month and next month',()=>{const view=render(createElement(AvailabilityForm,props));for(let n=0;n<13;n++)fireEvent.click(screen.getByRole('button',{name:'다음 달'}));expect(screen.getByText('2026년 12월')).toBeTruthy();expect((screen.getByRole('button',{name:'다음 달'}) as HTMLButtonElement).disabled).toBe(true);expect(draft(view)).toEqual([]);});

it('shows current active attendance and previews own additions without double-counting',()=>{
 const view=render(createElement(AvailabilityForm,{...props,available:[...props.available,{memberId:'other',date:'2026-11-06'},{memberId:'other',date:'2026-11-06'},{memberId:'left-member',date:'2026-11-06'}]}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 1명 · 참석 제외 1명 · 미등록 · 내 참석 제외'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 1명 · 참석 제외 1명 · 미등록 · 내 참석 제외'}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 2명 · 참석 제외 0명 · 선택 중'})).toBeTruthy();
 // A zero-attendance day remains selectable for unavailability, unlike plan confirmation.
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 2명 · 참석 제외 0명 · 선택 중'}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 1명 · 참석 제외 1명 · 미등록 · 내 참석 제외'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2026-11-08 · 참석 가능 1명 · 참석 제외 1명 · 저장됨 · 내 가능 날짜'}));
 expect(draft(view)).toEqual([]);
 expect(screen.getByRole('button',{name:'2026-11-08 · 참석 가능 1명 · 참석 제외 1명 · 저장됨 · 내 가능 날짜'})).toBeTruthy();
 expect(view.container.querySelector('[name=reason]')).toBeNull();
});
it('updates attendance when refreshed members or dates arrive',()=>{const view=render(createElement(AvailabilityForm,props));view.rerender(createElement(AvailabilityForm,{...props,members:[...props.members,{id:'new',nickname:'New name',part:'보컬'}],available:[...props.available,{memberId:'new',date:'2026-11-10'}]}));expect(screen.getByRole('button',{name:'2026-11-10 · 참석 가능 1명 · 참석 제외 2명 · 미등록 · 내 참석 제외'})).toBeTruthy();});

it('shows who attends and is absent, including unsaved own selection changes',()=>{
 const view=render(createElement(AvailabilityForm,{...props,available:[...props.available,{memberId:'other',date:'2026-11-06'}]}));
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 1명 · 참석 제외 1명 · 미등록 · 내 참석 제외'}));
 const panel=screen.getByRole('region',{name:'날짜별 참석 명단'});
 expect(panel.textContent).toContain('참석 가능 2명');expect(panel.textContent).toContain('My name (나)');expect(panel.textContent).toContain('Other name');
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 가능 2명 · 참석 제외 0명 · 선택 중'}));expect(panel.textContent).toContain('참석 가능 1명');expect(panel.textContent).toContain('참석 제외 1명');expect(view.container.querySelector('[name=reason]')).toBeNull();
});
// The separate roster date picker was merged into the main calendar: tapping a saved day shows its roster.
it('saved days open the attendance roster without changing the availability draft',()=>{
 const view=render(createElement(AvailabilityForm,props));const before=draft(view);expect(screen.queryByRole('dialog',{name:'명단을 확인할 날짜'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/^2026-11-08 ·/}));
 expect(draft(view)).toEqual(before);const panel=screen.getByRole('region',{name:'날짜별 참석 명단'});expect(panel.textContent).toContain('2026-11-08');expect(panel.textContent).toContain('내 저장 날짜');expect(panel.textContent).toContain('참석 가능 1명');expect(panel.textContent).toContain('참석 제외 1명');expect(panel.textContent).toContain('My name (나)');
});
