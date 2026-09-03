import { successSchema } from '@comitium/schemas/public';
import type {
  CancelInterviewBody,
  CreateDirectBookingLinkBody,
  GetInterviewBusyBody,
  RescheduleInterviewBody,
  ScheduleInterviewBody,
  SendDirectBookingLinkBody,
} from '@/lib/schemas/interviews';
import {
  calConnectResponseSchema,
  calendarStatusSchema,
  calTokenSchema,
  createDirectBookingLinkResponseSchema,
  createInterviewResponseSchema,
  interviewBriefingResponseSchema,
  interviewBusyResponseSchema,
  interviewProgressResponseSchema,
  interviewRsvpResponseSchema,
  interviewsListSchema,
  myInterviewsListSchema,
  sendDirectBookingLinkResponseSchema,
} from '@/lib/schemas/interviews';

import { api } from './client';
import { buildCursorSearchParams, DEFAULT_CURSOR_PAGE_SIZE } from './cursor-pagination';

// --- Availability ---

export function getInterviewBusyTimes(applicationId: string, body: GetInterviewBusyBody) {
  return api.post(`/applications/${applicationId}/interviews/busy`, body, interviewBusyResponseSchema);
}

export function getInterviewRsvp(applicationId: string, interviewId: string) {
  return api.get(`/applications/${applicationId}/interviews/${interviewId}/rsvp`, interviewRsvpResponseSchema);
}

// --- Interview CRUD ---

export function getApplicationInterviews(applicationId: string, limit = DEFAULT_CURSOR_PAGE_SIZE, cursor?: string) {
  const params = buildCursorSearchParams(limit, cursor);

  return api.get(`/applications/${applicationId}/interviews?${params.toString()}`, interviewsListSchema);
}

export function getApplicationInterviewProgress(applicationId: string) {
  return api.get(`/applications/${applicationId}/interview-progress`, interviewProgressResponseSchema);
}

export function getInterviewBriefing(applicationId: string, interviewEventId: string) {
  const params = new URLSearchParams({ interviewEventId });

  return api.get(
    `/applications/${applicationId}/interview-briefing?${params.toString()}`,
    interviewBriefingResponseSchema,
  );
}

export function scheduleInterview(applicationId: string, body: ScheduleInterviewBody) {
  return api.post(`/applications/${applicationId}/interviews`, body, createInterviewResponseSchema);
}

export function createDirectBookingLink(applicationId: string, body: CreateDirectBookingLinkBody) {
  return api.post(
    `/applications/${applicationId}/interviews/direct-booking-link`,
    body,
    createDirectBookingLinkResponseSchema,
  );
}

export function sendDirectBookingLink(applicationId: string, scheduleId: string, body: SendDirectBookingLinkBody) {
  return api.post(
    `/applications/${applicationId}/interviews/${scheduleId}/direct-booking-link/send`,
    body,
    sendDirectBookingLinkResponseSchema,
  );
}

export function cancelInterview(applicationId: string, interviewId: string, body?: CancelInterviewBody) {
  return api.post(`/applications/${applicationId}/interviews/${interviewId}/cancel`, body ?? {}, successSchema);
}

export function rescheduleInterview(applicationId: string, interviewId: string, body: RescheduleInterviewBody) {
  return api.post(`/applications/${applicationId}/interviews/${interviewId}/reschedule`, body, successSchema);
}

export function completeInterview(applicationId: string, interviewId: string) {
  return api.post(`/applications/${applicationId}/interviews/${interviewId}/complete`, undefined, successSchema);
}

export function markInterviewNoShow(applicationId: string, interviewId: string) {
  return api.post(`/applications/${applicationId}/interviews/${interviewId}/no-show`, undefined, successSchema);
}

// --- Cal token & calendar ---

export function getCalToken(orgId: string) {
  return api.get(`/orgs/${orgId}/cal/token`, calTokenSchema);
}

export function getCalendarStatus(orgId: string) {
  return api.get(`/orgs/${orgId}/cal/calendar-status`, calendarStatusSchema);
}

export function disconnectCalendar(orgId: string) {
  return api.delete(`/orgs/${orgId}/cal/calendar`, successSchema);
}

export function connectCalendar(orgId: string) {
  return api.post(`/orgs/${orgId}/cal/connect`, {}, calConnectResponseSchema);
}

// --- My interviews (interviewer view) ---

export function getMyInterviews(orgId: string) {
  return api.get(`/orgs/${orgId}/members/me/interviews`, myInterviewsListSchema);
}
