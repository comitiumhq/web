import type { CandidateSheetCapabilities } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { ArchiveIcon, ArrowUpRightIcon, CaretDownIcon, DotsThreeIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';
import type { InterviewStage } from '@/lib/schemas/pipeline';

interface CandidateSheetHeaderActionsProps {
  capabilities: CandidateSheetCapabilities;
  currentStageId: string | null;
  stages: InterviewStage[] | null;
  isChangingStage: boolean;
  isTerminalActionPending: boolean;
  duplicateOfApplicationId: string | null;
  onStageChange: (stageId: string) => void;
  onEmail: () => void;
  onArchive: () => void;
  onReopenToStage: (stageId: string) => void;
  onOpenPrimaryApplication: () => void;
}

export function CandidateSheetHeaderActions({
  capabilities,
  currentStageId,
  stages,
  isChangingStage,
  isTerminalActionPending,
  duplicateOfApplicationId,
  onStageChange,
  onEmail,
  onArchive,
  onReopenToStage,
  onOpenPrimaryApplication,
}: CandidateSheetHeaderActionsProps) {
  const nextStages = useMemo(
    () => stages?.filter((stage) => stage.id !== currentStageId) ?? [],
    [currentStageId, stages],
  );
  const reopenStages = useMemo(() => stages?.filter((stage) => stage.stageType !== 'hired') ?? [], [stages]);
  const consideration = capabilities.consideration;
  const hasPrimaryApplication = duplicateOfApplicationId !== null;
  const terminalActionPending = isTerminalActionPending || isChangingStage;
  const showChangeStage = consideration.canMoveStage && currentStageId !== null && nextStages.length > 0;

  return (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 min-[900px]:w-auto min-[900px]:justify-end">
      {showChangeStage && (
        <ChangeStageMenu
          stages={nextStages}
          canSelectHired={consideration.canMarkHired}
          disabled={terminalActionPending}
          onStageChange={onStageChange}
        />
      )}

      {consideration.canReopen && reopenStages.length > 0 && (
        <ChangeStageMenu
          stages={reopenStages}
          canSelectHired={false}
          disabled={isTerminalActionPending}
          onStageChange={onReopenToStage}
        />
      )}

      {consideration.canSendEmail && (
        <Button variant="outline" size="sm" onClick={onEmail} disabled={isTerminalActionPending}>
          <EnvelopeSimpleIcon data-icon="inline-start" />
          Email
        </Button>
      )}

      {consideration.canArchive && (
        <Button variant="outline" size="sm" onClick={onArchive} disabled={terminalActionPending}>
          <ArchiveIcon data-icon="inline-start" />
          Archive
        </Button>
      )}

      {hasPrimaryApplication && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="More actions">
              <DotsThreeIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={onOpenPrimaryApplication}>
              <ArrowUpRightIcon />
              View primary application
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface ChangeStageMenuProps {
  stages: InterviewStage[];
  canSelectHired: boolean;
  disabled: boolean;
  onStageChange: (stageId: string) => void;
}

function ChangeStageMenu({ stages, canSelectHired, disabled, onStageChange }: ChangeStageMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          Change stage
          <CaretDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {stages.length > 0 && (
          <DropdownMenuGroup>
            {stages.map((stage) => (
              <StageDecisionItem
                key={stage.id}
                stage={stage}
                disabled={stage.stageType === 'hired' && !canSelectHired}
                onStageChange={onStageChange}
              />
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface StageDecisionItemProps {
  stage: InterviewStage;
  disabled: boolean;
  onStageChange: (stageId: string) => void;
}

const StageDecisionItem = memo(function StageDecisionItem({ stage, disabled, onStageChange }: StageDecisionItemProps) {
  const handleSelect = useCallback(
    (event: Event) => {
      if (disabled) {
        event.preventDefault();

        return;
      }

      onStageChange(stage.id);
    },
    [disabled, onStageChange, stage.id],
  );

  return (
    <DropdownMenuItem className="items-start" aria-disabled={disabled} onSelect={handleSelect}>
      <span className="flex min-w-0 flex-col">
        <span>{stage.name}</span>
        {disabled && <span className="text-xs text-muted-foreground">Respond to the candidate first</span>}
      </span>
    </DropdownMenuItem>
  );
});
