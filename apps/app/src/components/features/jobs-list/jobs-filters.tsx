import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Combobox } from '@comitium/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { ArrowCounterClockwiseIcon, FunnelIcon } from '@phosphor-icons/react';

const ALL_FILTER_VALUE = 'all';

interface FilterOption {
  id: string;
  name: string;
}

interface JobsFiltersProps {
  departments: FilterOption[];
  locations: FilterOption[];
  departmentId?: string;
  locationId?: string;
  activeCount: number;
  onDepartmentChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onClear: () => void;
}

export function JobsFilters({
  departments,
  locations,
  departmentId,
  locationId,
  activeCount,
  onDepartmentChange,
  onLocationChange,
  onClear,
}: JobsFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FunnelIcon data-icon="inline-start" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 min-w-4 justify-center px-1 tabular-nums">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-label-12 text-muted-foreground">Department</span>
          <Combobox
            size="sm"
            ariaLabel="Department"
            options={[
              { value: ALL_FILTER_VALUE, label: 'All departments' },
              ...departments.map((department) => ({ value: department.id, label: department.name })),
            ]}
            value={departmentId ?? ALL_FILTER_VALUE}
            clearable={false}
            onValueChange={(nextValue) => nextValue && onDepartmentChange(nextValue)}
            placeholder="All departments"
            searchPlaceholder="Search departments…"
            emptyMessage="No departments found."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-12 text-muted-foreground">Location</span>
          <Combobox
            size="sm"
            ariaLabel="Location"
            options={[
              { value: ALL_FILTER_VALUE, label: 'All locations' },
              ...locations.map((location) => ({ value: location.id, label: location.name })),
            ]}
            value={locationId ?? ALL_FILTER_VALUE}
            clearable={false}
            onValueChange={(nextValue) => nextValue && onLocationChange(nextValue)}
            placeholder="All locations"
            searchPlaceholder="Search locations…"
            emptyMessage="No locations found."
          />
        </div>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="justify-start gap-1.5 text-muted-foreground" onClick={onClear}>
            <ArrowCounterClockwiseIcon data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
