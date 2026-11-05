// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/actions',()=>({submitUnavailableAction:vi.fn(async()=>({}))}));
import { AvailabilityForm } from '../src/components/availability-form';
afterEach(cleanup);
const props={roundId:'round',startDate:'2026-11-05',endDate:'2027-01-03',today:'2026-11-05',initialDates:[{date:'2026-11-08',reason:'원래 일정'}]};
describe('availability editing regressions',()=>{
 it('explicit none replaces previously selected dates instead of resubmitting them',()=>{
  const view=render(createElement(AvailabilityForm,props));
  fireEvent.change(screen.getByLabelText('빠른 날짜 입력'),{target:{value:'없음'}});
  fireEvent.click(screen.getByRole('button',{name:'빠른 입력 날짜 추가'}));
  expect((view.container.querySelector('input[name="dates_json"]') as HTMLInputElement).value).toBe('[]');
  expect(screen.getByText('선택 날짜 0일')).toBeTruthy();
 });
 it('rejects a past native-calendar selection before it enters the submitted list',()=>{
  const view=render(createElement(AvailabilityForm,props));
  fireEvent.change(screen.getByLabelText('달력에서 날짜 선택'),{target:{value:'2026-11-04'}});
  fireEvent.click(screen.getByRole('button',{name:'날짜 추가'}));
  expect(screen.getByRole('alert').textContent).toContain('지난 날짜');
  expect((view.container.querySelector('input[name="dates_json"]') as HTMLInputElement).value).not.toContain('2026-11-04');
 });
});
