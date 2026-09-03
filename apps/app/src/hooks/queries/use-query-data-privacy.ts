import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { useQuery } from '@tanstack/react-query';

import { qk } from '@/hooks/query-keys';
import { getDataPrivacySettings } from '@/lib/api/data-privacy';

export function useQueryDataPrivacy(orgId: string) {
  return useQuery({
    queryKey: qk.settings.dataPrivacy(orgId),
    queryFn: () => getDataPrivacySettings(orgId),
    staleTime: STALE_TIME_DEFAULT,
  });
}
