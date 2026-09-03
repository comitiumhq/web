import { useQueryPublicScheduleState } from '@/hooks/queries/use-query-public-schedule';

import { AvailablePublicSchedule } from './available-schedule';
import { PublicScheduleLoading } from './loading-state';
import { PublicScheduleTerminalState } from './terminal-state';
import type { PublicSchedulePageProps } from './types';

export function PublicSchedulePage({ token }: PublicSchedulePageProps) {
  const stateQuery = useQueryPublicScheduleState(token);

  if (stateQuery.isLoading) {
    return <PublicScheduleLoading />;
  }

  if (stateQuery.error || !stateQuery.data) {
    return <PublicScheduleTerminalState status="unavailable" />;
  }

  const state = stateQuery.data.data;

  if (state.status !== 'available') {
    return <PublicScheduleTerminalState status={state.status} />;
  }

  return <AvailablePublicSchedule token={token} state={state} onStateRefresh={stateQuery.refetch} />;
}
