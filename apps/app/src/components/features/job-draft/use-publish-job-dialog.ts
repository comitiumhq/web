import type { FeeTier, JobEconomicsConfig } from '@comitium/chain/job-economics';
import type { JobDraft } from '@comitium/schemas/jobs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo } from 'react';
import { type DefaultValues, type UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { usePublishDraft } from '@/hooks/mutations/use-publish-draft';
import { useOrgBalance } from '@/hooks/queries/use-org-balance';
import { useQueryJobConfig } from '@/hooks/queries/use-query-job-config';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import {
  buildFeeTierOptions,
  calculatePlatformFee,
  type FeeTierOption,
  type FeeTierValue,
  getMinimumStakeUsd,
} from '@/lib/jobs/stake-calculations';
import { type PublishDialogData, PublishDialogSchema } from '@/lib/schemas/draft-form';
import { formatUsd, formatUsdWhole, isDefined } from '@/lib/utils';

const DEFAULT_APPLICATION_LIMIT = 50;

const DEFAULT_PUBLISH_VALUES: DefaultValues<PublishDialogData> = {
  employerStake: 50,
  maxApplications: undefined,
};

interface UsePublishJobDialogParams {
  orgId: string;
  jobId: string;
  draft: JobDraft;
  expectedVersion: number;
  descriptionMarkdown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PublishEconomics {
  feeTierOptions: FeeTierOption[];
  minStakeUsd: number;
  platformFee: number;
  totalCost: number;
  feeLabel: string;
}

export interface PublishJobDialogState extends PublishEconomics {
  form: UseFormReturn<PublishDialogData>;
  employerStake: number;
  maxApplications?: number;
  availableUsd: number;
  isBalanceLoading: boolean;
  isConfigLoading: boolean;
  isConfigFetching: boolean;
  isConfigError: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isInsufficient: boolean;
  showInsufficientAlert: boolean;
  hasJobConfig: boolean;
  canSubmit: boolean;
  limitApps: boolean;
  handleCancel: () => void;
  handleOpenChange: (nextOpen: boolean) => void;
  handleLimitToggle: (checked: boolean) => void;
  handleRetryJobConfig: () => void;
  handleSubmit: (data: PublishDialogData) => void;
}

export function usePublishJobDialog({
  orgId,
  jobId,
  draft,
  expectedVersion,
  descriptionMarkdown,
  open,
  onOpenChange,
}: UsePublishJobDialogParams): PublishJobDialogState {
  const { data: org, isLoading: isOrgLoading } = useQueryOrg(orgId);
  const onChainOrgId = org?.orgId;

  const { availableUsd, isLoading: isOrgBalanceLoading } = useOrgBalance(onChainOrgId);
  const isBalanceLoading = isOrgLoading || isOrgBalanceLoading;
  const {
    data: jobConfig,
    isLoading: isInitialConfigLoading,
    isFetching: isConfigFetching,
    isError: isConfigError,
    refetch: refetchJobConfig,
  } = useQueryJobConfig();
  const { mutate: publishDraft, isPending, isConfirming } = usePublishDraft();
  const isConfigLoading = isInitialConfigLoading || (isConfigFetching && jobConfig == null);

  const form = useForm<PublishDialogData>({
    resolver: zodResolver(PublishDialogSchema),
    defaultValues: DEFAULT_PUBLISH_VALUES,
  });

  const employerStake = useWatch({ control: form.control, name: 'employerStake' }) ?? 0;
  const feeTier = useWatch({ control: form.control, name: 'feeTier' });
  const maxApplications = useWatch({ control: form.control, name: 'maxApplications' });
  const limitApps = isDefined(maxApplications);
  const economics = useMemo(() => {
    return buildPublishEconomics(jobConfig, feeTier, employerStake);
  }, [employerStake, feeTier, jobConfig]);

  useEffect(() => {
    if (!open || !jobConfig) {
      return;
    }

    syncFormWithJobConfig(form, economics.minStakeUsd, economics.feeTierOptions);
  }, [economics.feeTierOptions, economics.minStakeUsd, form, jobConfig, open]);

  const isInsufficient = !isBalanceLoading && availableUsd < economics.totalCost;
  const showInsufficientAlert = isInsufficient && employerStake >= economics.minStakeUsd;
  const hasJobConfig = jobConfig != null;
  const hasValidFeeTier = economics.feeTierOptions.some((option) => option.tier === feeTier);
  const canSubmit = !isPending && !isConfirming && !isInsufficient && hasJobConfig && hasValidFeeTier && org != null;

  const resetDialog = useCallback(() => {
    resetPublishForm(form);
  }, [form]);

  const handleCancel = useCallback(() => {
    if (isPending) {
      return;
    }

    resetDialog();
    onOpenChange(false);
  }, [isPending, onOpenChange, resetDialog]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return;
      }

      if (!nextOpen) {
        resetDialog();
      }

      onOpenChange(nextOpen);
    },
    [isPending, onOpenChange, resetDialog],
  );

  const handleLimitToggle = useCallback(
    (checked: boolean) => {
      form.setValue('maxApplications', checked ? DEFAULT_APPLICATION_LIMIT : undefined, { shouldValidate: true });
    },
    [form],
  );

  const handleRetryJobConfig = useCallback(() => {
    refetchJobConfig();
  }, [refetchJobConfig]);

  const handleSubmit = useCallback(
    (data: PublishDialogData) => {
      if (!jobConfig || !org) {
        return;
      }

      if (!validatePublishFormData(form, data, economics.minStakeUsd, economics.feeTierOptions, limitApps)) {
        return;
      }

      publishDraft(
        {
          orgId,
          jobId,
          draft,
          expectedVersion,
          stakeUsd: data.employerStake,
          feeTier: data.feeTier as FeeTier,
          maxApplications: data.maxApplications,
          descriptionMarkdown,
        },
        {
          onSuccess: (result) => {
            if (result.state === 'confirming') {
              return;
            }

            resetDialog();
            onOpenChange(false);
          },
        },
      );
    },
    [
      descriptionMarkdown,
      draft,
      expectedVersion,
      jobId,
      economics.feeTierOptions,
      economics.minStakeUsd,
      form,
      jobConfig,
      limitApps,
      org,
      orgId,
      onOpenChange,
      publishDraft,
      resetDialog,
    ],
  );

  return {
    form,
    ...economics,
    employerStake,
    maxApplications,
    availableUsd,
    isBalanceLoading,
    isConfigLoading,
    isConfigFetching,
    isConfigError,
    isPending,
    isConfirming,
    isInsufficient,
    showInsufficientAlert,
    hasJobConfig,
    canSubmit,
    limitApps,
    handleCancel,
    handleOpenChange,
    handleLimitToggle,
    handleRetryJobConfig,
    handleSubmit,
  };
}

