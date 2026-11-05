// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({addAvailabilityAction:vi.fn(async()=>({success:'saved'})),editAvailabilityAction:vi.fn(async()=>({})),deleteAvailabilityAction:vi.fn(async()=>({}))}));
import {AvailabilityForm} from '../src/components/availability-form';
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
afterEach(cleanup);
const props={members:[{id:'me'},{id:'other'}],memberId:'me',unavailable:[{memberId:'me',date:'2026-11-08'}],today:'2026-11-05',savedDates:[{date:'2026-11-08',reason:'original'}]};
function draft(view:ReturnType<typeof render>){return JSON.parse((view.container.querySelector('input[name=dates_json]') as HTMLInputElement).value) as {date:string;reason:string}[];}
describe('calendar new dates and separate saved rows',()=>{
 it('starts with an empty new draft and preserves the saved editor',()=>{const view=render(createElement(AvailabilityForm,props));expect(draft(view)).toEqual([]);expect(view.container.querySelectorAll('[data-saved-date]')).toHaveLength(1);expect(view.container.querySelector('input[name=old_date]')).toBeNull();expect(screen.queryByText(/이번 회차/)).toBeNull();});
 it('disables past and saved dates, and allows disjoint days with toggle removal',()=>{const view=render(createElement(AvailabilityForm,props));expect((screen.getByRole('button',{name:/^2026-11-04 ·/}) as HTMLButtonElement).disabled).toBe(true);expect((screen.getByRole('button',{name:/^2026-11-08 ·/}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-10 ·/}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));expect(draft(view).map(d=>d.date)).toEqual(['2026-11-10']);});
 it('selects ranges across months without adding saved days or replacing saved rows',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(screen.getByRole('button',{name:'기간 선택'}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'다음 달'}));fireEvent.click(screen.getByRole('button',{name:/^2026-12-02 ·/}));expect(draft(view)).toHaveLength(26);expect(draft(view).some(d=>d.date==='2026-11-08')).toBe(false);expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(false);expect(draft(view).every(d=>d.reason===undefined)).toBe(true);fireEvent.click(screen.getByRole('button',{name:'선택 초기화'}));expect(draft(view)).toEqual([]);expect(view.container.querySelectorAll('[data-saved-date]')).toHaveLength(1);});
 it('keeps individual saved edit and delete controls',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(view.container.querySelector('[data-saved-date]')!);expect(screen.getByRole('button',{name:'날짜 삭제'})).toBeTruthy();expect(view.container.querySelector('[name=reason]')).toBeNull();expect(screen.queryByText('original')).toBeNull();});

});

it('rejects overlong calendar ranges without silently saving a truncated prefix',()=>{const view=render(createElement(AvailabilityForm,props));fireEvent.click(screen.getByRole('button',{name:'기간 선택'}));fireEvent.click(screen.getByRole('button',{name:/^2026-11-06 ·/}));for(let n=0;n<13;n++)fireEvent.click(screen.getByRole('button',{name:'다음 달'}));fireEvent.click(screen.getByRole('button',{name:/^2027-12-02 ·/}));expect(screen.getByRole('alert').textContent).toContain('366일');expect(draft(view).map(d=>d.date)).toEqual(['2026-11-06']);expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(true);});

it('shows current active attendance and previews own additions without double-counting',()=>{
 const view=render(createElement(AvailabilityForm,{...props,unavailable:[...props.unavailable,{memberId:'other',date:'2026-11-06'},{memberId:'other',date:'2026-11-06'},{memberId:'left-member',date:'2026-11-06'}]}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 1명 · 불참 1명'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 1명 · 불참 1명'}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 0명 · 불참 2명 · 선택 중'})).toBeTruthy();
 // A zero-attendance day remains selectable for unavailability, unlike plan confirmation.
 fireEvent.click(screen.getByRole('button',{name:'2026-11-06 · 참석 0명 · 불참 2명 · 선택 중'}));
 expect(screen.getByRole('button',{name:'2026-11-06 · 참석 1명 · 불참 1명'})).toBeTruthy();
 expect((screen.getByRole('button',{name:'2026-11-08 · 참석 1명 · 불참 1명 · 저장됨'}) as HTMLButtonElement).disabled).toBe(true);
 expect(view.container.querySelector('[name=reason]')).toBeNull();
});
it('updates attendance when refreshed members or dates arrive',()=>{const view=render(createElement(AvailabilityForm,props));view.rerender(createElement(AvailabilityForm,{...props,members:[...props.members,{id:'new'}],unavailable:[...props.unavailable,{memberId:'new',date:'2026-11-10'}]}));expect(screen.getByRole('button',{name:'2026-11-10 · 참석 2명 · 불참 1명'})).toBeTruthy();});
