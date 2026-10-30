import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getInterviewerRsvpAccessibleLabel, InterviewCard } from './interview-card';

vi.mock('@/hooks/mutations/use-interview-mutations', () => ({ useCompleteInterview: () => ({ mutate: vi.fn() }) }));
vi.mock('@/hooks/queries/use-query-interview-rsvp', () => ({ useQueryInterviewRsvp: () => ({}) }));
vi.mock('@/hooks/queries/use-query-org-team', () => ({ useQueryOrgTeamMap: () => new Map() }));
vi.mock('@/hooks/use-permissions', () => ({ useQueryOrgMe: () => ({ data: { timezone: 'Europe/Warsaw' } }) }));
vi.mock('./cancel-interview-dialog', () => ({ CancelInterviewDialog: () => null }));
vi.mock('./reschedule-dialog', () => ({ RescheduleInterviewDialog: () => null }));
vi.mock('./mark-no-show-dialog', () => ({ MarkNoShowDialog: () => null }));

function renderUnconfirmedCard(bookingPending: boolean) {
  return renderToStaticMarkup(
    createElement(InterviewCard, {
      applicationId: 'application-1',
      orgId: 'org-1',
      scheduleId: 'schedule-1',
      scheduleCreatedAt: '2026-10-30T12:00:00Z',
      canManage: false,
      interview: {
        id: 'event-1',
        title: 'Initial screen',
        interviewId: null,
        eventOrder: 0,
        scheduledAt: '2026-11-02T09:00:00Z',
        durationMinutes: 30,
        meetingUrl: null,
        location: null,
        status: 'needs_scheduling',
        bookingPending,
        confirmedAt: null,
        completedAt: null,
        noShowAt: null,
        interviewers: [],
      },
    }),
  );
}

it('shows an in-flight booking as Booking without asking the recruiter to act', () => {
  const html = renderUnconfirmedCard(true);

  expect(html).toContain('Booking…');
  expect(html).not.toContain('Needs scheduling');
  expect(html).not.toContain('Calendar booking failed');
  expect(html).not.toContain('>Scheduled<');
});

it('shows a settled unconfirmed booking as failed, never as Scheduled', () => {
  const html = renderUnconfirmedCard(false);

  expect(html).toContain('Needs scheduling');
  expect(html).toContain('Calendar booking failed');
  expect(html).not.toContain('>Scheduled<');
});

describe('getInterviewerRsvpAccessibleLabel', () => {
  it('exposes the interviewer identity and invitation response to assistive technology', () => {
    expect(getInterviewerRsvpAccessibleLabel('Ari Singh', 'accepted')).toBe('Ari Singh. Invitation response accepted.');
    expect(getInterviewerRsvpAccessibleLabel('Ari Singh', null)).toBe('Ari Singh. Invitation response not recorded.');
  });
});
