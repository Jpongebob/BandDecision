// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({addAvailabilityAction:vi.fn(async()=>({success:'saved'})),editAvailabilityAction:vi.fn(async()=>({})),deleteAvailabilityAction:vi.fn(async()=>({}))}));
import {AvailabilityForm} from '../src/components/availability-form';
afterEach(cleanup);
const props={today:'2026-11-05',savedDates:[{date:'2026-12-08',reason:'original'}]};
describe('separate new and saved dates',()=>{
 it('shows an existing date only in saved dates and starts with an empty new-date input',()=>{
  const view=render(createElement(AvailabilityForm,props));expect(screen.getAllByText('2026-12-08')).toHaveLength(1);expect((view.container.querySelector('input[type=date]') as HTMLInputElement).value).toBe('');expect(screen.queryByText(/선택 날짜/)).toBeNull();expect(screen.queryByText(/이번 회차/)).toBeNull();
 });
 it('prevents adding a past date',()=>{render(createElement(AvailabilityForm,props));fireEvent.change(screen.getAllByLabelText('날짜',{exact:true})[0],{target:{value:'2026-11-04'}});fireEvent.change(screen.getAllByLabelText('불참 사유',{exact:true})[0],{target:{value:'work'}});expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(true);});
 it('directs duplicate dates to the saved editor without overwriting them',()=>{render(createElement(AvailabilityForm,props));fireEvent.change(screen.getAllByLabelText('날짜',{exact:true})[0],{target:{value:'2026-12-08'}});expect(screen.getByText(/이미 저장된 날짜입니다/)).toBeTruthy();expect((screen.getByRole('button',{name:'날짜 저장'}) as HTMLButtonElement).disabled).toBe(true);});
 it('has independent saved edit and delete actions',()=>{const view=render(createElement(AvailabilityForm,props));expect(view.container.querySelector('input[name=old_date]')?.getAttribute('value')).toBe('2026-12-08');expect(screen.getByRole('button',{name:'날짜 삭제'})).toBeTruthy();expect(view.container.querySelector('input[name=reason]')?.getAttribute('value')).toBe('original');});
 it('quick none clears only a new draft and does not delete saved dates',()=>{render(createElement(AvailabilityForm,props));fireEvent.click(screen.getByText('여러 날짜 한 번에 추가'));fireEvent.change(screen.getByLabelText('빠른 날짜 입력'),{target:{value:'없음'}});fireEvent.click(screen.getByRole('button',{name:'추가할 날짜 확인'}));expect(screen.getByText('2026-12-08')).toBeTruthy();expect(screen.queryByRole('button',{name:/일 저장/})).toBeNull();});
});
