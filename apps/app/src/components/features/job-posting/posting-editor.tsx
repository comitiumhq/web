import type { TipTapDoc } from '@comitium/schemas/common';
import { Card, CardContent } from '@comitium/ui/card';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';
import { DraftDescriptionTab } from '@/components/features/job-draft/draft-description-tab';
import type { ApplicationFormOptionsOwner } from '@/lib/api/application-form-options';
import { ApplicationCapacityControl } from './application-capacity-control';
import { PostingTabs } from './posting-tabs';

interface PostingEditorProps {
  orgId: string;
  owner: ApplicationFormOptionsOwner;
  description: TipTapDoc | null;
  onDescriptionChange: (content: TipTapDoc) => void;
  formId: string | null;
  onFormIdChange: (formId: string | null) => void;
  applicationCapacity?: number | null;
  onApplicationCapacityChange?: (capacity: number | null) => void;
}

export function PostingEditor({
  orgId,
  owner,
  description,
  onDescriptionChange,
  formId,
  onFormIdChange,
  applicationCapacity,
  onApplicationCapacityChange,
}: PostingEditorProps) {
  const capacityPanel = onApplicationCapacityChange ? (
    <Card>
      <CardContent>
        <ApplicationCapacityControl value={applicationCapacity ?? null} onChange={onApplicationCapacityChange} />
      </CardContent>
    </Card>
  ) : undefined;

  return (
    <PostingTabs
      description={
        <DraftDescriptionTab content={description} onChange={onDescriptionChange} minHeightClass="min-h-56" />
      }
      applicationForm={
        <Card>
          <CardContent>
            <ApplicationFormPicker orgId={orgId} owner={owner} formId={formId} onChange={onFormIdChange} />
          </CardContent>
        </Card>
      }
      capacity={capacityPanel}
    />
  );
}
