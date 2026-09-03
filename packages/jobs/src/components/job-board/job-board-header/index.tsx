import { useCallback } from 'react';
import type { PublicJobsApi } from '../../../api';

import { FiltersPopover } from './filters-popover';
import { LocationInput } from './location-input';
import { SearchInput } from './search-input';
import type { JobBoardFilters } from './types';

export type { JobBoardFilters } from './types';

interface JobBoardHeaderProps {
  api: PublicJobsApi;
  filters: JobBoardFilters;
  onFiltersChange: (filters: JobBoardFilters) => void;
}

export function JobBoardHeader({ api, filters, onFiltersChange }: JobBoardHeaderProps) {
  const handleSearchChange = useCallback(
    (value: string | null) => {
      onFiltersChange({ ...filters, search: value ?? undefined });
    },
    [filters, onFiltersChange],
  );

  const handleLocationChange = useCallback(
    (value: string | null) => {
      onFiltersChange({ ...filters, location: value ?? undefined });
    },
    [filters, onFiltersChange],
  );

  return (
    <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-4 after:translate-y-full after:bg-gradient-to-b after:from-background/90 after:to-background/0 supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-2 px-4 pt-4 pb-1 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={filters.search} onChange={handleSearchChange} />
          <LocationInput api={api} value={filters.location} onChange={handleLocationChange} />
          <FiltersPopover filters={filters} onFiltersChange={onFiltersChange} />
        </div>
      </div>
    </div>
  );
}
