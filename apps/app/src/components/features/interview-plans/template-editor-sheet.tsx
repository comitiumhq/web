import { Button } from '@comitium/ui/button';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCreateInterviewPlan, useUpdateInterviewPlan } from '@/hooks/mutations/use-interview-plan';
import { useQueryInterviewPlan } from '@/hooks/queries/use-query-interview-plan';
import type { InterviewPlanDetail } from '@/lib/schemas/pipeline';

import { StageList } from './editor/stage-list';
import { useEditorState } from './editor/use-editor-state';

type SheetMode = 'create' | 'edit';

interface TemplateEditorSheetProps {
  orgId: string;
  open: boolean;
  mode: SheetMode;
  templateId: string | null;
  onClose: () => void;
}

interface EditorFormProps {
  orgId: string;
  mode: SheetMode;
  template: InterviewPlanDetail | undefined;
  onClose: () => void;
}

function getSaveLabel(isPending: boolean, isCreate: boolean) {
  if (isPending && isCreate) {
    return 'Creating...';
  }

  if (isPending) {
    return 'Saving...';
  }

  if (isCreate) {
    return 'Create plan';
  }

  return 'Save changes';
}

function EditorForm({ orgId, mode, template, onClose }: EditorFormProps) {
  const isCreate = mode === 'create';

  const { state, body, isValid, validationErrors, setName, addStage, removeStage, updateStageName, reorderStages } =
    useEditorState(template);

  const { mutate: createMutate, isPending: isCreating } = useCreateInterviewPlan();
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateInterviewPlan();
  const isPending = isCreating || isUpdating;

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [setName],
  );

  const handleSave = useCallback(() => {
    if (!isValid) {
      toast.error(validationErrors[0]);

      return;
    }

    if (!isCreate && template) {
      updateMutate({ orgId, planId: template.id, body }, { onSuccess: onClose });
    } else {
      createMutate({ orgId, body }, { onSuccess: onClose });
    }
  }, [isValid, validationErrors, isCreate, template, orgId, body, createMutate, updateMutate, onClose]);

  const saveLabel = getSaveLabel(isPending, isCreate);

  return (
    <>
      <FeatureSheetBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-name" className="text-label-14">
            Name
          </Label>
          <Input
            id="plan-name"
            value={state.name}
            onChange={handleNameChange}
            placeholder="e.g. Engineering Interview Plan"
            disabled={isPending}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-label-14">Stages</Label>
            <span className="text-label-12 text-muted-foreground">{state.stages.length} stages</span>
          </div>
          <StageList
            stages={state.stages}
            onReorder={reorderStages}
            onAddStage={addStage}
            onRemoveStage={removeStage}
            onUpdateName={updateStageName}
          />
        </div>
      </FeatureSheetBody>

      <FeatureSheetFooter>
        <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Spinner data-icon="inline-start" />}
          {saveLabel}
        </Button>
      </FeatureSheetFooter>
    </>
  );
}

export function TemplateEditorSheet({ orgId, open, mode, templateId, onClose }: TemplateEditorSheetProps) {
  const { data, isLoading } = useQueryInterviewPlan(orgId, templateId ?? undefined);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) {
        onClose();
      }
    },
    [onClose],
  );

  const isCreate = mode === 'create';
  const title = isCreate ? 'New interview plan' : 'Edit interview plan';
  const description = isCreate
    ? 'Define the hiring stages for your interview plan.'
    : 'Update the name and stages for this plan.';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </FeatureSheetHeader>

        {mode === 'edit' && isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <EditorForm key={templateId ?? 'create'} orgId={orgId} mode={mode} template={data?.data} onClose={onClose} />
        )}
      </FeatureSheetContent>
    </Sheet>
  );
}
