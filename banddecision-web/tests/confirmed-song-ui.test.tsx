import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({deleteBandSongAction:vi.fn(),setSongConfirmationAction:vi.fn(),saveLivePlanAction:vi.fn(),liveVoteAction:vi.fn(),withdrawSongVoteAction:vi.fn(),updateBandSongAction:vi.fn()}));
vi.mock('@/app/actions',()=>({removeMemberAction:vi.fn(),addSongAction:vi.fn(),difficultyAction:vi.fn()}));
import {ConfirmPlanForm} from '../src/components/confirm-plan-form';
import {SongList} from '../src/components/song-list';
import {RemoveMemberForm} from '../src/components/remove-member-form';
import {recommendSongs} from '../src/services/recommendations';
const members=[{id:'m',userId:'u',nickname:'User',part:'기타',partKey:'기타',skill:null}];
const song={id:1,title:'Chosen song',artist:'Artist',confirmedAt:'2026-11-06T00:00:00Z',difficulties:{},difficultyMeta:{},votes:[]};
describe('confirmed repertoire UI',()=>{
 it('offers explicitly confirmed songs without broadening candidate eligibility',()=>{
 const songs=[song,{...song,id:2,title:'Unconfirmed song',confirmedAt:null}];
 const html=renderToStaticMarkup(<ConfirmPlanForm today="2026-11-06" data={{band_id:'b',version:1,members,available:[],songs}} songs={recommendSongs(members,songs)}/>);
 expect(html).toContain('Chosen song');expect(html).not.toContain('Unconfirmed song');expect(html).toContain('확정곡');
 });
 it('shows confirm/remove controls only for leader',()=>{
 const props={bandId:'b',memberId:'m',participants:members,songs:[song],detailed:true};
 expect(renderToStaticMarkup(<SongList {...props} canManage/>)).toContain('확정 해제');
 expect(renderToStaticMarkup(<SongList {...props}/>)).not.toContain('확정 해제');
 expect(renderToStaticMarkup(<SongList {...props}/>)).not.toContain('>곡 삭제<');
 expect(renderToStaticMarkup(<SongList {...props} canManage/>)).toContain('삭제 확인');
 expect(renderToStaticMarkup(<SongList {...props} canManage/>)).not.toContain('name="choice"');
 expect(renderToStaticMarkup(<SongList {...props} canManage/>)).not.toContain('미응답');
 expect(renderToStaticMarkup(<SongList {...props} canManage/>)).toContain('추가 투표 없이');
 expect(renderToStaticMarkup(<SongList {...props} songs={[{...song,confirmedAt:null}]} canManage/>)).toContain('이 곡 확정');
 });
 it('renders a named removal confirmation dialog with cancel and explicit consent',()=>{
 const html=renderToStaticMarkup(<RemoveMemberForm memberId="m" nickname="홍길동"/>);
 expect(html).toContain('홍길동님을 내보내겠습니까?');expect(html).toContain('<dialog');expect(html).toContain('취소');expect(html).toContain('name="confirm_remove" value="yes"');
 });
});

describe('optional song difficulty',()=>{
 for(const confirmedAt of [null,'2026-11-06'])for(const detailed of [false,true]){
  it(`hides difficulty with feature off (confirmed=${!!confirmedAt}, detailed=${detailed})`,()=>{
   const props={bandId:'b',memberId:'m',participants:members,songs:[{...song,confirmedAt,difficulties:{기타:4}}],detailed};
   const off=renderToStaticMarkup(<SongList {...props}/>);
   expect(off).not.toContain('파트별 난이도');expect(off).not.toContain('name="difficulty"');expect(off).not.toContain('기타 4');
   expect(off).toContain('Chosen song');
   const on=renderToStaticMarkup(<SongList {...props} difficultyEnabled/>);
   expect(on).toContain('기타 4');
   if(detailed){expect(on).toContain('파트별 난이도');expect(on).toContain('name="difficulty"');}
   if(detailed&&!confirmedAt)expect(off).toContain('name="choice"');
  });
 }
});
