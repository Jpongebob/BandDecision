// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {ActionForm} from '../src/components/action-form';
afterEach(cleanup);
describe('action form reset boundaries',()=>{
 it('keeps the newly saved member skill for the next save',async()=>{
  const submitted:string[]=[];
  const action=vi.fn(async(_:unknown,data:FormData)=>{submitted.push(String(data.get('skill')));return{success:'실력을 수정했습니다.'};});
  const view=render(<ActionForm action={action} submit="실력 저장" resetOnSuccess={false}><select name="skill" defaultValue="3"><option value="">미설정</option><option value="3">3</option><option value="4">4</option></select></ActionForm>);
  const select=view.container.querySelector('select')!;fireEvent.change(select,{target:{value:'4'}});
  fireEvent.submit(view.container.querySelector('form')!);await screen.findByText('실력을 수정했습니다.');
  expect(select.value).toBe('4');
  fireEvent.submit(view.container.querySelector('form')!);await waitFor(()=>expect(submitted).toEqual(['4','4']));
 });
 it('preserves clearing a skill to unassigned and accepts fresh server values',async()=>{
  const action=async()=>({success:'Saved'});
  const content=(skill:string)=><ActionForm action={action} resetOnSuccess={false}><select key={skill} name="skill" defaultValue={skill}><option value="">미설정</option><option value="3">3</option><option value="4">4</option></select></ActionForm>;
  const view=render(content('3'));fireEvent.change(view.container.querySelector('select')!,{target:{value:''}});
  fireEvent.submit(view.container.querySelector('form')!);await screen.findByText('Saved');
  expect(view.container.querySelector('select')!.value).toBe('');
  view.rerender(content('4'));expect(view.container.querySelector('select')!.value).toBe('4');
 });
 it('keeps a skill draft on save failure for retry',async()=>{
  const view=render(<ActionForm action={async()=>({error:'저장 실패'})} resetOnSuccess={false}><select name="skill" defaultValue="3"><option value="3">3</option><option value="4">4</option></select></ActionForm>);
  fireEvent.change(view.container.querySelector('select')!,{target:{value:'4'}});fireEvent.submit(view.container.querySelector('form')!);await screen.findByText('저장 실패');expect(view.container.querySelector('select')!.value).toBe('4');
 });
 it('retains profile and PIN after an action returns a validation error',async()=>{
  const action=vi.fn(async()=>({error:'Wrong PIN'}));
  const view=render(<ActionForm action={action}><input name="pin" defaultValue=""/></ActionForm>);
  const input=view.container.querySelector('input')!;fireEvent.change(input,{target:{value:'123456'}});
  fireEvent.submit(view.container.querySelector('form')!);await screen.findByText('Wrong PIN');
  expect(input.value).toBe('123456');
 });
 it('clears uncontrolled fields after a successful save',async()=>{
  const view=render(<ActionForm action={async()=>({success:"Saved"})}><input name="title" defaultValue=""/></ActionForm>);
  const input=view.container.querySelector('input')!;fireEvent.change(input,{target:{value:'My song'}});
  fireEvent.submit(view.container.querySelector('form')!);await screen.findByText('Saved');
  await waitFor(()=>expect(input.value).toBe(''));
 });
});
