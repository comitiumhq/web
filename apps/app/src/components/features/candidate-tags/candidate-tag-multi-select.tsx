import { SearchSelect, type SearchSelectOption } from '@comitium/ui/search-select';
import { useCallback, useMemo } from 'react';
import { MAX_TAGS_PER_CANDIDATE } from '@/lib/schemas/candidate-tags';
import { TagChip } from './tag-chip';

interface CandidateTagMultiSelectProps {
  options: SearchSelectOption[];
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
  const selectedTags = useMemo(() => getSelectedTags(options, value), [options, value]);
  const availableOptions = useMemo(() => getAvailableOptions(options, value), [options, value]);
  const reachedLimit = value.length >= MAX_TAGS_PER_CANDIDATE;

  const handleAdd = useCallback(
    (tagId: string | null) => {
      if (!tagId || value.includes(tagId) || reachedLimit) return;

      onValueChange([...value, tagId]);
    },
    [onValueChange, reachedLimit, value],
  );

  const handleRemove = useCallback(
    (tagId: string) => onValueChange(value.filter((selectedTagId) => selectedTagId !== tagId)),
    [onValueChange, value],
  );

  return (
    <div className="space-y-2">
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <TagChip key={tag.value} tagId={tag.value} label={tag.label} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <SearchSelect
        ariaLabel="Add tag"
        options={availableOptions}
        value={null}
        placeholder={getPlaceholder(placeholder, value.length, availableOptions.length)}
        searchPlaceholder="Search tags..."
        emptyMessage="No tags found."
        disabled={disabled || reachedLimit || availableOptions.length === 0}
        onValueChange={handleAdd}
      />
    </div>
  );
}

function getSelectedTags(options: SearchSelectOption[], selectedTagIds: string[]) {
  const optionsById = new Map(options.map((option) => [option.value, option]));

  return selectedTagIds.flatMap((tagId) => {
    const option = optionsById.get(tagId);

    return option ? [option] : [];
  });
}

function getAvailableOptions(options: SearchSelectOption[], selectedTagIds: string[]) {
  const selectedIds = new Set(selectedTagIds);

  return options.filter((option) => !selectedIds.has(option.value));
}

function getPlaceholder(defaultPlaceholder: string, selectedCount: number, availableCount: number) {
  if (selectedCount >= MAX_TAGS_PER_CANDIDATE) return `Maximum ${MAX_TAGS_PER_CANDIDATE} tags`;
  if (availableCount === 0) return 'All active tags selected';
  if (selectedCount > 0) return 'Add another tag';

  return defaultPlaceholder;
}
