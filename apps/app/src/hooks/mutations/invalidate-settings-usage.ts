import type { QueryClient } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';

export function invalidateSettingsUsage(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: qk.templates.interviewsAllRoot() });
  queryClient.invalidateQueries({ queryKey: qk.templates.emailAllRoot() });
  queryClient.invalidateQueries({ queryKey: qk.settings.formsRoot() });
  queryClient.invalidateQueries({ queryKey: qk.settings.formUsageRoot() });
}
