import type { CandidateProfile } from '@comitium/schemas/candidates';
import type { BulkOperation, BulkOperationEmailPayload, BulkOperationType } from '@/lib/schemas/bulk-operations';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';

export interface BulkOperationCommitInput {
  tagIds?: string[];
  archiveReasonId?: string;
  excludedItemIds?: string[];
}

export interface UseBulkOperationParams {
  orgId: string;
  operationType: BulkOperationType;
  targetIds: readonly string[];
  open: boolean;
  onSettled?: (operation: BulkOperation) => void;
}

export type BulkOperationCommit = (
  input: BulkOperationCommitInput,
  payloads?: readonly BulkOperationEmailPayload[],
) => Promise<BulkOperation | null>;

export interface PipelineBulkActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineApplications: readonly PipelineCandidate[];
  namesMap: ReadonlyMap<string, CandidateProfile>;
  orgId: string;
  applicationIds: readonly string[];
  onCompleted: (applicationIds: readonly string[]) => void;
}
