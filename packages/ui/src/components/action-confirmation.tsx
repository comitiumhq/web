import { InfoIcon } from '@phosphor-icons/react';

import { Alert, AlertDescription, AlertTitle } from './alert';

export const BACKGROUND_CONFIRMATION_COPY = {
  title: 'Still confirming',
  description: 'You can close this dialog or leave the page. Check the result again shortly.',
  toast: 'This action is still confirming. Check the result again shortly.',
  actionLabel: 'Confirmation pending',
} as const;

interface ActionConfirmationPresentationParams {
  idleLabel: string;
  pendingLabel: string;
  isPending: boolean;
  isConfirming: boolean;
}

export function getActionConfirmationPresentation({
  idleLabel,
  pendingLabel,
  isPending,
  isConfirming,
}: ActionConfirmationPresentationParams): { label: string; showSpinner: boolean } {
  if (isConfirming) {
    return { label: BACKGROUND_CONFIRMATION_COPY.actionLabel, showSpinner: false };
  }

  if (isPending) {
    return { label: pendingLabel, showSpinner: true };
  }

  return { label: idleLabel, showSpinner: false };
}

export function ActionConfirmationNotice() {
  return (
    <Alert variant="info">
      <InfoIcon />
      <AlertTitle>{BACKGROUND_CONFIRMATION_COPY.title}</AlertTitle>
      <AlertDescription>{BACKGROUND_CONFIRMATION_COPY.description}</AlertDescription>
    </Alert>
  );
}
