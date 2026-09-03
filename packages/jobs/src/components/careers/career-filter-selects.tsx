import { EMPLOYMENT_TYPES, type EmploymentType, LOCATION_TYPES, type LocationType } from '@comitium/schemas/job-enums';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@comitium/ui/select';
import { useCallback } from 'react';
import type { PublicJobsApi } from '../../api';
import type { CareerJobsParams } from '../../api/careers';
import { useQueryCareerLocations } from '../../queries/use-query-career-jobs';
import type { CareerDepartment } from '../../schemas/careers';

export type CareerFilters = Pick<CareerJobsParams, 'department' | 'employmentType' | 'location' | 'locationType'>;

interface CareerFilterSelectsProps {
  api: PublicJobsApi;
  orgSlug: string;
  departments: CareerDepartment[];
  filters: CareerFilters;
  onFiltersChange: (filters: CareerFilters) => void;
}

const ALL_FILTER_VALUE = 'all';
const FILTER_TRIGGER_CLASS_NAME = 'h-10 w-full justify-between';

function nullableFilterValue(value: string) {
  if (value === ALL_FILTER_VALUE) {
    return undefined;
  }

  return value;
}

const countClassName = 'ml-auto rounded-4xl bg-muted px-2 py-0.5 text-label-12 text-muted-foreground tabular-nums';

function getDepartmentFilterLabel(departments: CareerDepartment[], value?: string) {
  if (!value) {
    return 'All departments';
  }

  return departments.find((department) => department.slug === value)?.name ?? 'All departments';
}

function getLocationFilterLabel(value?: string) {
  return value ?? 'All locations';
}

function getLocationTypeFilterLabel(value?: LocationType) {
  return LOCATION_TYPES.find((locationType) => locationType.value === value)?.label ?? 'All location types';
}

function getEmploymentTypeFilterLabel(value?: EmploymentType) {
  return EMPLOYMENT_TYPES.find((employmentType) => employmentType.value === value)?.label ?? 'All employment types';
}

export function CareerFilterSelects({ api, orgSlug, departments, filters, onFiltersChange }: CareerFilterSelectsProps) {
  const { data: locations = [] } = useQueryCareerLocations(api, orgSlug);

  const handleDepartmentChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, department: nullableFilterValue(value) });
    },
    [filters, onFiltersChange],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, location: nullableFilterValue(value) });
    },
    [filters, onFiltersChange],
  );

  const handleLocationTypeChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, locationType: nullableFilterValue(value) as LocationType | undefined });
    },
    [filters, onFiltersChange],
  );

  const handleEmploymentTypeChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, employmentType: nullableFilterValue(value) as EmploymentType | undefined });
    },
    [filters, onFiltersChange],
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Select value={filters.department ?? ALL_FILTER_VALUE} onValueChange={handleDepartmentChange}>
        <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME} aria-label="Department">
          <span className="truncate">{getDepartmentFilterLabel(departments, filters.department)}</span>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ALL_FILTER_VALUE}>All departments</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department.id} value={department.slug} textValue={department.name}>
              <span className="flex w-full items-center gap-3">
                <span className="truncate">{department.name}</span>
                <span className={countClassName} aria-hidden="true">
                  {department.count}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.location ?? ALL_FILTER_VALUE} onValueChange={handleLocationChange}>
        <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME} aria-label="Location">
          <span className="truncate">{getLocationFilterLabel(filters.location)}</span>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ALL_FILTER_VALUE}>All locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.name} value={location.name}>
              {location.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.locationType ?? ALL_FILTER_VALUE} onValueChange={handleLocationTypeChange}>
        <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME} aria-label="Location type">
          <span className="truncate">{getLocationTypeFilterLabel(filters.locationType)}</span>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ALL_FILTER_VALUE}>All location types</SelectItem>
          {LOCATION_TYPES.map((locationType) => (
            <SelectItem key={locationType.value} value={locationType.value}>
              {locationType.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.employmentType ?? ALL_FILTER_VALUE} onValueChange={handleEmploymentTypeChange}>
        <SelectTrigger className={FILTER_TRIGGER_CLASS_NAME} aria-label="Employment type">
          <span className="truncate">{getEmploymentTypeFilterLabel(filters.employmentType)}</span>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ALL_FILTER_VALUE}>All employment types</SelectItem>
          {EMPLOYMENT_TYPES.map((employmentType) => (
            <SelectItem key={employmentType.value} value={employmentType.value}>
              {employmentType.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
