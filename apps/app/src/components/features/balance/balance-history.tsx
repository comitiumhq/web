import { usdcToUsd } from '@comitium/chain/job-economics';
import { Badge } from '@comitium/ui/badge';
import { Card, CardContent } from '@comitium/ui/card';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { formatDate } from '@comitium/ui/date';
import { EmptyState } from '@comitium/ui/empty-state';
import { TableCell, TableRow } from '@comitium/ui/table';
import { ClockCounterClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
  type BalanceEventDetails,
  type BalanceEventType,
  isDepositOrWithdraw,
  isJobFunded,
  isJobSettled,
  useOrgBalanceHistory,
} from '@/hooks/queries/use-org-balance-history';
import { cn, formatUsdRaw } from '@/lib/utils';

import { BalanceHistorySkeleton } from './balance-history-skeleton';

const BALANCE_HISTORY_COLUMNS: DataTableColumn[] = [
  { id: 'type', header: 'Type' },
  { id: 'amount', header: 'Amount', className: 'text-right' },
  { id: 'date', header: 'Date', className: 'text-right' },
];

const EVENT_CONFIG: Record<
  BalanceEventType,
  {
    label: string;
    badge: 'secondary' | 'success';
    sign: '+' | '-';
    amountClass: string;
  }
> = {
  deposit: {
    label: 'Deposit',
    badge: 'success',
    sign: '+',
    amountClass: 'text-success',
  },
  withdraw: {
    label: 'Withdraw',
    badge: 'secondary',
    sign: '-',
    amountClass: 'text-muted-foreground',
  },
  job_funded: {
    label: 'Committed',
    badge: 'secondary',
    sign: '-',
    amountClass: 'text-muted-foreground',
  },
  job_settled: {
    label: 'Settled',
    badge: 'success',
    sign: '+',
    amountClass: 'text-success',
  },
};

function parseEventAmount(details: BalanceEventDetails): bigint {
  if (isDepositOrWithdraw(details)) {
    return BigInt(details.amount);
  }

  if (isJobFunded(details)) {
    return BigInt(details.stakeAmount) + BigInt(details.feeAmount);
  }

  if (isJobSettled(details)) {
    return BigInt(details.returnAmount);
  }

  return 0n;
}

interface BalanceHistoryProps {
  orgId: string;
}

export function BalanceHistory({ orgId }: BalanceHistoryProps) {
  const { events, isLoading, error } = useOrgBalanceHistory(orgId);

  if (isLoading) {
    return <BalanceHistorySkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load balance activity. Please try again."
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card size="sm" className="ring-inset">
        <CardContent>
          <EmptyState
            icon={ClockCounterClockwiseIcon}
            title="No activity yet"
            description="Make a deposit to get started."
            className="min-h-52 py-12"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={BALANCE_HISTORY_COLUMNS}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    >
      {events.map((event) => {
        const config = EVENT_CONFIG[event.eventType];

        if (!config) {
          return null;
        }

        const amount = parseEventAmount(event.details);

        return (
          <TableRow key={event.id}>
            <TableCell>
              <Badge variant={config.badge}>{config.label}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <span className={cn('tabular-nums', config.amountClass)}>
                {config.sign}${formatUsdRaw(usdcToUsd(amount))}
              </span>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">{formatDate(event.createdAt) || '—'}</TableCell>
          </TableRow>
        );
      })}
    </DataTable>
  );
}
