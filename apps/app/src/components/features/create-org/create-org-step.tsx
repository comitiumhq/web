import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { PageHeader } from '@comitium/ui/page-header';
import { Spinner } from '@comitium/ui/spinner';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { type FormEvent, useCallback } from 'react';
import { useCreateOrg } from '@/hooks/mutations/use-create-org';

interface CreateOrgStepProps {
  domain: string;
  email: string | null;
  isCreating: boolean;
  creationFailed?: boolean;
}

export function CreateOrgStep({ domain, email, isCreating, creationFailed = false }: CreateOrgStepProps) {
  const { mutate: createOrg, isPending, error } = useCreateOrg();
  const isWorking = isPending || isCreating;
  const hasCreationError = creationFailed || error !== null;
  let submitLabel = 'Create organization';

  if (isWorking) {
    submitLabel = 'Creating...';
  } else if (hasCreationError) {
    submitLabel = 'Try again';
  }

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      createOrg();
    },
    [createOrg],
  );

  if (isCreating) {
    return <CreatingOrganization domain={domain} />;
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Create your organization" className="justify-center text-center [&>div]:w-full" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <p className="text-label-14">Verified domain</p>
          <Card size="sm" className="h-12 justify-center rounded-xl py-0">
            <CardContent className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-copy-14 text-foreground">{domain}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-label-12 text-success-text">
                <CheckCircleIcon className="size-4" weight="fill" />
                Verified
              </span>
            </CardContent>
          </Card>
          {email ? <p className="text-copy-12 text-muted-foreground">Verified with {email}</p> : null}
        </div>

        {hasCreationError ? (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>Couldn’t create organization</AlertTitle>
            <AlertDescription>
              {error
                ? 'We couldn’t finish the setup. Try again.'
                : 'Your work email is still verified. You can try again.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={isWorking}>
          {isWorking && <Spinner data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}

function CreatingOrganization({ domain }: { domain: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center" aria-live="polite">
      <Spinner className="size-5 text-primary" />
      <div className="space-y-1.5">
        <h1 className="text-heading-20">Creating your organization</h1>
        <p className="text-copy-14 text-muted-foreground">Setting up {domain}.</p>
      </div>
    </div>
  );
}
