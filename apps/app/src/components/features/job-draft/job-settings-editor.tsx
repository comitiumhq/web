import type { HiringTeamEntry } from '@comitium/schemas/jobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import type { UseFormReturn } from 'react-hook-form';
import { HiringTeamTab } from '@/components/features/hiring-team-editor/hiring-team-tab';
import type { DraftFormData } from '@/lib/schemas/draft-form';
import { DraftDetailsTab } from './draft-details-tab';

interface JobSettingsEditorProps {
  orgId: string;
  form: UseFormReturn<DraftFormData>;
  hiringTeam: HiringTeamEntry[];
  onChangeHiringTeam: (team: HiringTeamEntry[]) => void;
  showPublishRequiredMarkers?: boolean;
  editableStructure?: boolean;
}

export function JobSettingsEditor({
  orgId,
  form,
  hiringTeam,
  onChangeHiringTeam,
  showPublishRequiredMarkers = true,
  editableStructure = true,
}: JobSettingsEditorProps) {
  return (
    <div className="flex flex-col gap-6">
      <DraftDetailsTab
        orgId={orgId}
        form={form}
        showPublishRequiredMarkers={showPublishRequiredMarkers}
        editableStructure={editableStructure}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-16">Hiring team</CardTitle>
          <CardDescription>Choose the people responsible for this Job and their hiring role.</CardDescription>
        </CardHeader>
        <CardContent>
          <HiringTeamTab orgId={orgId} hiringTeam={hiringTeam} onChangeHiringTeam={onChangeHiringTeam} />
        </CardContent>
      </Card>
    </div>
  );
}
