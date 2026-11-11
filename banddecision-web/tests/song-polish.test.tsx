import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('@/app/live-actions',()=>({deleteBandSongAction:vi.fn(),setSongConfirmationAction:vi.fn(),liveVoteAction:vi.fn(),withdrawSongVoteAction:vi.fn(),updateBandSongAction:vi.fn()}));
vi.mock('@/app/actions',()=>({difficultyAction:vi.fn()}));
import {SongList} from '../src/components/song-list';
import {SongChips} from '../src/components/plan-bits';
const members=[{id:'a',userId:'ua',nickname:'Ann',part:'기타',partKey:'기타',skill:null},{id:'b',userId:'ub',nickname:'Bo',part:'베이스',partKey:'베이스',skill:null}];
const song={id:7,title:'Candidate',artist:'Artist',confirmedAt:null,difficulties:{기타:3},difficultyMeta:{기타:{version:2,updatedBy:'Ann',updatedAt:'2026-11-10T10:00:00Z'}},votes:[{memberId:'a',choice:'yes' as const,reason:null}]};

it('song detail calls a missing vote 미응답 and shows no difficulty edit history',()=>{
 const html=renderToStaticMarkup(<SongList bandId="band" memberId="a" participants={members} songs={[song]} detailed difficultyEnabled/>);
 expect(html).toContain('미응답');expect(html).not.toContain('>아직<');
 expect(html).toContain('파트별 난이도');expect(html).not.toContain('마지막 수정');
});
it('a plan card can list every song, with no hidden "+N곡" chip',()=>{
 const titles=['One','Two','Three','Four','Five'];
 const html=renderToStaticMarkup(<SongChips titles={titles} max={titles.length}/>);
 for(const t of titles)expect(html).toContain(t);
 expect(html).not.toContain('외 ');
});
