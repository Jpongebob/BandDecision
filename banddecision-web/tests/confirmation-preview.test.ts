// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({saveLivePlanAction:vi.fn(async()=>({}))}));
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import type {LivePlanning,SavedPlan} from '../src/lib/live-planning';
const data:LivePlanning={band_id:'band',version:1,members:[{id:'one',userId:'u',nickname:'One',part:'기타',partKey:'기타',skill:3},{id:'two',userId:'v',nickname:'Two',part:'기타',partKey:'기타',skill:3}],unavailable:[{memberId:'two',date:'2026-11-06',reason:'work'},{memberId:'one',date:'2026-11-07',reason:'class'}],songs:[]};
const props={data,songs:[],today:'2026-11-05'};
const button=()=>screen.getByRole('button',{name:'합주 날짜 확정'}) as HTMLButtonElement;
afterEach(cleanup);
describe('direct date-only confirmation',()=>{
 it('allows immediate date-only confirmation with no preview or required songs',()=>{const view=render(createElement(ConfirmPlanForm,props));expect(button().disabled).toBe(true);fireEvent.change(screen.getByLabelText('합주 날짜'),{target:{value:'2026-11-05'}});expect(button().disabled).toBe(false);expect(screen.queryByText(/미리보기/)).toBeNull();expect(view.container.querySelectorAll('input[name=song_id]')).toHaveLength(0);});
 it('shows attendance immediately and does not reuse acknowledgement after changing date',()=>{render(createElement(ConfirmPlanForm,props));fireEvent.change(screen.getByLabelText('합주 날짜'),{target:{value:'2026-11-06'}});expect(button().disabled).toBe(true);fireEvent.click(screen.getByLabelText(/부분 참석으로 진행/));expect(button().disabled).toBe(false);fireEvent.change(screen.getByLabelText('합주 날짜'),{target:{value:'2026-11-07'}});expect(button().disabled).toBe(true);expect((screen.getByLabelText(/부분 참석으로 진행/) as HTMLInputElement).checked).toBe(false);});
 it('edits an existing plan with its version and retains existing selected songs',()=>{const plan:SavedPlan={id:'p',version:4,rehearsal_date:'2026-11-05',starts_at:'20:00',ends_at:'22:00',participant_count:2,attendee_count:2,confirmed_plan_members:[],confirmed_plan_songs:[{id:'s',source_song_id:1,title_snapshot:'Saved song',artist_snapshot:'Band',display_order:1}]};const view=render(createElement(ConfirmPlanForm,{...props,plan}));expect(view.container.querySelector('input[name=plan_id]')?.getAttribute('value')).toBe('p');expect(view.container.querySelector('input[name=plan_version]')?.getAttribute('value')).toBe('4');expect((screen.getByLabelText(/Saved song/) as HTMLInputElement).checked).toBe(true);expect(screen.getByRole('button',{name:'계획 수정 저장'})).toBeTruthy();});
});
