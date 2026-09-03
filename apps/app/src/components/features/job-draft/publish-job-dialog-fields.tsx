import { parseWholeUsdInputToNumber } from '@comitium/chain/usdc';
import { Alert, AlertDescription } from '@comitium/ui/alert';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Skeleton } from '@comitium/ui/skeleton';
import { Switch } from '@comitium/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { InfoIcon, WarningIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { type ChangeEvent, memo, type ReactNode, useCallback, useId } from 'react';
import type { Control, ControllerRenderProps } from 'react-hook-form';
import { usePermissions } from '@/hooks/use-permissions';
import type { FeeTierOption } from '@/lib/jobs/stake-calculations';
import type { PublishDialogData } from '@/lib/schemas/draft-form';
import { formatUsd, formatUsdWhole } from '@/lib/utils';

interface EmployerStakeFieldProps {
  control: Control<PublishDialogData>;
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
  field: ControllerRenderProps<PublishDialogData, 'employerStake'>;
  minStakeUsd: number;
}

function EmployerStakeControl({ field, minStakeUsd }: EmployerStakeControlProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseStakeInput(event.target.value);

      if (parsed !== null || event.target.value === '') {
        field.onChange(parsed ?? undefined);
      }
    },
    [field],
  );

  const handleBlur = useCallback(() => {
    field.onBlur();

    const value = Number(field.value);

    if (!Number.isFinite(value) || value < minStakeUsd) {
      field.onChange(minStakeUsd);
    }
  }, [field, minStakeUsd]);

  const value = field.value ?? '';

  const inputProps = {
    ...field,
    value,
    onChange: handleChange,
    onBlur: handleBlur,
  };

  return (
    <FormItem>
      <FieldLabelWithTooltip label="Refundable stake">
        <p>Your stake signals your organization&apos;s commitment to reviewing applications on time.</p>
        <p>A higher stake gives this posting greater visibility in the job board&apos;s default ranking.</p>
        <p>
          The stake is held until the posting is settled. The amount returned depends on your on-time response rate.
        </p>
      </FieldLabelWithTooltip>
      <FormControl>
        <div className="flex items-center gap-3">
          <div className="relative max-w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-label-14">$</span>
            <Input {...inputProps} type="text" inputMode="numeric" pattern="[0-9]*" className="pl-7" />
          </div>
          <span className="text-label-12 text-muted-foreground">min. {formatUsdWhole(minStakeUsd)} USDC</span>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

interface ResponseDeadlineFieldProps {
  control: Control<PublishDialogData>;
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
  field: ControllerRenderProps<PublishDialogData, 'feeTier'>;
  options: FeeTierOption[];
  isConfigLoading: boolean;
}

function ResponseDeadlineControl({ field, options, isConfigLoading }: ResponseDeadlineControlProps) {
  const handleValueChange = useCallback(
    (value: string) => {
      if (value) {
        field.onChange(Number(value));
      }
    },
    [field],
  );

  return (
    <FormItem>
      <FieldLabelWithTooltip label="Respond within">
        <p>Every application has its own deadline, starting when it is submitted.</p>
        <p>Respond by inviting the candidate to an interview or by sending a rejection.</p>
      </FieldLabelWithTooltip>
      <FormControl>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={field.value === undefined ? '' : String(field.value)}
          onValueChange={handleValueChange}
          className="grid w-full"
          style={{ gridTemplateColumns: buildTierGridTemplate(options.length) }}
          aria-label="Response time"
        >
          {options.length === 0 && <ResponseDeadlineFallback isConfigLoading={isConfigLoading} />}
          {options.map((option) => (
            <FeeTierOptionButton key={option.tier} option={option} />
          ))}
        </ToggleGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

function ResponseDeadlineFallback({ isConfigLoading }: { isConfigLoading: boolean }) {
  if (isConfigLoading) {
    return <Skeleton className="m-2 h-14" />;
  }

  return <div className="px-2 py-3 text-center text-label-12 text-muted-foreground">Unavailable</div>;
}

interface FeeTierOptionButtonProps {
  option: FeeTierOption;
}

const FeeTierOptionButton = memo(function FeeTierOptionButton({ option }: FeeTierOptionButtonProps) {
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
});

interface ApplicationLimitFieldProps {
  control: Control<PublishDialogData>;
  enabled: boolean;
  maxApplications?: number;
  onToggle: (checked: boolean) => void;
}

export function ApplicationLimitField({ control, enabled, maxApplications, onToggle }: ApplicationLimitFieldProps) {
  return (
    <FormField
      control={control}
      name="maxApplications"
      render={({ field }) => (
        <ApplicationLimitControl
          field={field}
          enabled={enabled}
          maxApplications={maxApplications}
          onToggle={onToggle}
        />
      )}
    />
  );
}

interface ApplicationLimitControlProps {
  field: ControllerRenderProps<PublishDialogData, 'maxApplications'>;
  enabled: boolean;
  maxApplications?: number;
  onToggle: (checked: boolean) => void;
}

function ApplicationLimitControl({ field, enabled, maxApplications, onToggle }: ApplicationLimitControlProps) {
  const inputId = useId();
  const inputValue = field.value ?? maxApplications ?? '';

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event.target.value ? Number(event.target.value) : undefined);
    },
    [field],
  );

  return (
    <FormItem>
      <div className="flex items-center justify-between gap-3">
        <FieldLabelWithTooltip label="Application capacity">
          <p>Pause new applications when capacity is reached.</p>
          <p>The job stays open for reviewing submitted applications.</p>
        </FieldLabelWithTooltip>
        <FormControl>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </FormControl>
      </div>
      {enabled && (
        <label htmlFor={inputId} className="flex items-center justify-between gap-3 text-copy-14">
          <span className="text-muted-foreground">Maximum applications</span>
          <Input
            id={inputId}
            type="number"
            min="1"
            max="1000"
            className="h-8 w-24"
            value={inputValue}
            onChange={handleChange}
          />
        </label>
      )}
      <FormMessage />
    </FormItem>
  );
}

interface InsufficientFundsAlertProps {
  orgId: string;
  shortfallUsd: number;
}

export function InsufficientFundsAlert({ orgId, shortfallUsd }: InsufficientFundsAlertProps) {
  const { isAdmin: isOrgAdmin } = usePermissions();

  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertDescription>
        <InsufficientFundsMessage orgId={orgId} shortfallUsd={shortfallUsd} isOrgAdmin={isOrgAdmin} />
      </AlertDescription>
    </Alert>
  );
}

interface InsufficientFundsMessageProps extends InsufficientFundsAlertProps {
  isOrgAdmin: boolean;
}

function InsufficientFundsMessage({ orgId, shortfallUsd, isOrgAdmin }: InsufficientFundsMessageProps) {
  if (!isOrgAdmin) {
    return (
      <span>
        The organization needs {formatUsd(shortfallUsd)} more to publish this job. Ask an organization administrator to
        add funds.
      </span>
    );
  }

  return (
    <span>
      Add {formatUsd(shortfallUsd)} to publish this job.{' '}
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
  );
}

interface FieldLabelWithTooltipProps {
  label: string;
  children: ReactNode;
}

function FieldLabelWithTooltip({ label, children }: FieldLabelWithTooltipProps) {
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
          <div className="space-y-1.5">{children}</div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function buildTierGridTemplate(optionCount: number) {
  return `repeat(${Math.max(optionCount, 1)}, minmax(0, 1fr))`;
}

function parseStakeInput(value: string): number | null {
  if (value === '') {
    return null;
  }

  return parseWholeUsdInputToNumber(value);
}
