import { Button } from '@comitium/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon, MailIcon } from 'lucide-react';
import { useState } from 'react';

import type { LinkedSignInMethods } from '../linked-sign-in-methods';
import { EmailMethodDialog } from './email-method-dialog';
import { SignInMethodRow } from './sign-in-method-row';
import type { RefreshMethods } from './types';

interface EmailSignInMethodProps {
  email: LinkedSignInMethods['email'];
  refreshMethods: RefreshMethods;
}

export function EmailSignInMethod({ email, refreshMethods }: EmailSignInMethodProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleOpenDialog() {
    setDialogOpen(true);
  }

  function handleComplete() {
    setDialogOpen(false);
  }

  return (
    <>
      <SignInMethodRow
        icon={<MailIcon />}
        label={<EmailLabel />}
        value={email?.address ?? 'Not added'}
        action={
          <Button variant="outline" size="sm" onClick={handleOpenDialog}>
            {email ? 'Change' : 'Add email'}
          </Button>
        }
      />

      {dialogOpen ? (
        <EmailMethodDialog
          hasEmail={email !== null}
          onComplete={handleComplete}
          onOpenChange={setDialogOpen}
          refreshMethods={refreshMethods}
        />
      ) : null}
    </>
  );
}

function EmailLabel() {
  return (
    <span className="inline-flex items-center gap-1">
      Email
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Email access guidance">
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4} className="max-w-64">
            For long-term access, use an email you personally control.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
