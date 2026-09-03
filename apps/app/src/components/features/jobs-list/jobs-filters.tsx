import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
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
          <Select value={departmentId ?? ALL_FILTER_VALUE} onValueChange={onDepartmentChange}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-12 text-muted-foreground">Location</span>
          <Select value={locationId ?? ALL_FILTER_VALUE} onValueChange={onLocationChange}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
