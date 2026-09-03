import type { ApplicantStakeReturnAvailability } from '@comitium/schemas/applications';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { HandCoinsIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useReturnApplicantStakes } from '@/hooks/mutations/use-return-applicant-stakes';
import { formatStake } from './utils';

function getStakeReturnDescription(availability: ApplicantStakeReturnAvailability): string {
  const stakeLabel = availability.count === 1 ? 'application deposit' : 'application deposits';
  const verb = availability.count === 1 ? 'is' : 'are';

  return `${availability.count} ${stakeLabel} totaling ${formatStake(availability.totalAmount)} ${verb} available.`;
}

export function StakeReturnCard({ availability }: { availability: ApplicantStakeReturnAvailability }) {
  const { returnStakes, isPending } = useReturnApplicantStakes(availability);
  const handleReturn = useCallback(() => {
    returnStakes();
  }, [returnStakes]);

  return (
    <Card size="sm" className="mt-4 gap-0 py-0">
      <CardContent className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-heading-16">Deposits ready to return</h2>
          <p className="mt-1 text-copy-14 text-muted-foreground">{getStakeReturnDescription(availability)}</p>
        </div>

        <Button className="w-full shrink-0 sm:w-auto" onClick={handleReturn} disabled={isPending}>
          <HandCoinsIcon aria-hidden="true" />
          {isPending ? 'Returning…' : 'Return deposits'}
        </Button>
      </CardContent>
    </Card>
  );
}
