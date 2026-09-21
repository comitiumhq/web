import type { Icon } from '@phosphor-icons/react';
import { GearSixIcon, GlobeSimpleIcon } from '@phosphor-icons/react';
import { EvaluationCriteriaIcon, InterviewPlanIcon } from '@/lib/constants/domain-icons';

interface TemplateSectionDefinition {
  id: string;
  label: string;
  title: string;
  icon: Icon;
}

export const TEMPLATE_SECTION_ITEMS = [
  { id: 'settings', label: 'Settings', title: 'Settings', icon: GearSixIcon },
  { id: 'interview-plan', label: 'Interview plan', title: 'Interview plan', icon: InterviewPlanIcon },
  { id: 'posting', label: 'Posting', title: 'Posting', icon: GlobeSimpleIcon },
  {
    id: 'criteria',
    label: 'Evaluation criteria',
    title: 'Evaluation criteria',
    icon: EvaluationCriteriaIcon,
  },
] as const satisfies readonly TemplateSectionDefinition[];

export type TemplateSection = (typeof TEMPLATE_SECTION_ITEMS)[number]['id'];

export function getTemplateSection(sectionId: TemplateSection) {
  const section = TEMPLATE_SECTION_ITEMS.find((item) => item.id === sectionId);

  if (!section) {
    throw new Error(`Unknown template section: ${sectionId}`);
  }

  return section;
}