function buildPublishEconomics(
  jobConfig: JobEconomicsConfig | undefined,
  feeTier: FeeTierValue | undefined,
  employerStake: number,
): PublishEconomics {
  if (!jobConfig) {
    return {
      feeTierOptions: [],
      minStakeUsd: 1,
      platformFee: 0,
      totalCost: employerStake,
      feeLabel: 'Platform fee',
    };
  }

  const feeTierOptions = buildFeeTierOptions(jobConfig);
  const selectedFeeTier = resolveSelectedFeeTier(feeTier, feeTierOptions);
  const selectedFeeTierInfo = resolveSelectedFeeTierInfo(selectedFeeTier, feeTierOptions);
  const platformFee = calculatePlatformFee(employerStake, selectedFeeTier, jobConfig);

  return {
    feeTierOptions,
    minStakeUsd: getMinimumStakeUsd(jobConfig),
    platformFee,
    totalCost: employerStake + platformFee,
    feeLabel: buildFeeLabel(selectedFeeTierInfo),
  };
}

function resolveSelectedFeeTier(feeTier: FeeTierValue | undefined, options: FeeTierOption[]): FeeTierValue {
  return feeTier ?? resolveDefaultFeeTier(options)?.tier ?? 0;
}

function resolveSelectedFeeTierInfo(selectedFeeTier: FeeTierValue, options: FeeTierOption[]): FeeTierOption | null {
  return options.find((option) => option.tier === selectedFeeTier) ?? options[0] ?? null;
}

function resolveDefaultFeeTier(options: FeeTierOption[]): FeeTierOption | null {
  return options.find((option) => option.deadlineDays === 7) ?? options[0] ?? null;
}

function buildFeeLabel(selectedFeeTierInfo: FeeTierOption | null): string {
  if (!selectedFeeTierInfo) {
    return 'Platform fee';
  }

  return `Platform fee (${formatUsd(selectedFeeTierInfo.baseFeeUsd)} + ${selectedFeeTierInfo.feePercent}% of stake)`;
}

function syncFormWithJobConfig(
  form: UseFormReturn<PublishDialogData>,
  minStakeUsd: number,
  feeTierOptions: FeeTierOption[],
) {
  const currentStake = form.getValues('employerStake') || 0;

  if (currentStake < minStakeUsd) {
    form.setValue('employerStake', minStakeUsd, { shouldValidate: true });
  }

  const currentFeeTier = form.getValues('feeTier');
  const hasCurrentTier = feeTierOptions.some((option) => option.tier === currentFeeTier);
  const defaultFeeTier = resolveDefaultFeeTier(feeTierOptions);

  if (!hasCurrentTier && defaultFeeTier) {
    form.setValue('feeTier', defaultFeeTier.tier, { shouldValidate: true });
  }
}

function validatePublishFormData(
  form: UseFormReturn<PublishDialogData>,
  data: PublishDialogData,
  minStakeUsd: number,
  feeTierOptions: FeeTierOption[],
  limitApps: boolean,
) {
  if (data.employerStake < minStakeUsd) {
    form.setError('employerStake', { message: `Minimum stake is ${formatUsdWhole(minStakeUsd)} USDC` });

    return false;
  }

  const feeTierExists = feeTierOptions.some((option) => option.tier === data.feeTier);

  if (!feeTierExists) {
    form.setError('feeTier', { message: 'Select a valid response time' });

    return false;
  }

  if (limitApps && !isDefined(data.maxApplications)) {
    form.setError('maxApplications', { message: 'Enter an application capacity' });

    return false;
  }

  return true;
}

function resetPublishForm(form: UseFormReturn<PublishDialogData>) {
  form.reset(DEFAULT_PUBLISH_VALUES);
}
