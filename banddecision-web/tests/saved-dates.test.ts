// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({editAvailabilityAction:vi.fn(async()=>({})),deleteAvailabilityAction:vi.fn(async()=>({}))}));
import {SavedDates} from '../src/components/saved-dates';
Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
afterEach(cleanup);
const props={dates:[{date:'2026-12-03'},{date:'2026-11-28'},{date:'2026-12-01'}],today:'2026-11-05',counts:()=>({attending:3,absent:1})};
it('sorts and groups compact dates by month without rendering editors per day',()=>{const view=render(createElement(SavedDates,props));expect(Array.from(view.container.querySelectorAll('[data-saved-date]')).map(b=>b.getAttribute('data-saved-date'))).toEqual(['2026-11-28','2026-12-01','2026-12-03']);expect(screen.getByRole('region',{name:'2026-12 저장된 날짜'})).toBeTruthy();expect(view.container.querySelector('form')).toBeNull();expect(screen.getByText('총 3일')).toBeTruthy();});
it('opens only the selected date with its own edit/delete fields',()=>{const view=render(createElement(SavedDates,props));fireEvent.click(view.container.querySelector('[data-saved-date="2026-12-01"]')!);expect(screen.getByRole('dialog',{name:'저장된 날짜 수정'})).toBeTruthy();expect(view.container.querySelectorAll('form')).toHaveLength(2);expect(view.container.querySelector('input[name=old_date]')?.getAttribute('value')).toBe('2026-12-01');expect(screen.getByRole('button',{name:'날짜 삭제'})).toBeTruthy();});
it('closing nested date picker leaves the outer edit/delete context intact',()=>{const view=render(createElement(SavedDates,props));fireEvent.click(view.container.querySelector('[data-saved-date]')!);fireEvent.click(screen.getByRole('button',{name:'2026-11-28'}));const inner=screen.getByRole('dialog',{name:'날짜 변경'});fireEvent.click(Array.from(inner.querySelectorAll('button')).find(b=>b.textContent==='닫기')!);fireEvent(inner,new Event('close',{bubbles:true}));expect(view.container.querySelector('input[name=old_date]')?.getAttribute('value')).toBe('2026-11-28');expect(screen.getByRole('dialog',{name:'저장된 날짜 수정'})).toBeTruthy();});
it('closes the editor after the selected date is deleted or moved by refreshed data',()=>{const view=render(createElement(SavedDates,props));fireEvent.click(view.container.querySelector('[data-saved-date="2026-12-01"]')!);view.rerender(createElement(SavedDates,{...props,dates:[{date:'2026-12-03'}]}));expect(screen.queryByRole('dialog')).toBeNull();expect(view.container.querySelectorAll('[data-saved-date]')).toHaveLength(1);});

it('disables other saved dates across months while keeping the date being edited selectable',()=>{
 const view=render(createElement(SavedDates,props));fireEvent.click(view.container.querySelector('[data-saved-date="2026-12-01"]')!);fireEvent.click(screen.getByRole('button',{name:'2026-12-01'}));
 const current=screen.getByRole('button',{name:'2026-12-01 · 기존 날짜'}) as HTMLButtonElement;
 expect(current.disabled).toBe(false);expect(current.getAttribute('aria-pressed')).toBe('true');
 const duplicate=screen.getByRole('button',{name:'2026-12-03 · 저장됨'}) as HTMLButtonElement;
 expect(duplicate.disabled).toBe(true);fireEvent.click(duplicate);expect((view.container.querySelector('form input[name=date]') as HTMLInputElement).value).toBe('2026-12-01');
 fireEvent.click(screen.getByRole('button',{name:'이전 달'}));expect((screen.getByRole('button',{name:'2026-11-28 · 저장됨'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'2026-11-29'}));expect((view.container.querySelector('form input[name=date]') as HTMLInputElement).value).toBe('2026-11-29');
});
it('preserves an old saved value while limiting the edit picker to current and next month',()=>{
 const view=render(createElement(SavedDates,{...props,dates:[{date:'2026-10-30'}]}));fireEvent.click(view.container.querySelector('[data-saved-date]')!);fireEvent.click(screen.getByRole('button',{name:'2026-10-30'}));
 expect((view.container.querySelector('form input[name=date]') as HTMLInputElement).value).toBe('2026-10-30');
 expect(view.container.querySelector('[data-day="2026-10-30"]')).toBeNull();expect(screen.getByText('2026년 11월')).toBeTruthy();
 expect((screen.getByRole('button',{name:'이전 달'}) as HTMLButtonElement).disabled).toBe(true);
});
