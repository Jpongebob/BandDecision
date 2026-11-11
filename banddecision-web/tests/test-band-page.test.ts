// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({user:vi.fn(),setup:null as unknown}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:async()=>({data:state.setup,error:null})}),getCurrentUser:state.user}));
vi.mock('@/app/actions',()=>({signOutAction:vi.fn()}));
vi.mock('@/app/band-login-actions',()=>({createTestBandAction:vi.fn(async()=>({})),addTestMembersAction:vi.fn(async()=>({}))}));
import TestBandPage from '../src/app/bands/test/page';
// The page only exists in local QA (ENABLE_TEST_BANDS and a loopback Supabase).
beforeEach(()=>{vi.stubEnv('ENABLE_TEST_BANDS','true');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:54321');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
describe('test band entry',()=>{
 it('lets an existing one-person fixture leader resume preparation',async()=>{
  state.setup={prepared:false,members:[]};state.user.mockResolvedValue({nickname:'Test leader'});
  render(await TestBandPage());
  expect(screen.getByRole('button',{name:'테스트 멤버 추가하고 5인 추천 준비'})).toBeTruthy();
 });
 it('lets an unassigned visitor choose personal credentials and shows the actual test cases',async()=>{
  state.setup=null;state.user.mockResolvedValue(null);
  const view=render(await TestBandPage());
  expect(screen.getByRole('button',{name:'테스트 밴드 만들고 밴드장으로 접속'})).toBeTruthy();
  expect(screen.getByLabelText('내 테스트 닉네임')).toBeTruthy();
  expect(screen.getByText(/A는 추천 가능/)).toBeTruthy();
  expect(view.container.querySelector('input[name="admin_pin"]')).toBeNull();
  expect(screen.getByLabelText(/테스트 멤버 공통 PIN/)).toBeTruthy();
 });
 it('never silently replaces an active real-band profile',async()=>{
  state.setup=null;state.user.mockResolvedValue({nickname:'Real member'});
  render(await TestBandPage());
  expect(screen.queryByRole('button',{name:'테스트 밴드 만들고 밴드장으로 접속'})).toBeNull();
  expect(screen.getByRole('link',{name:'현재 밴드로 돌아가기'}).getAttribute('href')).toBe('/dashboard');
 });
});
