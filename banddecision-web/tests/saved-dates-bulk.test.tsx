// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({remove:vi.fn()}));
vi.mock('@/app/live-actions',()=>({deleteAvailabilityDatesAction:mock.remove,editAvailabilityAction:vi.fn(),deleteAvailabilityAction:vi.fn()}));
import {SavedDates} from '../src/components/saved-dates';
const dates=['2026-11-06','2026-11-07','2026-12-01'].map(date=>({date}));
beforeEach(()=>{
 mock.remove.mockReset().mockResolvedValue({success:'선택한 날짜를 삭제했습니다.'});
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
afterEach(cleanup);
function setup(){render(<SavedDates dates={dates} today="2026-11-06" counts={()=>({attending:2,absent:4})}/>);fireEvent.click(screen.getByRole('button',{name:'여러 날짜 삭제'}));}
it('toggles all and month groups without touching data until confirmed',()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'전체 선택'}));expect(screen.getByText('3일 선택')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'전체 선택 취소'}));expect(screen.getByText('0일 선택')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2026-11 전체 선택'}));expect(screen.getByText('2일 선택')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'2026-11 선택 취소'}));expect(screen.getByText('0일 선택')).toBeTruthy();expect(mock.remove).not.toHaveBeenCalled();
});
it('cancels confirmation without deleting, then deletes precisely the chosen dates once',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:/2026-11-06 .*삭제 날짜 선택/}));
 fireEvent.click(screen.getByRole('button',{name:'선택한 1일 삭제'}));let dialog=screen.getByRole('dialog',{name:'선택한 1일을 삭제할까요?'});
 fireEvent.click(within(dialog).getByRole('button',{name:'취소'}));expect(mock.remove).not.toHaveBeenCalled();expect(screen.getByText('1일 선택')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'선택한 1일 삭제'}));dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'삭제하기'}));
 await waitFor(()=>expect(mock.remove).toHaveBeenCalledOnce());const submitted=mock.remove.mock.calls[0][1] as FormData;expect(JSON.parse(String(submitted.get('dates_json')))).toEqual(['2026-11-06']);
 await waitFor(()=>expect(screen.getByText('선택한 날짜를 삭제했습니다.')).toBeTruthy());
});
it('keeps selection and shows server errors for retry',async()=>{
 mock.remove.mockResolvedValue({error:'연결을 확인하세요.'});setup();fireEvent.click(screen.getByRole('button',{name:'전체 선택'}));fireEvent.click(screen.getByRole('button',{name:'선택한 3일 삭제'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'삭제하기'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('연결을 확인하세요.'));expect(screen.getByText('3일 선택')).toBeTruthy();
});
