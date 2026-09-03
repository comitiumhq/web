import { Badge } from '@comitium/ui/badge';
import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { memo, type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useQueryInterviewPlan } from '@/hooks/queries/use-query-interview-plan';
import { useQueryInterviewPlans } from '@/hooks/queries/use-query-interview-plans';
import { InterviewPlanIcon } from '@/lib/constants/domain-icons';
import type { InterviewPlanStage } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

interface InterviewPlanTabProps {
  orgId: string;
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string | null) => void;
}

export const InterviewPlanTab = memo(function InterviewPlanTab({
  orgId,
  selectedTemplateId,
  onSelectTemplate,
}: InterviewPlanTabProps) {
  const { data, isLoading, isError } = useQueryInterviewPlans(orgId);
  const templates = data?.data ?? [];

  const effectiveSelectedId = useMemo(() => {
    if (selectedTemplateId !== null) {
      return selectedTemplateId;
    }

    const defaultTemplate = templates.find((t) => t.isDefault);

    return defaultTemplate?.id ?? null;
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (selectedTemplateId !== null || effectiveSelectedId === null) {
      return;
    }

    onSelectTemplate(effectiveSelectedId);
  }, [effectiveSelectedId, onSelectTemplate, selectedTemplateId]);
  const selectedPlanId = effectiveSelectedId ?? undefined;
  const { data: selectedPlanDetail, isLoading: isSelectedPlanLoading } = useQueryInterviewPlan(orgId, selectedPlanId);

  const selectedStages = useMemo(() => {
    const stages = selectedPlanDetail?.data.stages ?? [];

    return [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  }, [selectedPlanDetail?.data.stages]);

  let content: ReactNode;

  if (isLoading) {
    content = <TemplateListSkeleton />;
  } else if (isError) {
    content = (
      <EmptyState
        icon={WarningCircleIcon}
        title="Couldn't load interview plans"
        description="Try refreshing the page."
      />
    );
  } else if (templates.length === 0) {
    content = (
      <EmptyState
        icon={InterviewPlanIcon}
        title="No interview plans yet"
        description="Create one in Organization → Interview Plans."
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-2">
        {templates.map((t) => (
          <TemplateOption
            key={t.id}
            id={t.id}
            name={t.name}
            stageCount={t.stageCount}
            isDefault={t.isDefault}
            isSelected={effectiveSelectedId === t.id}
            isPreviewLoading={effectiveSelectedId === t.id && isSelectedPlanLoading}
            stages={effectiveSelectedId === t.id ? selectedStages : []}
            onSelect={onSelectTemplate}
          />
        ))}
      </div>
    );
  }

  return <div className="flex flex-col gap-6">{content}</div>;
});

interface TemplateOptionProps {
  id: string;
  name: string;
  stageCount: number;
  isDefault: boolean;
  isSelected: boolean;
  isPreviewLoading: boolean;
  stages: InterviewPlanStage[];
  onSelect: (templateId: string | null) => void;
}

const TemplateOption = memo(function TemplateOption({
  id,
  name,
  stageCount,
  isDefault,
  isSelected,
  isPreviewLoading,
  stages,
  onSelect,
}: TemplateOptionProps) {
  const handleClick = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      className={cn('w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors', {
        'border-border hover:bg-accent': !isSelected,
        'border-primary bg-primary/5': isSelected,
      })}
    >
      <span className="flex w-full items-start gap-4">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-label-14 font-medium">{name}</span>
            {isDefault ? <Badge variant="secondary">Default</Badge> : null}
          </span>
          <span className="mt-0.5 block text-label-12 text-muted-foreground">
            {stageCount} {stageCount === 1 ? 'stage' : 'stages'}
          </span>
        </span>

        <span
          className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', {
            'border-muted-foreground/30': !isSelected,
            'border-primary bg-primary text-primary-foreground': isSelected,
          })}
          aria-hidden="true"
        >
          {isSelected ? <CheckIcon className="size-3" /> : null}
        </span>
      </span>

      {isSelected ? <PlanStagePreview stages={stages} isLoading={isPreviewLoading} /> : null}
    </button>
  );
});

interface PlanStagePreviewProps {
  stages: InterviewPlanStage[];
  isLoading: boolean;
}

const PlanStagePreview = memo(function PlanStagePreview({ stages, isLoading }: PlanStagePreviewProps) {
  if (isLoading) {
    return (
      <span className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-32 rounded-full" />
        ))}
      </span>
    );
  }

  if (stages.length === 0) {
    return <span className="mt-3 block text-copy-13 text-muted-foreground">No stages configured yet.</span>;
  }

  return (
    <span className="mt-3 flex flex-wrap gap-2">
      {stages.map((stage, index) => (
        <StagePill key={stage.id} stage={stage} index={index} />
      ))}
    </span>
  );
});

interface StagePillProps {
  stage: InterviewPlanStage;
  index: number;
}

const StagePill = memo(function StagePill({ stage, index }: StagePillProps) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border bg-background/60 px-2.5 py-1 text-label-12 text-foreground">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-label-12 text-muted-foreground">
        {index + 1}
      </span>
      <span className="truncate">{stage.name}</span>
    </span>
  );
});

function TemplateListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
