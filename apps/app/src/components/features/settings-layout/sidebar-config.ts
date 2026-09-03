import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  BuildingsIcon,
  CalendarIcon,
  EnvelopeIcon,
  FileLockIcon,
  LayoutIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
} from '@phosphor-icons/react';

import {
  ApplicationFormIcon,
  ArchiveReasonsIcon,
  CancelRescheduleReasonsIcon,
  CloseJobReasonsIcon,
  CustomFieldsIcon,
  DepartmentsAndTeamsIcon,
  FeedbackFormIcon,
  InterviewPlanIcon,
  JobFundsIcon,
} from '@/lib/constants/domain-icons';
import { Permission } from '@/lib/schemas/org';

export interface SidebarItem {
  type: 'item';
  label: string;
  path: string;
  icon: PhosphorIcon;
  match: (pathname: string) => boolean;
  permission: Permission | null;
  orgAdminOnly?: boolean;
}

export interface SidebarGroup {
  type: 'group';
  id: string;
  label: string;
  items: SidebarItem[];
}

export type SidebarEntry = SidebarItem | SidebarGroup;

export function buildSidebarEntries(basePath: string): SidebarEntry[] {
  return [
    {
      type: 'group',
      id: 'organization',
      label: 'Organization',
      items: [
        {
          type: 'item',
          label: 'Company Profile',
          path: `${basePath}/company`,
          icon: BuildingsIcon,
          match: (p) => p === `${basePath}/company` || p === basePath || p === `${basePath}/`,
          permission: Permission.ORG_SETTINGS_WRITE,
        },
        {
          type: 'item',
          label: 'Members',
          path: `${basePath}/members`,
          icon: UsersIcon,
          match: (p) => p.startsWith(`${basePath}/members`),
          permission: Permission.ORG_MEMBER_READ,
        },
        {
          type: 'item',
          label: 'Job Funds',
          path: `${basePath}/funds`,
          icon: JobFundsIcon,
          match: (p) => p.startsWith(`${basePath}/funds`),
          permission: null,
          orgAdminOnly: true,
        },
        {
          type: 'item',
          label: 'Departments & Teams',
          path: `${basePath}/departments`,
          icon: DepartmentsAndTeamsIcon,
          match: (p) => p.startsWith(`${basePath}/departments`),
          permission: Permission.ORG_SETTINGS_WRITE,
        },
        {
          type: 'item',
          label: 'Locations',
          path: `${basePath}/locations`,
          icon: MapPinIcon,
          match: (p) => p.startsWith(`${basePath}/locations`),
          permission: Permission.ORG_SETTINGS_WRITE,
        },
        {
          type: 'item',
          label: 'Email Templates',
          path: `${basePath}/email-templates`,
          icon: EnvelopeIcon,
          match: (p) => p.startsWith(`${basePath}/email-templates`),
          permission: Permission.EMAIL_TEMPLATE_WRITE,
        },
        {
          type: 'item',
          label: 'Candidate Tags',
          path: `${basePath}/tags`,
          icon: TagIcon,
          match: (p) => p.startsWith(`${basePath}/tags`),
          permission: Permission.TAG_WRITE,
        },
        {
          type: 'item',
          label: 'Custom Fields',
          path: `${basePath}/custom-fields`,
          icon: CustomFieldsIcon,
          match: (p) => p.startsWith(`${basePath}/custom-fields`),
          permission: Permission.CUSTOM_FIELD_WRITE,
        },
        {
          type: 'item',
          label: 'Data & Privacy',
          path: `${basePath}/data-privacy`,
          icon: FileLockIcon,
          match: (p) => p.startsWith(`${basePath}/data-privacy`),
          permission: Permission.ORG_SETTINGS_WRITE,
        },
      ],
    },
    {
      type: 'group',
      id: 'jobs-and-applications',
      label: 'Jobs & Applications',
      items: [
        {
          type: 'item',
          label: 'Job Templates',
          path: `${basePath}/job-templates`,
          icon: LayoutIcon,
          match: (p) => p.startsWith(`${basePath}/job-templates`),
          permission: Permission.JOB_TEMPLATE_WRITE,
        },
        {
          type: 'item',
          label: 'Application Forms',
          path: `${basePath}/application-forms`,
          icon: ApplicationFormIcon,
          match: (p) => p.startsWith(`${basePath}/application-forms`),
          permission: Permission.FORM_WRITE,
        },
        {
          type: 'item',
          label: 'Archive Reasons',
          path: `${basePath}/archive-reasons`,
          icon: ArchiveReasonsIcon,
          match: (p) => p.startsWith(`${basePath}/archive-reasons`),
          permission: Permission.ARCHIVE_REASON_WRITE,
        },
        {
          type: 'item',
          label: 'Close Job Reasons',
          path: `${basePath}/close-reasons`,
          icon: CloseJobReasonsIcon,
          match: (p) => p.startsWith(`${basePath}/close-reasons`),
          permission: Permission.CLOSE_REASON_WRITE,
        },
      ],
    },
    {
      type: 'group',
      id: 'interviews',
      label: 'Interviews & Scheduling',
      items: [
        {
          type: 'item',
          label: 'Interview Plans',
          path: `${basePath}/interview-plans`,
          icon: InterviewPlanIcon,
          match: (p) => p.startsWith(`${basePath}/interview-plans`),
          permission: Permission.INTERVIEW_PLAN_WRITE,
        },
        {
          type: 'item',
          label: 'Interview Templates',
          path: `${basePath}/interviews`,
          icon: CalendarIcon,
          match: (p) => p === `${basePath}/interviews` || p === `${basePath}/interviews/`,
          permission: Permission.INTERVIEW_PLAN_WRITE,
        },
        {
          type: 'item',
          label: 'Feedback Forms',
          path: `${basePath}/feedback-forms`,
          icon: FeedbackFormIcon,
          match: (p) => p.startsWith(`${basePath}/feedback-forms`),
          permission: Permission.FORM_WRITE,
        },
        {
          type: 'item',
          label: 'Cancel / Reschedule reasons',
          path: `${basePath}/interview-reasons`,
          icon: CancelRescheduleReasonsIcon,
          match: (p) => p.startsWith(`${basePath}/interview-reasons`),
          permission: Permission.CANCEL_RESCHEDULE_REASON_WRITE,
        },
      ],
    },
  ];
}
