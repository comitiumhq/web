import type { CriteriaAssessment, CriterionSummary } from '@comitium/schemas/applications';
import type { WrappedKey } from '@comitium/schemas/common';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comitium/ui/accordion';
import { Badge } from '@comitium/ui/badge';
import { Card } from '@comitium/ui/card';
import { useMemo } from 'react';

import { CriterionEvidenceContent } from './criterion-evidence-content';
import { useCriterionEvidence } from './use-criterion-evidence';

const VERDICT_CONFIG = {
  met: { label: 'Meets', variant: 'success' as const },
  not_met: { label: 'Does not meet', variant: 'destructive' as const },
  undecided: { label: 'Undecided', variant: 'secondary' as const },
} as const;

const VERDICT_PRIORITY = {
  met: 0,
  undecided: 1,
  not_met: 2,
} as const;

interface CriteriaEvaluationProps {
  assessment: CriteriaAssessment[];
  summary: CriterionSummary;
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
}

export function CriteriaEvaluation({ assessment, summary, orgId, wrappedVaultKey }: CriteriaEvaluationProps) {
  const sortedAssessment = useMemo(
    () =>
      [...assessment].sort((first, second) => VERDICT_PRIORITY[first.assessment] - VERDICT_PRIORITY[second.assessment]),
    [assessment],
  );

  return (
    <Card size="sm" className="gap-0 py-0">
      <header className="border-b border-border px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label-13 font-medium">AI evaluation</p>
          <span className="shrink-0 text-label-12 tabular-nums text-muted-foreground">
            {summary.metCount} of {summary.totalCount} met
          </span>
        </div>
        <p className="mt-0.5 text-label-12 text-muted-foreground">Based on resume evidence</p>
      </header>

      <Accordion type="multiple" className="rounded-none border-0">
        {sortedAssessment.map((item) => (
          <CriteriaEvaluationItem key={item.criterionId} item={item} orgId={orgId} wrappedVaultKey={wrappedVaultKey} />
        ))}
      </Accordion>
    </Card>
  );
}

interface CriteriaEvaluationItemProps {
  item: CriteriaAssessment;
  orgId: string;
  wrappedVaultKey: WrappedKey | undefined;
}

function CriteriaEvaluationItem({ item, orgId, wrappedVaultKey }: CriteriaEvaluationItemProps) {
  const verdict = VERDICT_CONFIG[item.assessment];
  const evidenceState = useCriterionEvidence({
    applicationId: item.applicationId,
    criterionId: item.criterionId,
    encryptedEvidence: item.evidence,
    orgId,
    wrappedVaultKey,
    enabled: Boolean(item.evidence),
  });

  if (!item.evidence) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
        <span className="min-w-0 flex-1 break-words text-sm">{item.titleSnapshot}</span>
        <Badge variant={verdict.variant} className="shrink-0">
          {verdict.label}
        </Badge>
      </div>
    );
  }

  return (
    <AccordionItem value={item.criterionId} className="data-open:bg-transparent last:border-b-0">
      <AccordionTrigger className="min-h-11 items-center gap-3 px-4 py-2 font-normal hover:no-underline">
        <span className="min-w-0 flex-1 break-words text-sm">{item.titleSnapshot}</span>
        <Badge variant={verdict.variant} className="shrink-0">
          {verdict.label}
        </Badge>
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-0">
        <CriterionEvidenceContent evidenceState={evidenceState} orgId={orgId} />
      </AccordionContent>
    </AccordionItem>
  );
}
