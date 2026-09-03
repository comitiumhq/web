import { useCallback, useEffect, useMemo, useState } from 'react';

import { useQueryCancelRescheduleReasons } from '@/hooks/queries/use-query-cancel-reschedule-reasons';
import type { ReasonCategory, ReasonPolicy, ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';

import type { PolicyAction } from './constants';
import { groupByCategory } from './utils';

interface ReasonPickerBody {
  reasonId?: string;
  note?: string;
}

export interface ReasonPickerState {
  reasonId: string;
  setReasonId: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  policy: ReasonPolicy;
  groupedReasons: Record<ReasonCategory, ReasonRow[]>;
  showSelect: boolean;
  reasonRequired: boolean;
  reasonError: boolean;
  isLoading: boolean;
  buildBody: () => ReasonPickerBody;
}

export function useReasonPickerState(orgId: string, action: PolicyAction, open: boolean): ReasonPickerState {
  const { data, isLoading } = useQueryCancelRescheduleReasons(orgId, { appliesTo: action });

  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setReasonId('');
      setNote('');
      setSubmitted(false);
    }
  }, [open]);

  const policy = data?.policies[action] ?? 'optional';
  const groupedReasons = useMemo(() => {
    const active = data?.data.filter((r) => !r.isArchived) ?? [];

    return groupByCategory(active);
  }, [data]);

  const showSelect = policy !== 'off';
  const reasonRequired = policy === 'required';
  const reasonError = submitted && reasonRequired && !reasonId;

  const buildBody = useCallback((): ReasonPickerBody => {
    const body: ReasonPickerBody = {};

    if (reasonId) {
      body.reasonId = reasonId;
    }

    const trimmedNote = note.trim();

    if (trimmedNote) {
      body.note = trimmedNote;
    }

    return body;
  }, [reasonId, note]);

  return {
    reasonId,
    setReasonId,
    note,
    setNote,
    submitted,
    setSubmitted,
    policy,
    groupedReasons,
    showSelect,
    reasonRequired,
    reasonError,
    isLoading,
    buildBody,
  };
}
