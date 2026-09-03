import { BROWSER_TZ } from '@comitium/ui/date';
import { useEffect, useRef } from 'react';
import { useUpdateMemberProfile } from '@/hooks/mutations/use-update-member-profile';
import { useQueryOrgMe } from '@/hooks/use-permissions';

export function useAutoDetectTimezone(orgId: string) {
  const { data: meData } = useQueryOrgMe(orgId);
  const { mutate } = useUpdateMemberProfile(orgId, { silent: true });
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current || !meData || meData.timezone !== null || !BROWSER_TZ) {
      return;
    }

    hasFiredRef.current = true;
    mutate({ timezone: BROWSER_TZ });
  }, [meData, mutate]);
}
