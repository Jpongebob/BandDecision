// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({user:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({}),getCurrentUser:state.user}));
vi.mock('@/app/actions',()=>({signOutAction:vi.fn()}));
vi.mock('@/app/band-login-actions',()=>({createTestBandAction:vi.fn(async()=>({}))}));
import TestBandPage from '../src/app/bands/test/page';
afterEach(cleanup);
describe('test band entry',()=>{
 it('lets an unassigned visitor choose personal credentials and shows the actual test cases',async()=>{
  state.user.mockResolvedValue(null);
  const view=render(await TestBandPage());
  expect(screen.getByRole('button',{name:'테스트 밴드 만들고 밴드장으로 접속'})).toBeTruthy();
  expect(screen.getByLabelText('내 테스트 닉네임')).toBeTruthy();
  expect(screen.getByText(/A는 추천 가능/)).toBeTruthy();
  expect(view.container.querySelector('input[name="admin_pin"]')).toBeNull();
 });
 it('never silently replaces an active real-band profile',async()=>{
  state.user.mockResolvedValue({nickname:'Real member'});
  render(await TestBandPage());
  expect(screen.queryByRole('button',{name:'테스트 밴드 만들고 밴드장으로 접속'})).toBeNull();
  expect(screen.getByRole('link',{name:'현재 밴드로 돌아가기'}).getAttribute('href')).toBe('/dashboard');
 });
});
