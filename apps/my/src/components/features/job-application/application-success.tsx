import { Button } from '@comitium/ui/button';
import { CheckIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

interface ApplicationSuccessProps {
  jobTitle: string;
  company: string;
}

export function ApplicationSuccess({ jobTitle, company }: ApplicationSuccessProps) {
  return (
    <div className="py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
          <CheckIcon className="size-6 text-success" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-heading-24">Application Submitted</h2>
          <p className="text-copy-14 text-muted-foreground">
            <strong>{jobTitle}</strong> at <strong>{company}</strong>
          </p>
        </div>
        <div>
          <Button variant="outline" asChild>
            <Link to="/applications">View my applications</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
