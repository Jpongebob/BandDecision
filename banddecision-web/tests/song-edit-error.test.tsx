// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const save=vi.hoisted(()=>vi.fn(async():Promise<{error?:string;success?:string}>=>({error:'저장하지 못했어요.'})));
vi.mock('@/app/live-actions',()=>({updateBandSongAction:save}));
import {EditSongSheet} from '../src/components/edit-song-sheet';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('keeps both song edits after a failed save and resubmits the same draft',async()=>{
 render(<EditSongSheet songId={7} title="기존 제목" artist="기존 가수"/>);
 const dialog=document.querySelector('dialog')!;
 dialog.setAttribute('open','');
 const close=vi.fn();dialog.close=close;
 fireEvent.change(screen.getByLabelText('곡 제목'),{target:{value:'수정한 제목'}});
 fireEvent.change(screen.getByLabelText('가수'),{target:{value:'수정한 가수'}});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'저장'}));});
 expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요');
 expect((screen.getByLabelText('곡 제목') as HTMLInputElement).value).toBe('수정한 제목');
 expect((screen.getByLabelText('가수') as HTMLInputElement).value).toBe('수정한 가수');
 expect(close).not.toHaveBeenCalled();
 save.mockResolvedValueOnce({success:'곡 정보를 고쳤어요.'});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'저장'}));});
 const submitted=save.mock.calls.at(-1) as unknown as [unknown,FormData];
 expect(submitted[1].get('title')).toBe('수정한 제목');
 expect(submitted[1].get('artist')).toBe('수정한 가수');
 expect(close).toHaveBeenCalledOnce();
});
