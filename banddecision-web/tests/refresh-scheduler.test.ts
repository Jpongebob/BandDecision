import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler } from '../src/lib/refresh-scheduler';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
describe('Realtime refresh scheduling', () => {
  it('coalesces a multi-row database update into one refresh', () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh);
    for (let row = 0; row < 100; row++) scheduler.schedule();
    vi.advanceTimersByTime(199);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('continues to refresh during a continuous stream instead of indefinitely delaying updates', () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh);
    for (let index = 0; index < 10; index++) { scheduler.schedule(); vi.advanceTimersByTime(50); }
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
  it('can refresh a later update after the first batch completes', () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh);
    scheduler.schedule();
    vi.advanceTimersByTime(200);
    scheduler.schedule();
    vi.advanceTimersByTime(200);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it('cancels queued refreshes and ignores events after unmount/disposal', () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh);
    scheduler.schedule();
    scheduler.dispose();
    scheduler.schedule();
    vi.advanceTimersByTime(1000);
    expect(refresh).not.toHaveBeenCalled();
  });
}
);
