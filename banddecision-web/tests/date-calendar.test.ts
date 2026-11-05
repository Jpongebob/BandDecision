// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {DateCalendar,dateRange} from '../src/components/date-calendar';
afterEach(cleanup);
it('handles leap day, reverse ranges and year boundaries without timezone drift',()=>{expect(dateRange('2028-03-01','2028-02-28')).toEqual(['2028-02-28','2028-02-29','2028-03-01']);expect(dateRange('2026-12-31','2027-01-01')).toEqual(['2026-12-31','2027-01-01']);expect(dateRange('2026-01-01','2029-12-31')).toHaveLength(367);});
it('crosses December into January and invokes selection for the exact date',()=>{const onSelect=vi.fn();render(createElement(DateCalendar,{today:'2026-12-01',selected:[],onSelect}));fireEvent.click(screen.getByRole('button',{name:'다음 달'}));fireEvent.click(screen.getByRole('button',{name:'2027-01-01'}));expect(onSelect).toHaveBeenCalledWith('2027-01-01');});
it('does not submit its parent form when choosing a day or changing months',()=>{const submit=vi.fn();const view=render(createElement('form',{onSubmit:submit},createElement(DateCalendar,{today:'2026-11-05',selected:[],onSelect:vi.fn()})));fireEvent.click(screen.getByRole('button',{name:'2026-11-06'}));fireEvent.click(screen.getByRole('button',{name:'다음 달'}));expect(submit).not.toHaveBeenCalled();expect(Array.from(view.container.querySelectorAll('button')).every(b=>b.type==='button')).toBe(true);});
