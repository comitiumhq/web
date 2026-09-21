import type { TipTapDoc } from '@comitium/schemas/common';
import type { ReactNode } from 'react';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';
import { DraftDescriptionTab } from '@/components/features/job-draft/draft-description-tab';
import type { ApplicationFormOptionsOwner } from '@/lib/api/application-form-options';
import { ApplicationCapacityControl } from './application-capacity-control';

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
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-card bg-clip-padding">
      <PostingEditorSection
        title="Description"
        description="Write the role description candidates will read before applying."
      >
        <DraftDescriptionTab content={description} onChange={onDescriptionChange} minHeightClass="min-h-80" />
      </PostingEditorSection>

      <PostingEditorSection
        title="Application form"
        description="Choose the questions candidates complete when they apply."
        last={!onApplicationCapacityChange}
      >
        <ApplicationFormPicker orgId={orgId} owner={owner} formId={formId} onChange={onFormIdChange} />
      </PostingEditorSection>

      {onApplicationCapacityChange ? (
        <PostingEditorSection
          title="Application capacity"
          description="Choose whether this Posting stops accepting applications at a fixed limit."
          last
        >
          <ApplicationCapacityControl value={applicationCapacity ?? null} onChange={onApplicationCapacityChange} />
        </PostingEditorSection>
      ) : null}
    </div>
  );
}

interface PostingEditorSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  last?: boolean;
}

function PostingEditorSection({ title, description, children, last = false }: PostingEditorSectionProps) {
  return (
    <section className={last ? 'p-6' : 'border-b border-separator p-6'}>
      <div className="mb-5 space-y-1">
        <h2 className="text-heading-16">{title}</h2>
        <p className="text-copy-13 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
