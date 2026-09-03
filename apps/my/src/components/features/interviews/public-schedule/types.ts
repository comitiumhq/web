import type { PublicScheduleSlot } from '@/lib/schemas/public-schedule';

export interface PublicSchedulePageProps {
  token: string;
}

export type SlotGroupData = {
  key: string;
  label: string;
  date: Date;
  slots: PublicScheduleSlot[];
};
