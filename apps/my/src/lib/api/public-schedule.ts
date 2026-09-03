import {
  type BookPublicScheduleBody,
  bookPublicScheduleResponseSchema,
  publicScheduleSlotsResponseSchema,
  publicScheduleStateResponseSchema,
} from '@/lib/schemas/public-schedule';

import { api } from './client';

interface PublicScheduleSlotsParams {
  from: string;
  to: string;
  timeZone: string;
}

export function getPublicScheduleState(token: string) {
  return api.get(`/schedule/${token}`, publicScheduleStateResponseSchema, { auth: 'none' });
}

export function getPublicScheduleSlots(token: string, params: PublicScheduleSlotsParams) {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    timeZone: params.timeZone,
  });

  return api.get(`/schedule/${token}/slots?${search.toString()}`, publicScheduleSlotsResponseSchema, {
    auth: 'none',
  });
}

export function bookPublicScheduleSlot(token: string, body: BookPublicScheduleBody) {
  return api.post(`/schedule/${token}/book`, body, bookPublicScheduleResponseSchema, { auth: 'none' });
}
