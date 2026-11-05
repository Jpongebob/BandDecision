import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({enabled:true,granted:false,current:false,rpc:vi.fn()}));
const profile={id:'f3000000-0000-4000-8000-000000000001',nickname:'Leader',part:'기타',role:'leader',pin_ready:true};
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:state.rpc}),getCurrentUser:async()=>state.current?{nickname:'Me'}:null}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw Error('redirect:'+path);}}));
import Home from '../src/app/page';
import LoginPage from '../src/app/login/page';
import MemberPage from '../src/app/login/member/page';
beforeEach(()=>{state.enabled=true;state.granted=false;state.current=false;state.rpc.mockReset().mockImplementation(async(name:string)=>({data:name==='default_band_entry_context'?(state.enabled?{band_name:'Our band',profiles:[profile]}:null):state.granted?{band_name:'Password-granted band',profiles:[profile]}:null,error:null}));});
describe('optional profile start page',()=>{
 it('home and login open profile/PIN directly when enabled',async()=>{
 await expect(Home()).rejects.toThrow('redirect:/login/member?direct=1');
 await expect(LoginPage({searchParams:Promise.resolve({})})).rejects.toThrow('redirect:/login/member?direct=1');
 });
 it('renders public minimal profile selection without creating an Auth guest on page load',async()=>{
 const html=renderToStaticMarkup(await MemberPage({searchParams:Promise.resolve({direct:'1'})}));
 expect(html).toContain('Our band');expect(html).toContain('프로필 선택');expect(html).toContain('PIN');expect(html).not.toContain('공용 비밀번호');
 expect(state.rpc.mock.calls.map(c=>c[0])).toEqual(['default_band_entry_context']);
 });
 it('explicit code routes and invites preserve original code/password screen',async()=>{
 for(const params of [{standard:'1'},{code:'ABCDEF1234'}])expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}))).toContain('공용 비밀번호');
 expect(state.rpc).not.toHaveBeenCalled();
 });
 it('uses a granted band normally but explicit direct start chooses configured site band',async()=>{
 state.granted=true;expect(renderToStaticMarkup(await MemberPage())).toContain('Password-granted band');
 expect(renderToStaticMarkup(await MemberPage({searchParams:Promise.resolve({direct:'1'})}))).toContain('Our band');
 });
 it('disabled direct URLs fall back to standard login and signed in users continue home',async()=>{
 state.enabled=false;await expect(MemberPage({searchParams:Promise.resolve({direct:'1'})})).rejects.toThrow('redirect:/login?standard=1');
 expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({})}))).toContain('공용 비밀번호');
 state.current=true;await expect(Home()).rejects.toThrow('redirect:/dashboard');
 });
});
