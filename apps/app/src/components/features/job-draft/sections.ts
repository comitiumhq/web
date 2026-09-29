import type { Icon } from '@phosphor-icons/react';
import {
  EvaluationCriteriaIcon,
  InterviewPlanIcon,
  JobPostingIcon,
  JobSettingsIcon,
} from '@/lib/constants/domain-icons';

interface DraftSectionDefinition {
  id: string;
  label: string;
  icon: Icon;
  route: string;
}

export const DRAFT_SECTIONS = [
  {
    id: 'settings',
    label: 'Settings',
    icon: JobSettingsIcon,
    route: '/org/$orgId/jobs/$jobId/settings',
  },
  {
    id: 'interview-plan',
    label: 'Interview plan',
    icon: InterviewPlanIcon,
    route: '/org/$orgId/jobs/$jobId/interview-plan',
  },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    icon: EvaluationCriteriaIcon,
    route: '/org/$orgId/jobs/$jobId/criteria',
  },
  {
    id: 'posting',
    label: 'Posting',
    icon: JobPostingIcon,
    route: '/org/$orgId/jobs/$jobId/posting',
  },
] as const satisfies readonly DraftSectionDefinition[];

export type DraftTab = (typeof DRAFT_SECTIONS)[number]['id'];

export function getDraftSection(tab: DraftTab) {
  const section = DRAFT_SECTIONS.find((item) => item.id === tab);

  if (!section) {
    throw new Error(`Unknown draft section: ${tab}`);
  }

  return section;
}
