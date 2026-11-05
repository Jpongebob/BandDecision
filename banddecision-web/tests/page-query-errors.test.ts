import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({failure:''}));
vi.mock('@/lib/supabase/server',()=>({
 createClient:async()=>({from:(table:string)=>{
  const result={data:table==='planning_rounds'?{id:'r',start_date:'2026-11-05',end_date:'2027-01-03'}:null,count:0,error:state.failure===table?{code:'57014'}:null};
  const q={select:()=>q,eq:()=>q,in:()=>q,gte:()=>q,lte:()=>q,order:()=>q,maybeSingle:async()=>result,then:(resolve:(value:unknown)=>unknown,reject?:(reason:unknown)=>unknown)=>Promise.resolve(result).then(resolve,reject)};
  return q;
 }}),getCurrentUser:async()=>({id:'u',nickname:'Me'}),
}));
vi.mock('@/lib/band-context',()=>({
 getActiveMember:async()=>({data:{id:'m',band_id:'b',role:'leader'},error:null}),
 getBandContext:async()=>({status:'ready',member:{id:'m',band_id:'b',role:'leader'},band:{id:'b',name:'Band'}}),
}));
vi.mock('@/components/availability-form',()=>({AvailabilityForm:()=>createElement('p',null,'EDITOR')}));
import SchedulePage from '../src/app/(protected)/schedule/page';
import PlansPage from '../src/app/(protected)/plans/page';
import DateRecommendationsPage from '../src/app/(protected)/schedule/recommendations/page';
import Dashboard from '../src/app/(protected)/dashboard/page';
beforeEach(()=>{state.failure='';});
describe('server pages refuse partial database reads',()=>{
 it('does not label an excluded new member as submitted or offer their schedule editor',async()=>{
  const html=renderToStaticMarkup(await SchedulePage());
  expect(html).toContain('새 회차부터');
  expect(html).not.toContain('EDITOR');
  expect(html).not.toContain('제출 완료');
 });
 it.each(['planning_rounds','round_participants','round_submissions','unavailable_dates','band_members'])('date recommendations reject failed %s',async table=>{
  state.failure=table;await expect(DateRecommendationsPage()).rejects.toThrow('DATA_LOAD_FAILED');
 });
 it.each(['planning_rounds','unavailable_dates','round_submissions'])('schedule rejects failed %s instead of displaying empty/default input',async table=>{
  state.failure=table;await expect(SchedulePage()).rejects.toThrow('DATA_LOAD_FAILED');
 });
 it.each(['planning_rounds','confirmed_plans'])('plans rejects failed %s instead of claiming no confirmed plan',async table=>{
  state.failure=table;await expect(PlansPage()).rejects.toThrow('DATA_LOAD_FAILED');
 });
 it.each(['planning_rounds','confirmed_plans','band_members'])('dashboard rejects failed %s instead of inventing empty state',async table=>{
  state.failure=table;await expect(Dashboard()).rejects.toThrow('DATA_LOAD_FAILED');
 });
});
