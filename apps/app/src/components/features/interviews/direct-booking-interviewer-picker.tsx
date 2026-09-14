import { FormLabel } from '@comitium/ui/form';
import type { OrgTeamMember } from '@/lib/schemas/org';

import { InterviewerAutocomplete } from './interviewer-autocomplete';
import type { SelectedInterviewer } from './types';

interface DirectBookingInterviewerPickerProps {
  members: OrgTeamMember[];
  calendarStatusMap: ReadonlyMap<string, boolean>;
  interviewers: SelectedInterviewer[];
  disabled: boolean;
  onChange: (interviewers: SelectedInterviewer[]) => void;
}

export function DirectBookingInterviewerPicker({
  members,
  calendarStatusMap,
  interviewers,
  disabled,
  onChange,
}: DirectBookingInterviewerPickerProps) {
  return (
    <div className="space-y-2">
      <FormLabel>Interviewers</FormLabel>

      <InterviewerAutocomplete
        members={members}
        calendarStatusMap={calendarStatusMap}
        interviewers={interviewers}
        onChange={onChange}
        disabled={disabled}
      />

      {interviewers.length === 0 && (
        <p className="text-copy-14 text-muted-foreground">Select at least one interviewer with a connected calendar.</p>
      )}
    </div>
  );
}
