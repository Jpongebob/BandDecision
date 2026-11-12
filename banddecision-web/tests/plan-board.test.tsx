// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {PlanBoard,type BoardRow} from '../src/components/plan-board';
afterEach(cleanup);
const row=(id:string):BoardRow=>({id,label:id+' 합주',month:11,day:20,weekday:'금',time:'오후 8:00',sub:'합주실',tags:null});
const props={rows:[row('A'),row('B')],details:[<p key="A">A 상세</p>,<p key="B">B 상세</p>],pastRows:[row('과거')],pastDetails:[<p key="past">지난 합주 상세</p>],empty:<p>예정 없음</p>};
it('shows only the chosen plan and switches its detail when a row is selected',()=>{
 render(<PlanBoard {...props}/>);
 expect(screen.getByText('A 상세')).toBeTruthy();expect(screen.queryByText('B 상세')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'B 합주'}));
 expect(screen.getByText('B 상세')).toBeTruthy();expect(screen.queryByText('A 상세')).toBeNull();
});
it('falls back to the first upcoming plan when the selected plan is deleted',()=>{
 const view=render(<PlanBoard {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'B 합주'}));
 view.rerender(<PlanBoard {...props} rows={[row('A')]} details={[<p key="A">A 상세</p>]}/>);
 expect(screen.getByText('A 상세')).toBeTruthy();
 expect(screen.getByRole('button',{name:'A 합주'}).getAttribute('aria-pressed')).toBe('true');
});
it('allows viewing archived plans even when there are no upcoming plans',()=>{
 render(<PlanBoard {...props} rows={[]} details={[]}/>);
 expect(screen.getByText('예정 없음')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'지난 합주 1개'}));
 fireEvent.click(screen.getByRole('button',{name:'과거 합주'}));
 expect(screen.getByText('지난 합주 상세')).toBeTruthy();expect(screen.queryByText('예정 없음')).toBeNull();
});
it('clears a deleted archived detail and returns to the empty state',()=>{
 const view=render(<PlanBoard {...props} rows={[]} details={[]}/>);
 fireEvent.click(screen.getByRole('button',{name:'지난 합주 1개'}));
 fireEvent.click(screen.getByRole('button',{name:'과거 합주'}));
 view.rerender(<PlanBoard {...props} rows={[]} details={[]} pastRows={[]} pastDetails={[]}/>);
 expect(screen.getByText('예정 없음')).toBeTruthy();expect(screen.queryByText('지난 합주 상세')).toBeNull();
});
