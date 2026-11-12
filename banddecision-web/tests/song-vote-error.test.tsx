// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const save=vi.hoisted(()=>vi.fn(async():Promise<{error?:string;success?:string}>=>({error:'연결 오류로 저장하지 못했어요.'})));
vi.mock('@/app/live-actions',()=>({liveVoteAction:save}));
import {SongVoteFields} from '../src/components/song-vote-fields';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('keeps the saved vote selected when submitting a different vote fails',async()=>{
 render(<SongVoteFields songId={1} choice="yes"/>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'반대'}));});
 expect(save).toHaveBeenCalledOnce();
 expect(screen.getByRole('alert').textContent).toContain('저장하지 못했어요');
 expect(screen.getByRole('button',{name:'찬성'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('button',{name:'반대'}).getAttribute('aria-pressed')).toBe('false');
});
it('shows no selected vote after the first vote fails and allows a successful retry',async()=>{
 render(<SongVoteFields songId={1}/>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'찬성'}));});
 for(const name of ['찬성','반대'])expect(screen.getByRole('button',{name}).getAttribute('aria-pressed')).toBe('false');
 save.mockResolvedValueOnce({success:'저장했어요.'});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'찬성'}));});
 expect(screen.queryByRole('alert')).toBeNull();
 expect(screen.getByRole('button',{name:'찬성'}).getAttribute('aria-pressed')).toBe('true');
});
it('preserves the edited rejection reason when saving it fails',async()=>{
 render(<SongVoteFields songId={1} choice="no" reason="기존 사유"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'다시 입력한 사유'}});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'사유 저장'}));});
 expect(screen.getByRole('alert')).toBeTruthy();
 expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('다시 입력한 사유');
});
