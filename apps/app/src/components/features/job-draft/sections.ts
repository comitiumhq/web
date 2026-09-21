import type { Icon } from '@phosphor-icons/react';
import { GearSixIcon, GlobeSimpleIcon } from '@phosphor-icons/react';
import { EvaluationCriteriaIcon, InterviewPlanIcon } from '@/lib/constants/domain-icons';

interface DraftSectionDefinition {
  id: string;
  label: string;
  description: string;
  icon: Icon;
  route: string;
}

export const DRAFT_SECTIONS = [
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure the role and the people responsible for hiring.',
    icon: GearSixIcon,
    route: '/org/$orgId/jobs/$jobId/settings',
  },
  {
    id: 'interview-plan',
    label: 'Interview plan',
    description: 'Define the interview stages and activities for this Job.',
    icon: InterviewPlanIcon,
    route: '/org/$orgId/jobs/$jobId/interview-plan',
  },
  {
    id: 'posting',
    label: 'Posting',
    description: 'Set up the public page, application form, and application limit.',
    icon: GlobeSimpleIcon,
    route: '/org/$orgId/jobs/$jobId/posting',
  },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    description: 'Define the criteria used to evaluate candidates consistently.',
    icon: EvaluationCriteriaIcon,
    route: '/org/$orgId/jobs/$jobId/criteria',
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
