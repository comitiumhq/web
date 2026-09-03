import {
  type ApplicationFormState,
  ApplicationSubmissionView,
} from '@/components/features/application-submission/application-submission-view';

export type { ApplicationFormState };

interface FormsTabProps {
  orgId: string;
  form: ApplicationFormState;
}

export function FormsTab({ orgId, form }: FormsTabProps) {
  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto">
      <ApplicationSubmissionView orgId={orgId} form={form} className="px-4 pb-4 pt-20" />
    </div>
  );
}
