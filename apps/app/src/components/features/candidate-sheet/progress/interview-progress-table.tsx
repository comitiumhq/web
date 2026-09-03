import { Badge } from '@comitium/ui/badge';
import { formatCompactDate, formatDurationSeconds } from '@comitium/ui/date';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comitium/ui/table';
import type { OrgTeamMember } from '@/hooks/queries/use-query-org-team';
import type { InterviewProgressStageVisit } from '@/lib/schemas/interviews';

import { InterviewProgressEventRow } from './interview-progress-event-row';

interface InterviewProgressTableProps {
  visits: InterviewProgressStageVisit[];
  memberMap: Map<string, OrgTeamMember>;
  timeZone: string;
}

export function InterviewProgressTable({ visits, memberMap, timeZone }: InterviewProgressTableProps) {
  return (
    <>
      <div className="flex flex-col divide-y divide-border rounded-xl ring-1 ring-foreground/10 sm:hidden">
        {visits.map((visit) => (
          <CompactStageVisit key={visit.id} visit={visit} memberMap={memberMap} timeZone={timeZone} />
        ))}
      </div>

      <Table containerClassName="hidden rounded-xl ring-1 ring-foreground/10 sm:block" className="table-fixed">
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
        </colgroup>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 px-3 text-label-12 text-muted-foreground">Stage</TableHead>
            <TableHead className="h-9 px-3 text-right text-label-12 text-muted-foreground">Entered</TableHead>
            <TableHead className="h-9 px-3 text-right text-label-12 text-muted-foreground">Left</TableHead>
            <TableHead className="h-9 px-3 text-right text-label-12 text-muted-foreground">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((visit) => (
            <StageVisitRows key={visit.id} visit={visit} memberMap={memberMap} timeZone={timeZone} />
          ))}
        </TableBody>
      </Table>
    </>
  );
}

interface StageVisitRowsProps {
  visit: InterviewProgressStageVisit;
  memberMap: Map<string, OrgTeamMember>;
  timeZone: string;
}

function StageVisitRows({ visit, memberMap, timeZone }: StageVisitRowsProps) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell className="min-w-0 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-label-13 font-medium">{visit.stageName}</span>
            {visit.isCurrent && <Badge variant="secondary">Current</Badge>}
          </div>
        </TableCell>
        <TableCell className="px-3 py-2.5 text-right text-copy-12 tabular-nums text-muted-foreground">
          {formatCompactDate(visit.enteredAt)}
        </TableCell>
        <TableCell className="px-3 py-2.5 text-right text-copy-12 tabular-nums text-muted-foreground">
          {visit.leftAt ? formatCompactDate(visit.leftAt) : '—'}
        </TableCell>
        <TableCell className="px-3 py-2.5 text-right text-copy-12 tabular-nums text-muted-foreground">
          {formatDurationSeconds(visit.durationSeconds)}
        </TableCell>
      </TableRow>

      {visit.interviews.length > 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="px-5 py-0 whitespace-normal">
            <div className="flex flex-col divide-y divide-border">
              {visit.interviews.map((event) => (
                <InterviewProgressEventRow key={event.id} event={event} memberMap={memberMap} timeZone={timeZone} />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CompactStageVisit({ visit, memberMap, timeZone }: StageVisitRowsProps) {
  const metadata = [
    { label: 'Entered', value: formatCompactDate(visit.enteredAt) },
    { label: 'Left', value: visit.leftAt ? formatCompactDate(visit.leftAt) : '—' },
    { label: 'Duration', value: formatDurationSeconds(visit.durationSeconds) },
  ];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-label-13 font-medium">{visit.stageName}</span>
        {visit.isCurrent && <Badge variant="secondary">Current</Badge>}
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {metadata.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-label-11 text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 text-copy-12 tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      {visit.interviews.length > 0 && (
        <div className="flex flex-col divide-y divide-border border-t border-border">
          {visit.interviews.map((event) => (
            <InterviewProgressEventRow key={event.id} event={event} memberMap={memberMap} timeZone={timeZone} />
          ))}
        </div>
      )}
    </div>
  );
}
