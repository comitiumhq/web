import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ApplicationCapacityControl,
  isValidApplicationCapacity,
} from '@/components/features/job-posting/application-capacity-control';
import { usePublishJobPosting } from '@/hooks/mutations/use-job-posting-mutations';
import { useQueryJobPosting } from '@/hooks/queries/use-query-job-posting';

interface PublishJobDialogV2Props {
  orgId: string;
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishJobDialogV2({ orgId, jobId, jobTitle, open, onOpenChange }: PublishJobDialogV2Props) {
  const navigate = useNavigate();
  const postingQuery = useQueryJobPosting(orgId, jobId, open);
  const publishPosting = usePublishJobPosting({ orgId, jobId });
  const [applicationCapacity, setApplicationCapacity] = useState<number | null>(null);

  useEffect(() => {
    if (open && postingQuery.data) {
      setApplicationCapacity(postingQuery.data.applicationCapacity);
    }
  }, [open, postingQuery.data]);

  const posting = postingQuery.data;
  const isPending = publishPosting.isPending;
  const hasActiveApplicationForm = Boolean(posting?.form && !posting.form.isArchived);
  const hasPublicDescription = Boolean(posting?.descriptionMarkdown?.trim());
  const capacityIsValid = isValidApplicationCapacity(applicationCapacity);

  const canPublish =
    posting !== undefined &&
    hasActiveApplicationForm &&
    hasPublicDescription &&
    capacityIsValid &&
    !postingQuery.isFetching &&
    !isPending;

  const handlePublish = async () => {
    if (!posting || !canPublish) {
      return;
    }

    try {
      await publishPosting.mutateAsync({
        expectedVersion: posting.version,
        applicationCapacity,
      });
      onOpenChange(false);
      await navigate({ to: '/org/$orgId/jobs/$jobId/posting', params: { orgId, jobId } });
    } catch {
      return;
    }
  };

  let dialogBody: ReactNode;

  if (postingQuery.isError) {
    dialogBody = (
      <Alert variant="destructive">
        <AlertDescription>Could not load Posting settings. Close this dialog and try again.</AlertDescription>
      </Alert>
    );
  } else if (postingQuery.isLoading) {
    dialogBody = (
      <div className="flex min-h-24 items-center justify-center">
        <Spinner aria-label="Loading Posting settings" />
      </div>
    );
  } else {
    dialogBody = (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-label-14">Application Form</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-separator px-3 py-2.5">
            <p className="min-w-0 truncate text-copy-14">{posting?.form?.title ?? 'No form selected'}</p>
            {posting?.form?.isArchived && <Badge variant="secondary">Archived</Badge>}
          </div>
          {!hasActiveApplicationForm && (
            <Alert variant="destructive">
              <AlertDescription>
                Choose an active Application Form in the Job editor before publishing.
              </AlertDescription>
            </Alert>
          )}

          {!hasPublicDescription && (
            <Alert variant="destructive">
              <AlertDescription>Add a public Description in the Job editor before publishing.</AlertDescription>
            </Alert>
          )}
        </div>

        <ApplicationCapacityControl
          value={applicationCapacity}
          onChange={setApplicationCapacity}
          disabled={isPending}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish &ldquo;{jobTitle}&rdquo;?</DialogTitle>
          <DialogDescription>This Posting will appear on your public careers page and Comitium Jobs.</DialogDescription>
        </DialogHeader>

        {dialogBody}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePublish} disabled={!canPublish}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
