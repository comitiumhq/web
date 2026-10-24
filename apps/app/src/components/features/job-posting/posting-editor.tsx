import type { TipTapDoc } from '@comitium/schemas/common';
import type { SkillRequirement } from '@comitium/schemas/skills';
import { Card, CardContent } from '@comitium/ui/card';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';
import type { ApplicationFormOptionsOwner } from '@/lib/api/application-form-options';
import { ApplicationCapacityControl } from './application-capacity-control';
import { PostingDescriptionEditor } from './posting-description-editor';
import { PostingTabs } from './posting-tabs';
import { SkillsEditor } from './skills-editor';

interface PostingEditorProps {
  orgId: string;
  readOnly?: boolean;
  owner: ApplicationFormOptionsOwner;
  description: TipTapDoc | null;
  onDescriptionChange: (content: TipTapDoc) => void;
  skills: SkillRequirement[];
  onSkillsChange: (skills: SkillRequirement[]) => void;
  formId: string | null;
  onFormIdChange: (formId: string | null) => void;
  applicationCapacity?: number | null;
  onApplicationCapacityChange?: (capacity: number | null) => void;
}

export function PostingEditor({
  orgId,
  readOnly = false,
  owner,
  description,
  onDescriptionChange,
  skills,
  onSkillsChange,
  formId,
  onFormIdChange,
  applicationCapacity,
  onApplicationCapacityChange,
}: PostingEditorProps) {
  const capacityPanel = onApplicationCapacityChange ? (
    <Card>
      <CardContent>
        <ApplicationCapacityControl
          disabled={readOnly}
          value={applicationCapacity ?? null}
          onChange={onApplicationCapacityChange}
        />
      </CardContent>
    </Card>
  ) : undefined;

  return (
    <PostingTabs
      description={
        <PostingDescriptionEditor
          content={description}
          readOnly={readOnly}
          onChange={readOnly ? undefined : onDescriptionChange}
        />
      }
      skills={<SkillsEditor value={skills} disabled={readOnly} onChange={onSkillsChange} />}
      applicationForm={
        <Card>
          <CardContent>
            <ApplicationFormPicker
              orgId={orgId}
              owner={owner}
              formId={formId}
              disabled={readOnly}
              onChange={onFormIdChange}
            />
          </CardContent>
        </Card>
      }
      capacity={capacityPanel}
    />
  );
}
