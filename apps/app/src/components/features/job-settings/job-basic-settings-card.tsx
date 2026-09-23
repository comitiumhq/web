import { Card, CardContent } from '@comitium/ui/card';
import type { UseFormReturn } from 'react-hook-form';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { JobBasicInformationFields } from './job-basic-information-fields';
import { JobCompensationFields } from './job-compensation-fields';

interface JobBasicSettingsCardProps {
  orgId: string;
  form: UseFormReturn<JobSettingsFormData>;
  showPublishRequiredMarkers?: boolean;
  editableStructure?: boolean;
  readOnly?: boolean;
}

export function JobBasicSettingsCard({
  orgId,
  form,
  showPublishRequiredMarkers = true,
  editableStructure = true,
  readOnly = false,
}: JobBasicSettingsCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <JobBasicInformationFields
          orgId={orgId}
          form={form}
          showPublishRequiredMarkers={showPublishRequiredMarkers}
          editableStructure={editableStructure}
          readOnly={readOnly}
        />
        <JobCompensationFields
          form={form}
          showPublishRequiredMarker={showPublishRequiredMarkers}
          readOnly={readOnly}
        />
      </CardContent>
    </Card>
  );
}
