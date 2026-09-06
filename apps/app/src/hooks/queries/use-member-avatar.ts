import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { qk } from '@/hooks/query-keys';
import { api } from '@/lib/api/client';

export function useMemberAvatar(avatarUrl?: string | null): string | null {
  const { data } = useQuery({
    queryKey: qk.org.memberAvatar(avatarUrl),
    queryFn: avatarUrl ? () => api.getFile(avatarUrl) : skipToken,
    placeholderData: keepPreviousData,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const hasAvatar = Boolean(avatarUrl);

  useEffect(() => {
    if (!hasAvatar) {
      setObjectUrl(null);
      return;
    }

    if (!data) {
      return;
    }

    const nextObjectUrl = URL.createObjectURL(data);
    setObjectUrl(nextObjectUrl);

    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [data, hasAvatar]);

  return hasAvatar ? objectUrl : null;
}
