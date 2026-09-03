import { uuidSchema } from '@comitium/schemas/public';
import { z } from 'zod';

export const publicScheduleStatusSchema = z.enum(['available', 'booked', 'expired', 'cancelled', 'unavailable']);

export type PublicScheduleStatus = z.infer<typeof publicScheduleStatusSchema>;

const availablePublicScheduleStateSchema = z.object({
  status: z.literal('available'),
  organization: z.object({
    name: z.string(),
    logoUrl: z.string().nullable(),
  }),
  interview: z.object({
    title: z.string(),
    durationMinutes: z.number(),
    interviewerCount: z.number(),
  }),
  defaults: z.object({
    minNoticeHours: z.number(),
    rollingDays: z.number(),
    incrementMinutes: z.number(),
  }),
});

const terminalPublicScheduleStateSchema = z.object({
  status: z.enum(['booked', 'expired', 'cancelled', 'unavailable']),
});

export const publicScheduleStateResponseSchema = z.object({
  data: z.discriminatedUnion('status', [availablePublicScheduleStateSchema, terminalPublicScheduleStateSchema]),
});

export type PublicScheduleStateResponse = z.infer<typeof publicScheduleStateResponseSchema>;
export type AvailablePublicScheduleState = Extract<PublicScheduleStateResponse['data'], { status: 'available' }>;

const publicScheduleSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export type PublicScheduleSlot = z.infer<typeof publicScheduleSlotSchema>;

export const publicScheduleSlotsResponseSchema = z.object({
  data: z.object({
    slots: z.array(publicScheduleSlotSchema),
  }),
});

export type PublicScheduleSlotsResponse = z.infer<typeof publicScheduleSlotsResponseSchema>;

const bookPublicScheduleBodySchema = z.object({
  start: z.string(),
  timeZone: z.string(),
});

export type BookPublicScheduleBody = z.infer<typeof bookPublicScheduleBodySchema>;

export const bookPublicScheduleResponseSchema = z.object({
  data: z.object({
    scheduleId: uuidSchema,
    eventId: uuidSchema,
    status: z.literal('scheduled'),
    scheduledAt: z.string(),
    meetingUrl: z.string().nullable(),
  }),
});

export type BookPublicScheduleResponse = z.infer<typeof bookPublicScheduleResponseSchema>;
