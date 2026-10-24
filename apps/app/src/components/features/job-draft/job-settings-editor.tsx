import type { HiringTeamEntry } from '@comitium/schemas/jobs';
import type { UseFormReturn } from 'react-hook-form';
import { HiringTeamTab } from '@/components/features/hiring-team-editor/hiring-team-tab';
import { JobBasicSettingsCard } from '@/components/features/job-settings/job-basic-settings-card';
import { type JobSettingsTab, JobSettingsTabs } from '@/components/features/job-settings/job-settings-tabs';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';

interface JobSettingsEditorProps {
  orgId: string;
  form: UseFormReturn<JobSettingsFormData>;
  hiringTeam: HiringTeamEntry[];
  onChangeHiringTeam: (team: HiringTeamEntry[]) => void;
  showPublishRequiredMarkers?: boolean;
  showCompensationDisclosure?: boolean;
  initialTab?: JobSettingsTab;
  readOnly?: boolean;
}

export function JobSettingsEditor({
  orgId,
  form,
  hiringTeam,
  onChangeHiringTeam,
  showPublishRequiredMarkers = true,
  showCompensationDisclosure = true,
  initialTab,
  readOnly = false,
}: JobSettingsEditorProps) {
  return (
    <JobSettingsTabs
      initialTab={initialTab}
      basic={
        <JobBasicSettingsCard
          orgId={orgId}
          form={form}
          readOnly={readOnly}
          showPublishRequiredMarkers={showPublishRequiredMarkers}
          showCompensationDisclosure={showCompensationDisclosure}
        />
      }
      hiringTeam={
        <HiringTeamTab
          orgId={orgId}
          hiringTeam={hiringTeam}
          readOnly={readOnly}
          onChangeHiringTeam={onChangeHiringTeam}
        />
      }
    />
  );
}
