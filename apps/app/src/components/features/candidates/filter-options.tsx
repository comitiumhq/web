import type { CandidateFilterOptionsInput } from '@comitium/schemas/candidate-search';
import { Autocomplete } from '@comitium/ui/autocomplete';
import { Button } from '@comitium/ui/button';
import { InfiniteCollectionStatus } from '@comitium/ui/infinite-collection-status';
import { type ReactNode, useState } from 'react';
import { useQueryCandidateFilterOptions } from '@/hooks/queries/use-query-candidate-filter-options';
import { useCandidateTags } from '@/hooks/use-candidate-tags';
import { useDebounce } from '@/hooks/use-debounce';
import { isDefined } from '@/lib/utils';
import { type Choice, FILTER_LABELS, MAX_FILTER_CHOICES } from './filters';

interface CandidateChoiceSelectProps {
  label: string;
  options: readonly Choice[];
  selected: Choice[];
  onChange: (choices: Choice[]) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  emptyMessage?: ReactNode;
  listFooter?: ReactNode;
}

interface TagOptionsProps {
  orgId: string;
  selected: Choice[];
  onChange: (choices: Choice[]) => void;
}

interface ServerOptionsProps extends TagOptionsProps {
  field: CandidateFilterOptionsInput['field'];
  jobId?: string;
  disabled?: boolean;
}

export function CandidateChoiceSelect({
  label,
  options,
  selected,
  onChange,
  disabled,
  open,
  onOpenChange,
  search,
  onSearchChange,
  emptyMessage,
  listFooter,
}: CandidateChoiceSelectProps) {
  const choices = new Map([...selected, ...options].map((choice) => [choice.id, choice]));
  const selectedIds = selected.map((choice) => choice.id);
  const atLimit = selected.length >= MAX_FILTER_CHOICES;

  return (
    <Autocomplete
      ariaLabel={label}
      placeholder="Any"
      searchPlaceholder="Search..."
      clearLabel={`Clear ${label}`}
      options={Array.from(choices.values(), (choice) => ({
        value: choice.id,
        label: choice.label,
        disabled: atLimit && !selectedIds.includes(choice.id),
      }))}
      value={selectedIds}
      onValueChange={(ids) => onChange(ids.map((id) => choices.get(id)).filter(isDefined))}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange}
      inputValue={search}
      onInputValueChange={onSearchChange}
      emptyMessage={emptyMessage}
      listFooter={listFooter}
    />
  );
}

export function TagOptions({ orgId, selected, onChange }: TagOptionsProps) {
  const tags = useCandidateTags(orgId);
  let emptyMessage = 'No tags found.';

  if (tags.isLoading) {
    emptyMessage = 'Loading tags...';
  } else if (tags.error) {
    emptyMessage = 'Could not load tags.';
  }

  return (
    <CandidateChoiceSelect
      label="Tags"
      options={tags.tags}
      selected={selected}
      onChange={onChange}
      emptyMessage={emptyMessage}
    />
  );
}

export function ServerOptions({ orgId, field, jobId, selected, onChange, disabled }: ServerOptionsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 200);
  const query = useQueryCandidateFilterOptions(orgId, { field, search: debounced, jobId }, open && !disabled);
  const options = query.data?.pages.flatMap((page) => page.data) ?? [];
  const loading = query.isPending || search !== debounced;
  const failed = query.isError && !query.data;

  function loadMore() {
    if (!open || !query.hasNextPage || query.isFetching) {
      return;
    }

    void query.fetchNextPage({ cancelRefetch: false });
  }

  return (
    <CandidateChoiceSelect
      label={FILTER_LABELS[field]}
      options={options}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      search={search}
      onSearchChange={setSearch}
      emptyMessage={loading ? 'Loading...' : 'No options found.'}
      listFooter={
        failed ? (
          <div role="alert" className="flex items-center justify-between gap-2 p-3 text-sm text-muted-foreground">
            Could not load options.
            <Button type="button" variant="outline" size="xs" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <InfiniteCollectionStatus
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            isFetchNextPageError={query.isFetchNextPageError}
            loadingLabel="Loading options..."
            errorLabel="Could not load more options."
            onLoadMore={loadMore}
          />
        )
      }
    />
  );
}
