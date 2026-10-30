import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { qk } from '@/hooks/query-keys';
import type { InterviewsList } from '@/lib/schemas/interviews';
import { useQueryApplicationInterviews } from './use-query-interviews';

const mocks = vi.hoisted(() => ({ getApplicationInterviews: vi.fn() }));

vi.mock('@comitium/auth/use-is-authenticated', () => ({ useIsAuthenticated: () => true }));
vi.mock('@/lib/api/interviews', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/interviews')>()),
  getApplicationInterviews: mocks.getApplicationInterviews,
}));

afterEach(() => vi.useRealTimers());
beforeEach(() => mocks.getApplicationInterviews.mockReset());

function interviews(
  status: 'needs_scheduling' | 'scheduled',
  bookingPending = status === 'needs_scheduling',
): InterviewsList {
  return {
    data: [
      {
        id: 'schedule-1',
        stageId: null,
        status,
        availabilityRequestedAt: null,
        createdAt: '2026-10-30T12:00:00Z',
        events: [
          {
            id: 'event-1',
            title: 'Initial screen',
            interviewId: null,
            eventOrder: 0,
            scheduledAt: '2026-11-02T09:00:00Z',
            durationMinutes: 30,
            meetingUrl: status === 'scheduled' ? 'https://meet.example.com/interview' : null,
            location: null,
            status,
            confirmedAt: status === 'scheduled' ? '2026-10-30T12:00:12Z' : null,
            bookingPending,
            completedAt: null,
            noShowAt: null,
            interviewers: [],
          },
        ],
      },
    ],
    total: 1,
    pagination: { nextCursor: null, hasMore: false },
  };
}

it.each(['scheduled', 'needs_scheduling'] as const)(
  'refreshes an accepted booking until %s settles, then stops polling',
  async (status) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    mocks.getApplicationInterviews
      .mockResolvedValueOnce(interviews('needs_scheduling'))
      .mockResolvedValue(interviews(status, false));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(qk.application.interviewProgress('application-1'), { data: [] });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const hook = await renderHook(() => useQueryApplicationInterviews('application-1'), { wrapper });

    await expect.poll(() => hook.result.current.data?.data[0]?.events[0]?.status).toBe('needs_scheduling');
    await vi.advanceTimersByTimeAsync(5000);
    await expect.poll(() => hook.result.current.data?.data[0]?.events[0]?.bookingPending).toBe(false);
    expect(hook.result.current.data?.data[0]?.events[0]?.status).toBe(status);
    expect(hook.result.current.data?.data[0]?.events[0]?.meetingUrl).toBe(
      status === 'scheduled' ? 'https://meet.example.com/interview' : null,
    );
    expect(client.getQueryState(qk.application.interviewProgress('application-1'))?.isInvalidated).toBe(true);
    expect(mocks.getApplicationInterviews).toHaveBeenCalledTimes(2);
    const callsAfterConfirmation = mocks.getApplicationInterviews.mock.calls.length;

    await vi.advanceTimersByTimeAsync(30_000);
    expect(mocks.getApplicationInterviews).toHaveBeenCalledTimes(callsAfterConfirmation);
    await hook.unmount();
    client.clear();
  },
);
