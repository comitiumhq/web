import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useInterviewClock } from './use-interview-clock';

afterEach(() => vi.useRealTimers());

describe('interview clock', () => {
  it('updates at the start and end without polling or a reload', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const start = Date.parse('2026-11-02T09:00:00Z');
    vi.setSystemTime(start - 1000);
    const hook = await renderHook(() => useInterviewClock(new Date(start).toISOString(), 30, true));

    expect(hook.result.current).toBeLessThan(start);
    await vi.advanceTimersByTimeAsync(1000);
    await expect.poll(() => hook.result.current).toBe(start);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    await expect.poll(() => hook.result.current).toBe(start + 30 * 60_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('refreshes after returning to the window and clears the pending deadline on unmount', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const start = Date.parse('2026-11-02T09:00:00Z');
    vi.setSystemTime(start - 1000);
    const hook = await renderHook(() => useInterviewClock(new Date(start).toISOString(), 30, true));

    vi.setSystemTime(start + 1000);
    window.dispatchEvent(new Event('focus'));
    await expect.poll(() => hook.result.current).toBe(start + 1000);
    await hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
