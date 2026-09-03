import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { LockIcon } from '@phosphor-icons/react';

export function VaultAccessBanner() {
  return (
    <Alert variant="default">
      <LockIcon />
      <AlertTitle>Vault Access Required</AlertTitle>
      <AlertDescription>Ask an Organization Admin to grant you Vault Access to view encrypted data.</AlertDescription>
    </Alert>
  );
}
