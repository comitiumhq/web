import { Card, CardContent } from '@comitium/ui/card';
import { cn, formatUsd, formatUsdWhole } from '@/lib/utils';

interface CommitmentCostSummaryProps {
  employerStake: number;
  feeLabel: string;
  platformFee: number;
  totalCost: number;
  availableUsd: number;
  pricingAvailable: boolean;
  isBalanceLoading: boolean;
  isInsufficient: boolean;
}

export function CommitmentCostSummary({
  employerStake,
  feeLabel,
  platformFee,
  totalCost,
  availableUsd,
  pricingAvailable,
  isBalanceLoading,
  isInsufficient,
}: CommitmentCostSummaryProps) {
  const feeValue = pricingAvailable ? formatUsd(platformFee) : '—';
  const totalValue = pricingAvailable ? formatUsd(totalCost) : '—';

  return (
    <Card size="sm" className="gap-0 py-0">
      <CardContent className="flex flex-col gap-2 py-4">
        <p className="text-label-12 uppercase tracking-wide text-muted-foreground">Funding summary</p>
        <SummaryRow label="Refundable stake" value={formatUsdWhole(employerStake)} />
        <SummaryRow label={feeLabel} value={feeValue} />

        <div className="flex items-center justify-between border-t border-separator pt-2">
          <span className="text-heading-14">Due now</span>
          <span className="text-heading-16 tabular-nums">{totalValue}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-copy-13 text-muted-foreground">Available Commitment Funds</span>
          <span className={cn('text-copy-13 tabular-nums', { 'text-destructive': isInsufficient })}>
            {isBalanceLoading ? '—' : formatUsd(availableUsd)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-copy-13 text-muted-foreground">{label}</span>
      <span className="text-copy-13 tabular-nums">{value}</span>
    </div>
  );
}
