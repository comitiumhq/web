import { parseWholeUsdInputToNumber } from '@comitium/chain/usdc';
import { Alert, AlertDescription } from '@comitium/ui/alert';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Skeleton } from '@comitium/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon, WarningIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { ChangeEvent, ReactNode } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import { usePermissions } from '@/hooks/use-permissions';
import type { FeeTierOption } from '@/lib/jobs/stake-calculations';
import type { ResponseCommitmentFormData } from '@/lib/schemas/job-settings-form';
import { formatUsd, formatUsdWhole } from '@/lib/utils';

interface EmployerStakeFieldProps {
  control: Control<ResponseCommitmentFormData>;
  minStakeUsd: number;
}

export function EmployerStakeField({ control, minStakeUsd }: EmployerStakeFieldProps) {
  return (
    <FormField
      control={control}
      name="employerStake"
      render={({ field }) => <EmployerStakeControl field={field} minStakeUsd={minStakeUsd} />}
    />
  );
}

interface EmployerStakeControlProps {
  field: ControllerRenderProps<ResponseCommitmentFormData, 'employerStake'>;
  minStakeUsd: number;
}

function EmployerStakeControl({ field, minStakeUsd }: EmployerStakeControlProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseStakeInput(event.target.value);

    if (parsed !== null || event.target.value === '') {
      field.onChange(parsed ?? undefined);
    }
  };

  const handleBlur = () => {
    field.onBlur();

    const value = Number(field.value);

    if (!Number.isFinite(value) || value < minStakeUsd) {
      field.onChange(minStakeUsd);
    }
  };

  return (
    <FormItem>
      <FieldLabelWithTooltip label="Refundable stake">
        <p>Your stake signals your organization&apos;s commitment to reviewing applications on time.</p>
        <p>A higher stake gives this Posting greater visibility in the job board&apos;s default ranking.</p>
        <p>The amount returned depends on your on-time response rate.</p>
      </FieldLabelWithTooltip>
      <FormControl>
        <div className="flex items-center gap-3">
          <div className="relative max-w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-label-14 text-muted-foreground">$</span>
            <Input
              {...field}
              value={field.value ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="pl-7"
            />
          </div>
          <span className="text-label-12 text-muted-foreground">min. {formatUsdWhole(minStakeUsd)} USDC</span>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

interface ResponseDeadlineFieldProps {
  control: Control<ResponseCommitmentFormData>;
  options: FeeTierOption[];
  isConfigLoading: boolean;
}

export function ResponseDeadlineField({ control, options, isConfigLoading }: ResponseDeadlineFieldProps) {
  return (
    <FormField
      control={control}
      name="feeTier"
      render={({ field }) => (
        <ResponseDeadlineControl field={field} options={options} isConfigLoading={isConfigLoading} />
      )}
    />
  );
}

interface ResponseDeadlineControlProps {
  field: ControllerRenderProps<ResponseCommitmentFormData, 'feeTier'>;
  options: FeeTierOption[];
  isConfigLoading: boolean;
}

function ResponseDeadlineControl({ field, options, isConfigLoading }: ResponseDeadlineControlProps) {
  const handleValueChange = (value: string) => {
    if (value) {
      field.onChange(Number(value));
    }
  };

  return (
    <FormItem>
      <FieldLabelWithTooltip label="Respond within">
        <p>The deadline starts when each application is submitted.</p>
      </FieldLabelWithTooltip>
      <FormControl>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={field.value === undefined ? '' : String(field.value)}
          onValueChange={handleValueChange}
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
          aria-label="Response time"
        >
          {options.length === 0 &&
            (isConfigLoading ? (
              <Skeleton className="m-2 h-14" />
            ) : (
              <div className="px-2 py-3 text-center text-label-12 text-muted-foreground">Unavailable</div>
            ))}
          {options.map((option) => (
            <FeeTierOptionButton key={option.tier} option={option} />
          ))}
        </ToggleGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

function FeeTierOptionButton({ option }: { option: FeeTierOption }) {
  const deadlineUnit = option.deadlineDays === 1 ? 'day' : 'days';

  return (
    <ToggleGroupItem
      value={String(option.tier)}
      aria-label={`${option.deadlineDays} ${deadlineUnit}`}
      className="h-auto min-w-0 flex-col gap-0.5 px-2 py-3 [&>span:last-child]:text-muted-foreground"
    >
      <span className="text-label-14">
        {option.deadlineDays} {deadlineUnit}
      </span>
      <span className="text-label-12">
        {formatUsd(option.baseFeeUsd)} + {option.feePercent}%
      </span>
    </ToggleGroupItem>
  );
}

export function InsufficientFundsAlert({ orgId, shortfallUsd }: { orgId: string; shortfallUsd: number }) {
  const { isAdmin } = usePermissions();

  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertDescription>
        {isAdmin ? (
          <span>
            Add {formatUsd(shortfallUsd)} to continue.{' '}
            <Link
              to="/org/$orgId/organization/funds"
              params={{ orgId }}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Deposit funds
            </Link>
          </span>
        ) : (
          <span>
            The organization needs {formatUsd(shortfallUsd)} more. Ask an organization administrator to add funds.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}

function FieldLabelWithTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <InfoIcon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-80 items-start">
          {children}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function parseStakeInput(value: string): number | null {
  return value === '' ? null : parseWholeUsdInputToNumber(value);
}
