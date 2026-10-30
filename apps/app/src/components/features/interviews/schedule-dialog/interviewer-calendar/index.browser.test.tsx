import { dayjs } from '@ilamy/calendar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { SelectedInterviewer } from '../../types';
import { getCalendarDisplayRange, getInitialCalendarDay } from '../calendar-range';
import { ILAMY_VERTICAL_CELL_SELECTOR } from './ilamy-dom';
import { InterviewerCalendar } from './index';
import '../../../../../../public/globals.css';

const mocks = vi.hoisted(() => ({
  members: [],
  calendarStatus: new Map<string, boolean>(),
  availability: {
    data: {
      interviewers: [
        {
          userId: 'interviewer-1',
          status: 'available',
          scheduleTimeZone: 'Europe/Warsaw',
          workingRanges: [{ start: '2099-01-14T00:00:00.000Z', end: '2099-01-17T00:00:00.000Z' }],
          busyTimes: [],
        },
      ],
    },
  },
}));

vi.mock('@/hooks/queries/use-query-org-team', () => ({
  useQueryOrgTeam: () => ({ data: mocks.members }),
  useQueryTeamCalendarStatusMap: () => mocks.calendarStatus,
}));

vi.mock('@/hooks/queries/use-query-interview-busy', () => ({
  useQueryInterviewBusy: () => ({
    data: mocks.availability,
    isPending: false,
    isPlaceholderData: false,
    isError: false,
  }),
}));

const interviewers: SelectedInterviewer[] = [
  {
    userId: 'interviewer-1',
    member: { userId: 'interviewer-1', name: 'Interviewer', timezone: 'Europe/Warsaw' },
    role: 'interviewer',
  },
];
const visibleDay = '2099-01-15';

function Calendar({ initialTimeZone }: { initialTimeZone: string }) {
  const [client] = useState(() => new QueryClient());
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [day, setDay] = useState(visibleDay);
  const [value, setValue] = useState<string | null>(null);

  return (
    <QueryClientProvider client={client}>
      <div style={{ height: 650 }}>
        <InterviewerCalendar
          applicationId="application-1"
          orgId="org-1"
          interviewers={interviewers}
          timeZone={timeZone}
          onTimeZoneChange={setTimeZone}
          value={value}
          onValueChange={setValue}
          durationMinutes={30}
          draftEventTitle="Interview"
          hasInterviewType
          visibleDay={day}
          onVisibleDayChange={setDay}
          className="h-full"
        />
      </div>
    </QueryClientProvider>
  );
}

describe('interviewer calendar timezone', () => {
  beforeEach(() => {
    dayjs.tz.setDefault('Europe/Warsaw');
  });

  afterEach(() => {
    dayjs.tz.setDefault();
  });

  it('keeps hour labels, cells and the selected slot aligned when switching from Warsaw to London', async () => {
    const screen = await render(<Calendar initialTimeZone="Europe/Warsaw" />);

    for (const timeZone of ['Europe/Warsaw', 'Europe/London']) {
      if (timeZone === 'Europe/London') {
        await screen.getByRole('combobox').fill(timeZone);
        await screen.getByRole('option', { name: timeZone, exact: true }).click();
      }

      const start = getCalendarDisplayRange(visibleDay, timeZone).start;
      await expect
        .poll(() => screen.container.querySelector(ILAMY_VERTICAL_CELL_SELECTOR)?.getAttribute('data-start'))
        .toBe(start.toISOString());
      await expect
        .poll(() => {
          const label = screen.getByTestId('vertical-time-14').element();
          const cell = screen.getByTestId(`vertical-cell-${visibleDay}-14-00-resource-interviewer-1`).element();
          return Math.abs(label.getBoundingClientRect().top - cell.getBoundingClientRect().top);
        })
        .toBeLessThan(1);

      await screen.getByTestId(`vertical-cell-${visibleDay}-14-00-resource-interviewer-1`).click();
      const selected = new Date(start.getTime() + (6 * 60 + 5) * 60_000).toISOString();
      await expect.element(screen.getByText(`Selected Interview at ${selected}.`, { exact: true })).toBeInTheDocument();
      await expect
        .element(screen.getByRole('group', { name: 'Selected interview slot: Interview, 2:05 PM – 2:35 PM.' }))
        .toBeInTheDocument();
    }
  });

  it.each(['Europe/London', 'Asia/Tokyo'])(
    'uses %s on initial mount and Today instead of the previous calendar timezone',
    async (timeZone) => {
      const screen = await render(<Calendar initialTimeZone={timeZone} />);

      await expect
        .poll(() => screen.container.querySelector(ILAMY_VERTICAL_CELL_SELECTOR)?.getAttribute('data-start'))
        .toBe(getCalendarDisplayRange(visibleDay, timeZone).start.toISOString());

      await screen.getByRole('button', { name: 'Today', exact: true }).click();
      const today = getInitialCalendarDay(null, timeZone);
      await expect
        .poll(() => screen.container.querySelector(ILAMY_VERTICAL_CELL_SELECTOR)?.getAttribute('data-start'))
        .toBe(getCalendarDisplayRange(today, timeZone).start.toISOString());
    },
  );
});
