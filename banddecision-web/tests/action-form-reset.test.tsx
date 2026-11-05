// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {ActionForm} from '../src/components/action-form';
afterEach(cleanup);
describe('action form reset boundaries',()=>{
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
