import { Label } from '@comitium/ui/label';
import { CandidateTagMultiSelect } from '@/components/features/candidate-tags/candidate-tag-multi-select';
import { BulkOperationSheet } from '../operation/bulk-operation-sheet';
import type { PipelineBulkActionSheetProps } from '../types';
import { useBulkAssignCandidateTag } from './use-bulk-assign-candidate-tag';

export function BulkAssignCandidateTagSheet(props: PipelineBulkActionSheetProps) {
  const action = useBulkAssignCandidateTag(props);

  return (
    <BulkOperationSheet
      open={props.open}
      onOpenChange={action.handleOpenChange}
      title="Assign tags"
      operation={action.bulk.operation}
      targets={action.targets}
      loading={action.bulk.isLoading}
      error={action.bulk.error}
      onRetry={action.bulk.retryDraft}
      submitLabel={`Assign to ${action.readyCount}`}
      pendingLabel="Starting…"
      submitDisabled={action.tagIds.length === 0 || action.tagsLoading || action.tagsError}
      submitting={action.bulk.isSubmitting}
      onSubmit={action.submit}
    >
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <CandidateTagMultiSelect
          options={action.tagOptions}
          value={action.tagIds}
          placeholder={action.tagPlaceholder}
          disabled={action.tagsLoading || action.tagsError || action.tagOptions.length === 0}
          onValueChange={action.setTagIds}
        />
      </div>
    </BulkOperationSheet>
  );
}
