import type { Icon } from '@phosphor-icons/react';
import { BriefcaseIcon, FileTextIcon } from '@phosphor-icons/react';
import {
  ApplicationFormIcon,
  EvaluationCriteriaIcon,
  HiringTeamIcon,
  InterviewPlanIcon,
} from '@/lib/constants/domain-icons';

interface DraftSectionDefinition {
  id: string;
  label: string;
  icon: Icon;
  route: string;
}

export const DRAFT_SECTIONS = [
  {
    id: 'details',
    label: 'Details',
    icon: BriefcaseIcon,
    route: '/org/$orgId/jobs/$jobId/details',
  },
  {
    id: 'description',
    label: 'Description',
    icon: FileTextIcon,
    route: '/org/$orgId/jobs/$jobId/description',
  },
  {
    id: 'application-form',
    label: 'Application form',
    icon: ApplicationFormIcon,
    route: '/org/$orgId/jobs/$jobId/application-form',
  },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    icon: EvaluationCriteriaIcon,
    route: '/org/$orgId/jobs/$jobId/criteria',
  },
  {
    id: 'interview-plan',
    label: 'Interview plan',
    icon: InterviewPlanIcon,
    route: '/org/$orgId/jobs/$jobId/interview-plan',
  },
  {
    id: 'hiring-team',
    label: 'Hiring team',
    icon: HiringTeamIcon,
    route: '/org/$orgId/jobs/$jobId/hiring-team',
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
