// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  router: { refresh: vi.fn() },
  event: undefined as (() => void) | undefined,
  removeChannel: vi.fn(async () => undefined),
}));
vi.mock('next/navigation', () => ({ useRouter: () => state.router }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const channel = {
      on: (_type: unknown, _filter: unknown, callback: () => void) => { state.event = callback; return channel; },
      subscribe: () => channel,
    };
    return { channel: () => channel, removeChannel: state.removeChannel };
  },
}));
import { LiveRefresh } from '../src/components/live-refresh';

const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
function visible(value: string) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  visible('visible');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
  else Reflect.deleteProperty(document, 'visibilityState');
});

describe('Realtime refresh integration', () => {
  it('combines database event bursts and cancels pending work on unmount', () => {
    const view = render(createElement(LiveRefresh));
    act(() => { for (let row = 0; row < 30; row++) state.event?.(); vi.advanceTimersByTime(200); });
    expect(state.router.refresh).toHaveBeenCalledOnce();
    act(() => state.event?.());
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(state.router.refresh).toHaveBeenCalledOnce();
    expect(state.removeChannel).toHaveBeenCalledOnce();
  });
  it('defers background updates and refreshes once when returning to the page', () => {
    render(createElement(LiveRefresh));
    visible('hidden');
    act(() => { state.event?.(); vi.advanceTimersByTime(1000); });
    expect(state.router.refresh).not.toHaveBeenCalled();
    visible('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(200);
    });
    expect(state.router.refresh).toHaveBeenCalledOnce();
  });
});
