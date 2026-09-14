import { Autocomplete, type AutocompleteOption } from '@comitium/ui/autocomplete';
import { useCallback, useMemo } from 'react';
import { MAX_TAGS_PER_CANDIDATE } from '@/lib/schemas/candidate-tags';

interface CandidateTagMultiSelectProps {
  options: AutocompleteOption[];
  value: string[];
  placeholder: string;
  disabled?: boolean;
  onValueChange: (tagIds: string[]) => void;
}

export function CandidateTagMultiSelect({
  options,
  value,
  placeholder,
  disabled,
  onValueChange,
}: CandidateTagMultiSelectProps) {
  const reachedLimit = value.length >= MAX_TAGS_PER_CANDIDATE;
  const limitedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        disabled: option.disabled || (reachedLimit && !value.includes(option.value)),
      })),
    [options, reachedLimit, value],
  );

  const handleValueChange = useCallback(
    (nextValue: string[]) => {
      if (nextValue.length <= MAX_TAGS_PER_CANDIDATE) {
        onValueChange(nextValue);
      }
    },
    [onValueChange],
  );

  return (
    <Autocomplete
      ariaLabel="Tags"
      options={limitedOptions}
      value={value}
      placeholder={reachedLimit ? `Maximum ${MAX_TAGS_PER_CANDIDATE} tags` : placeholder}
      searchPlaceholder="Search tags…"
      emptyMessage="No tags found."
      disabled={disabled}
      onValueChange={handleValueChange}
    />
  );
}
