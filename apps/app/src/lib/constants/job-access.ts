import type { JobAccessRole } from '@comitium/schemas/jobs';

export const JOB_ACCESS_ROLES: { value: JobAccessRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage job setup, hiring team, lifecycle actions, and candidates',
  },
  {
    value: 'hiring_manager',
    label: 'Hiring Manager',
    description: 'Can manage candidates, pipeline, interviews, notes, and communication',
  },
  {
    value: 'hiring_member',
    label: 'Hiring Member',
    description: 'Can view candidates and applications, and submit feedback',
  },
];
