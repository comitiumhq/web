import { useCallback, useEffect } from 'react';
import { useCreateOrg } from '@/hooks/mutations/use-create-org';
import { OrganizationCreationError, OrganizationCreationPending } from './creation-states';

export function OrganizationCreation() {
  const { mutate: createOrg, error, isPending } = useCreateOrg();

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) {
        createOrg();
      }
    });

    return () => {
      active = false;
    };
  }, [createOrg]);

  const retry = useCallback(() => createOrg(), [createOrg]);

  if (isPending || !error) {
    return <OrganizationCreationPending />;
  }

  return <OrganizationCreationError onRetry={retry} />;
}
