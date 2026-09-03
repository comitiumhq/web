import type { Icon } from '@phosphor-icons/react';
import { BriefcaseIcon, FileTextIcon } from '@phosphor-icons/react';
import {
  ApplicationFormIcon,
  EvaluationCriteriaIcon,
  HiringTeamIcon,
  InterviewPlanIcon,
} from '@/lib/constants/domain-icons';

interface TemplateSectionDefinition {
  id: string;
  label: string;
  title: string;
  icon: Icon;
}

export const TEMPLATE_SECTION_ITEMS = [
  { id: 'details', label: 'Details', title: 'Template details', icon: BriefcaseIcon },
  { id: 'description', label: 'Description', title: 'Description', icon: FileTextIcon },
  {
    id: 'application-form',
    label: 'Application form',
    title: 'Application form',
    icon: ApplicationFormIcon,
  },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    title: 'Evaluation criteria',
    icon: EvaluationCriteriaIcon,
  },
  { id: 'interview-plan', label: 'Interview plan', title: 'Interview plan', icon: InterviewPlanIcon },
  { id: 'hiring-team', label: 'Hiring team', title: 'Hiring team', icon: HiringTeamIcon },
] as const satisfies readonly TemplateSectionDefinition[];

export type TemplateSection = (typeof TEMPLATE_SECTION_ITEMS)[number]['id'];

export function getTemplateSection(sectionId: TemplateSection) {
  const section = TEMPLATE_SECTION_ITEMS.find((item) => item.id === sectionId);

  if (!section) {
    throw new Error(`Unknown template section: ${sectionId}`);
  }

  return section;
}
