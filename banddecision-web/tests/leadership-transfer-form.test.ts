// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/app/actions', () => ({ transferLeaderAction: vi.fn(async () => ({})) }));
import { LeadershipTransferForm } from '../src/components/leadership-transfer-form';

afterEach(cleanup);
function open() { fireEvent.click(screen.getByText('이 멤버에게 밴드장 권한 넘기기')); }
describe('leadership transfer confirmation UI', () => {
  it('requires a distinct administrator PIN field and explicit handoff acknowledgement in code mode', () => {
    const view = render(createElement(LeadershipTransferForm, { bandId: 'band', memberId: 'member', nickname: 'Bass', codeLoginEnabled: true }));
    open();
    const form = view.container.querySelector('form')!;
    expect(form.checkValidity()).toBe(false);
    fireEvent.change(screen.getByLabelText(/새 관리자 PIN/), { target: { value: '001234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(form.checkValidity()).toBe(true);
    expect(screen.getByText(/나는 일반 멤버가 됩니다/)).toBeTruthy();
  });
  it('retains the explicit acknowledgement for legacy email bands without requiring a code-only PIN', () => {
    const view = render(createElement(LeadershipTransferForm, { bandId: 'band', memberId: 'member', nickname: 'Drums', codeLoginEnabled: false }));
    open();
    expect(screen.queryByLabelText(/새 관리자 PIN/)).toBeNull();
    const form = view.container.querySelector('form')!;
    expect(form.checkValidity()).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(form.checkValidity()).toBe(true);
  });
});
