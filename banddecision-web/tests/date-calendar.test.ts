// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {DateCalendar,dateRange} from '../src/components/date-calendar';
afterEach(cleanup);
it('handles leap day, reverse ranges and year boundaries without timezone drift',()=>{expect(dateRange('2028-03-01','2028-02-28')).toEqual(['2028-02-28','2028-02-29','2028-03-01']);expect(dateRange('2026-12-31','2027-01-01')).toEqual(['2026-12-31','2027-01-01']);expect(dateRange('2026-01-01','2029-12-31')).toHaveLength(367);});
it('crosses December into January and invokes selection for the exact date',()=>{const onSelect=vi.fn();render(createElement(DateCalendar,{today:'2026-12-01',selected:[],onSelect}));fireEvent.click(screen.getByRole('button',{name:'다음 달'}));fireEvent.click(screen.getByRole('button',{name:'2027-01-01'}));expect(onSelect).toHaveBeenCalledWith('2027-01-01');});
it('does not submit its parent form when choosing a day or changing months',()=>{const submit=vi.fn();const view=render(createElement('form',{onSubmit:submit},createElement(DateCalendar,{today:'2026-11-05',selected:[],onSelect:vi.fn()})));fireEvent.click(screen.getByRole('button',{name:'2026-11-06'}));fireEvent.click(screen.getByRole('button',{name:'다음 달'}));expect(submit).not.toHaveBeenCalled();expect(Array.from(view.container.querySelectorAll('button')).every(b=>b.type==='button')).toBe(true);});

it('keyboard arrows skip unavailable saved days instead of trapping focus',async()=>{
 render(createElement(DateCalendar,{today:'2026-11-05',selected:[],disabled:(day:string)=>day==='2026-11-07',onSelect:vi.fn()}));
 const start=screen.getByRole('button',{name:'2026-11-06'});start.focus();fireEvent.keyDown(start,{key:'ArrowRight'});
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'2026-11-08'})),{timeout:200});
});
it('PageUp respects the same first-month boundary as the previous-month button',()=>{
 render(createElement(DateCalendar,{today:'2026-11-05',selected:[],onSelect:vi.fn()}));
 fireEvent.keyDown(screen.getByRole('button',{name:'2026-11-06'}),{key:'PageUp'});
 expect(screen.getByText('2026년 11월')).toBeTruthy();
});

it('PageDown preserves focus and clamps the day at the end of a shorter month',async()=>{
 const onSelect=vi.fn();render(createElement(DateCalendar,{today:'2027-01-01',selected:[],onSelect}));
 const start=screen.getByRole('button',{name:'2027-01-31'});start.focus();fireEvent.keyDown(start,{key:'PageDown'});
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'2027-02-28'})));
 expect(onSelect).not.toHaveBeenCalled();
});
it('keyboard focus crosses a month boundary while skipping disabled dates',async()=>{
 render(createElement(DateCalendar,{today:'2026-11-01',selected:[],disabled:(day:string)=>day==='2026-12-01',onSelect:vi.fn()}));
 const start=screen.getByRole('button',{name:'2026-11-30'});start.focus();fireEvent.keyDown(start,{key:'ArrowRight'});
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'2026-12-02'})));
});

it('does not move past next month with buttons or keyboard',()=>{
 render(createElement(DateCalendar,{today:'2026-12-06',selected:[],onSelect:vi.fn()}));fireEvent.click(screen.getByRole('button',{name:'다음 달'}));
 expect((screen.getByRole('button',{name:'다음 달'}) as HTMLButtonElement).disabled).toBe(true);
 const end=screen.getByRole('button',{name:'2027-01-31'});fireEvent.keyDown(end,{key:'PageDown'});fireEvent.keyDown(end,{key:'ArrowRight'});
 expect(screen.getByText('2027년 1월')).toBeTruthy();expect(screen.queryByText('2027년 2월')).toBeNull();
});
it('opens a previously saved out-of-window date within the two visible months',()=>{
 render(createElement(DateCalendar,{today:'2026-11-06',selected:['2027-04-01'],onSelect:vi.fn()}));expect(screen.getByText('2026년 12월')).toBeTruthy();
});
