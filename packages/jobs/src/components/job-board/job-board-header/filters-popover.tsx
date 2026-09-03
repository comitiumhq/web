import {
  CATEGORIES,
  type Category,
  EMPLOYMENT_TYPES,
  type EmploymentType,
  LOCATION_TYPES,
  type LocationType,
  PUBLIC_JOB_SORTS,
  type PublicJobSort,
} from '@comitium/schemas/job-enums';
import { Button } from '@comitium/ui/button';
import { Input } from '@comitium/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Separator } from '@comitium/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import { ArrowCounterClockwiseIcon, SlidersHorizontalIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import type { JobBoardFilters } from './types';
import { getAdvancedFilterBadges } from './utils';

interface FiltersPopoverProps {
  filters: JobBoardFilters;
  onFiltersChange: (filters: JobBoardFilters) => void;
}

function getFilterFields(filters: JobBoardFilters) {
  return {
    locationType: filters.locationType,
    employmentType: filters.employmentType,
    category: filters.category,
    salaryMin: filters.salaryMin,
    salaryMax: filters.salaryMax,
    sort: filters.sort ?? 'stake_desc',
  };
}

function getSortSearchValue(sort: PublicJobSort): PublicJobSort | undefined {
  if (sort === 'stake_desc') {
    return undefined;
  }

  return sort;
}

function formatAnnualSalaryInputValue(value?: number): string {
  if (!value) {
    return '';
  }

  return String(value);
}

function parseAnnualSalaryInputValue(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.round(parsed);
}

export function FiltersPopover({ filters, onFiltersChange }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(() => getFilterFields(filters));

  useEffect(() => {
    if (open) {
      setPendingFilters(getFilterFields(filters));
    }
  }, [open, filters]);

  const advancedFilterCount = getAdvancedFilterBadges(filters).length;

  const hasPendingFilters =
    !!pendingFilters.locationType ||
    !!pendingFilters.employmentType ||
    !!pendingFilters.category ||
    !!pendingFilters.salaryMin ||
    !!pendingFilters.salaryMax;

  const handleClear = useCallback(() => {
    onFiltersChange({
      search: filters.search,
      location: filters.location,
      sort: filters.sort,
    });

    setPendingFilters({
      locationType: undefined,
      employmentType: undefined,
      category: undefined,
      salaryMin: undefined,
      salaryMax: undefined,
      sort: filters.sort ?? 'stake_desc',
    });
    setOpen(false);
  }, [filters.location, filters.search, filters.sort, onFiltersChange]);

  const handleApply = useCallback(() => {
    const { sort, ...filterFields } = pendingFilters;

    onFiltersChange({
      search: filters.search,
      location: filters.location,
      ...filterFields,
      sort: getSortSearchValue(sort),
    });

    setOpen(false);
  }, [filters.location, filters.search, onFiltersChange, pendingFilters]);

  const handleLocationTypeChange = useCallback((value: string) => {
    setPendingFilters((current) => ({
      ...current,
      locationType: (value as LocationType) || undefined,
    }));
  }, []);

  const handleEmploymentTypeChange = useCallback((value: string) => {
    setPendingFilters((current) => ({
      ...current,
      employmentType: (value as EmploymentType) || undefined,
    }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setPendingFilters((current) => ({
      ...current,
      category: (value as Category) || undefined,
    }));
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setPendingFilters((current) => ({
      ...current,
      sort: value as PublicJobSort,
    }));
  }, []);

  const handleSalaryMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingFilters((current) => ({
      ...current,
      salaryMin: parseAnnualSalaryInputValue(e.target.value),
    }));
  }, []);

  const handleSalaryMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingFilters((current) => ({
      ...current,
      salaryMax: parseAnnualSalaryInputValue(e.target.value),
    }));
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg" className="size-11" aria-label="Open filters">
          <SlidersHorizontalIcon data-icon="inline-start" />
          {advancedFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-label-12 text-secondary-foreground">
              {advancedFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] max-w-[calc(100vw-2rem)] gap-0 p-1">
        <div className="flex flex-col">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-3">
            <div className="min-w-0">
              <div className="mb-2 text-label-13 font-medium">Sort by</div>
              <Select value={pendingFilters.sort} onValueChange={handleSortChange}>
                <SelectTrigger size="sm" className="w-full min-w-0 justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_JOB_SORTS.map((sort) => (
                    <SelectItem key={sort.value} value={sort.value}>
                      {sort.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0">
              <div className="mb-2 text-label-13 font-medium">Category</div>
              <Select value={pendingFilters.category || ''} onValueChange={handleCategoryChange}>
                <SelectTrigger size="sm" className="w-full min-w-0 justify-between">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="px-3 py-3">
            <div className="mb-2 text-label-13 font-medium">Location type</div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={1.5}
              value={pendingFilters.locationType ?? ''}
              onValueChange={handleLocationTypeChange}
              className="flex-wrap justify-start"
            >
              {LOCATION_TYPES.map((model) => (
                <ToggleGroupItem key={model.value} value={model.value} className="font-normal">
                  {model.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator className="bg-border/50" />

          <div className="px-3 py-3">
            <div className="mb-2 text-label-13 font-medium">Employment type</div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={1.5}
              value={pendingFilters.employmentType ?? ''}
              onValueChange={handleEmploymentTypeChange}
              className="flex-wrap justify-start"
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <ToggleGroupItem key={type.value} value={type.value} className="font-normal">
                  {type.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator className="bg-border/50" />

          <div className="px-3 py-3">
            <div className="mb-2 text-label-13 font-medium">Annual USD salary range</div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Min USD"
                aria-label="Minimum annual salary in USD"
                className="h-9"
                value={formatAnnualSalaryInputValue(pendingFilters.salaryMin)}
                onChange={handleSalaryMinChange}
              />
              <span className="shrink-0 text-muted-foreground">—</span>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Max USD"
                aria-label="Maximum annual salary in USD"
                className="h-9"
                value={formatAnnualSalaryInputValue(pendingFilters.salaryMax)}
                onChange={handleSalaryMaxChange}
              />
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="flex gap-2 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleClear}
              disabled={advancedFilterCount === 0 && !hasPendingFilters}
            >
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Clear filters
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
