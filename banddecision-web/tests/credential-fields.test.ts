// @vitest-environment jsdom
import {createElement} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {PinField,BandCodeField,BandPasswordField} from '../src/components/band-login-fields';
afterEach(cleanup);
it('normalizes pasted PIN spaces before browser pattern validation without dropping zeroes',()=>{render(createElement(PinField));const input=screen.getByLabelText('내 PIN (숫자 6자리)') as HTMLInputElement;fireEvent.change(input,{target:{value:' 00 12\t34 '}});expect(input.value).toBe('001234');expect(input.checkValidity()).toBe(true);fireEvent.change(input,{target:{value:'0012345'}});expect(input.checkValidity()).toBe(false);});
it('normalizes code whitespace and case before browser validation',()=>{render(createElement(BandCodeField));const input=screen.getByLabelText('밴드 코드') as HTMLInputElement;fireEvent.change(input,{target:{value:' ab12 cd34 ef '}});expect(input.value).toBe('AB12CD34EF');expect(input.checkValidity()).toBe(true);});
it('trims outer password whitespace while preserving intentional internal characters',()=>{render(createElement(BandPasswordField));const input=screen.getByLabelText('공용 비밀번호 (4자 이상)') as HTMLInputElement;fireEvent.change(input,{target:{value:' pass word '}});fireEvent.blur(input);expect(input.value).toBe('pass word');});
