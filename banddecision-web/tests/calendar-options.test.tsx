// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {PlanShareButtons} from '../src/components/plan-share';
const plan={id:'b0000000-0000-4000-8000-000000000001',date:'2026-11-20',start:'20:00',end:'22:00',songs:[],attending:4,total:5};
HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function setup(){render(<PlanShareButtons plan={plan}/>);fireEvent.click(screen.getByRole('button',{name:'캘린더에 추가'}));return screen.getByRole('dialog',{name:'캘린더에 추가'});}
it('offers Google and an authenticated HTTP calendar URL instead of a forced blob download',()=>{
 const dialog=setup(),apple=within(dialog).getByRole('link',{name:'Apple·기타 캘린더로 열기'});expect(apple.getAttribute('href')).toBe('/api/plans/'+plan.id+'/calendar.ics');expect(apple.hasAttribute('download')).toBe(false);expect(within(dialog).getByRole('link',{name:'Google 캘린더에 추가'}).getAttribute('href')).toContain('https://calendar.google.com/');expect(dialog.textContent).toContain('아이폰 Chrome');
});
it('explains file sharing fallback when the browser does not support sharing ICS files',async()=>{
 vi.stubGlobal('navigator',{canShare:()=>false,share:vi.fn()});const dialog=setup();fireEvent.click(within(dialog).getByRole('button',{name:'일정 파일 공유 · Mail로 보내기'}));await waitFor(()=>expect(within(dialog).getByRole('status').textContent).toContain('지원하지 않아요'));
});
it('shares an actual calendar attachment and leaves saving to the user',async()=>{
 const share=vi.fn(async(data:ShareData)=>{void data;});vi.stubGlobal('navigator',{canShare:()=>true,share});const dialog=setup();fireEvent.click(within(dialog).getByRole('button',{name:'일정 파일 공유 · Mail로 보내기'}));await waitFor(()=>expect(share).toHaveBeenCalledOnce());expect(share.mock.calls[0][0].files?.[0]?.name).toBe('합주-2026-11-20.ics');expect(within(dialog).getByRole('status').textContent).toContain('Mail');
});
