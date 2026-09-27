import type { ResponseCommitmentEconomicsConfig } from '@comitium/chain/response-commitment-economics';
import { wholeUsdToUsdcUnits } from '@comitium/chain/usdc';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { type DefaultValues, type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { useAddResponseCommitment } from '@/hooks/mutations/use-job-posting-mutations';
import { useOrgBalance } from '@/hooks/queries/use-org-balance';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import { useQueryResponseCommitmentConfig } from '@/hooks/queries/use-query-response-commitment-config';
import {
  buildFeeTierOptions,
  calculatePlatformFee,
  type FeeTierOption,
  getMinimumStakeUsd,
} from '@/lib/jobs/stake-calculations';
import { type ResponseCommitmentFormData, ResponseCommitmentFormSchema } from '@/lib/schemas/job-settings-form';
import { formatUsd, formatUsdWhole } from '@/lib/utils';

const DEFAULT_VALUES: DefaultValues<ResponseCommitmentFormData> = {
  employerStake: 50,
};

interface UseResponseCommitmentDialogParams {
  orgId: string;
  jobId: string;
  expectedVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useResponseCommitmentDialog({
  orgId,
  jobId,
  expectedVersion,
  open,
  onOpenChange,
}: UseResponseCommitmentDialogParams) {
  const form = useForm<ResponseCommitmentFormData>({
    resolver: zodResolver(ResponseCommitmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const orgQuery = useQueryOrg(orgId);
  const balance = useOrgBalance(orgQuery.data?.orgId);
  const configQuery = useQueryResponseCommitmentConfig();
  const addCommitment = useAddResponseCommitment({ orgId, jobId });
  const employerStake = useWatch({ control: form.control, name: 'employerStake' }) ?? 0;
  const feeTier = useWatch({ control: form.control, name: 'feeTier' });
  const economics = useMemo(
    () => buildCommitmentEconomics(configQuery.data, feeTier, employerStake),
    [configQuery.data, employerStake, feeTier],
  );

  useEffect(() => {
    if (!open || !configQuery.data) {
      return;
    }

    syncFormWithConfig(form, economics.minStakeUsd, economics.feeTierOptions);
  }, [configQuery.data, economics.feeTierOptions, economics.minStakeUsd, form, open]);

  const isBalanceLoading = orgQuery.isLoading || balance.isLoading;
  const isBalanceError = orgQuery.isError || balance.error !== null;
  const isInsufficient = !isBalanceLoading && !isBalanceError && balance.availableUsd < economics.totalCost;
  const hasValidFeeTier = economics.feeTierOptions.some((option) => option.tier === feeTier);
  const hasRequiredData = Boolean(configQuery.data && orgQuery.data);
  const isPending = addCommitment.isPending || addCommitment.isConfirming;
  const canSubmit =
    hasRequiredData && hasValidFeeTier && !isBalanceLoading && !isBalanceError && !isInsufficient && !isPending;

  const reset = () => form.reset(DEFAULT_VALUES);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) {
      return;
    }

    if (!nextOpen) {
      reset();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (data: ResponseCommitmentFormData) => {
    if (!configQuery.data) {
      return;
    }

    if (!validateForm(form, data, economics.minStakeUsd, economics.feeTierOptions)) {
      return;
    }

    await addCommitment.mutateAsync({
      expectedVersion,
      stake: wholeUsdToUsdcUnits(data.employerStake).toString(),
      feeTier: data.feeTier,
    });
    reset();
    onOpenChange(false);
  };

  return {
    form,
    ...economics,
    employerStake,
    availableUsd: balance.availableUsd,
    isBalanceLoading,
    isBalanceFetching: orgQuery.isFetching || balance.isFetching,
    isBalanceError,
    isConfigLoading: configQuery.isLoading || (configQuery.isFetching && !configQuery.data),
    isConfigFetching: configQuery.isFetching,
    isConfigError: configQuery.isError,
    isInsufficient,
    isPending,
    canSubmit,
    handleOpenChange,
    handleRetryConfig: configQuery.refetch,
    handleRetryBalance: async () => {
      await Promise.all([orgQuery.refetch(), balance.refetch()]);
    },
    handleSubmit,
  };
}

function buildCommitmentEconomics(
  config: ResponseCommitmentEconomicsConfig | undefined,
  feeTier: number | undefined,
  employerStake: number,
) {
  if (!config) {
    return {
      feeTierOptions: [] as FeeTierOption[],
      minStakeUsd: 1,
      platformFee: 0,
      totalCost: employerStake,
      feeLabel: 'Platform fee',
      pricingAvailable: false,
    };
  }

  const feeTierOptions = buildFeeTierOptions(config);
  const selected = feeTierOptions.find((option) => option.tier === feeTier) ?? defaultFeeTier(feeTierOptions);
  const selectedTier = selected?.tier ?? 0;
  const platformFee = calculatePlatformFee(employerStake, selectedTier, config);

  return {
    feeTierOptions,
    minStakeUsd: getMinimumStakeUsd(config),
    platformFee,
    totalCost: employerStake + platformFee,
    feeLabel: selected
      ? `Platform fee (${formatUsd(selected.baseFeeUsd)} + ${selected.feePercent}% of stake)`
      : 'Platform fee',
    pricingAvailable: true,
  };
}

function defaultFeeTier(options: FeeTierOption[]): FeeTierOption | undefined {
  return options.find((option) => option.deadlineDays === 7) ?? options[0];
}

function syncFormWithConfig(
  form: UseFormReturn<ResponseCommitmentFormData>,
  minStakeUsd: number,
  options: FeeTierOption[],
) {
  if ((form.getValues('employerStake') ?? 0) < minStakeUsd) {
    form.setValue('employerStake', minStakeUsd, { shouldValidate: true });
  }

  const currentTier = form.getValues('feeTier');

  if (!options.some((option) => option.tier === currentTier)) {
    const fallback = defaultFeeTier(options);

    if (fallback) {
      form.setValue('feeTier', fallback.tier, { shouldValidate: true });
    }
  }
}

function validateForm(
  form: UseFormReturn<ResponseCommitmentFormData>,
  data: ResponseCommitmentFormData,
  minStakeUsd: number,
  options: FeeTierOption[],
): boolean {
  if (data.employerStake < minStakeUsd) {
    form.setError('employerStake', { message: `Minimum stake is ${formatUsdWhole(minStakeUsd)} USDC` });

    return false;
  }

  if (!options.some((option) => option.tier === data.feeTier)) {
    form.setError('feeTier', { message: 'Select a valid response time' });

    return false;
  }

  return true;
}
