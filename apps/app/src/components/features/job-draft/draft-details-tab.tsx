import {
  CATEGORIES,
  COMPENSATION_CURRENCIES,
  CURRENCIES,
  EMPLOYMENT_TYPES,
  SALARY_PERIODS,
} from '@comitium/schemas/job-enums';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@comitium/ui/input-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import { useCallback } from 'react';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { useQueryOrgDepartments, useQueryOrgLocations } from '@/hooks/queries/use-query-org-structure';
import type { DraftFormData } from '@/lib/schemas/draft-form';
import { cn, isDefined } from '@/lib/utils';

interface DraftDetailsTabProps {
  orgId: string;
  form: UseFormReturn<DraftFormData>;
  showPublishRequiredMarkers?: boolean;
  editableStructure?: boolean;
}

export function DraftDetailsTab({
  orgId,
  form,
  showPublishRequiredMarkers = true,
  editableStructure = true,
}: DraftDetailsTabProps) {
  const { control, setValue } = form;
  const { data: departmentsData } = useQueryOrgDepartments(orgId);
  const { data: locationsData } = useQueryOrgLocations(orgId);
  const departments = departmentsData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const currency = useWatch({ control, name: 'compensationCurrency' });
  const currencySymbol = CURRENCIES.find((item) => item.value === currency)?.symbol ?? '$';

  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.name,
  }));

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.candidateFacingName ?? location.name,
  }));

  const handleDepartmentChange = useCallback(
    (value: string) => {
      if (value) {
        setValue('departmentId', value, { shouldDirty: true });
      }
    },
    [setValue],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      const location = locations.find((item) => item.id === value);

      if (!location) {
        return;
      }

      setValue('locationId', location.id, { shouldDirty: true });
      setValue('locationType', location.locationType, { shouldDirty: true });

      if (location.cityId) {
        setValue('location', [{ name: location.candidateFacingName ?? location.name, cityId: location.cityId }], {
          shouldDirty: true,
        });
      }
    },
    [locations, setValue],
  );

  const handleEmploymentTypeChange = useCallback(
    (value: string) => {
      if (value) {
        setValue('employmentType', value as DraftFormData['employmentType']);
      }
    },
    [setValue],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-1">
                  Title <RequiredMarker show />
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Senior Frontend Developer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {editableStructure && (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="gap-1">
                      Team <RequiredMarker show={showPublishRequiredMarkers} />
                    </FormLabel>
                    <Select onValueChange={handleDepartmentChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {departmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="gap-1">
                      Location <RequiredMarker show={showPublishRequiredMarkers} />
                    </FormLabel>
                    <Select onValueChange={handleLocationChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {locationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <SelectField
              control={control}
              name="category"
              label="Category"
              placeholder="Select category"
              options={CATEGORIES}
              required={showPublishRequiredMarkers}
            />
          </div>

          <FormField
            control={control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-1">
                  Employment type <RequiredMarker show={showPublishRequiredMarkers} />
                </FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value ?? ''}
                    onValueChange={handleEmploymentTypeChange}
                    variant="outline"
                    className="w-fit"
                  >
                    {EMPLOYMENT_TYPES.map((option) => (
                      <ToggleGroupItem key={option.value} value={option.value} className="px-4">
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gap-1">
            Compensation <RequiredMarker show={showPublishRequiredMarkers} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-start gap-x-2 gap-y-3">
            <AmountField
              control={control}
              name="compensationMin"
              ariaLabel="Minimum compensation"
              placeholder="50,000"
              currencySymbol={currencySymbol}
            />
            <RangeConnector>to</RangeConnector>
            <AmountField
              control={control}
              name="compensationMax"
              ariaLabel="Maximum compensation"
              placeholder="80,000"
              currencySymbol={currencySymbol}
            />
            <CompactSelectField
              control={control}
              name="compensationCurrency"
              ariaLabel="Currency"
              placeholder="USD ($)"
              options={COMPENSATION_CURRENCIES}
              displayOptions={CURRENCIES}
              className="w-32"
            />
            <RangeConnector>per</RangeConnector>
            <CompactSelectField
              control={control}
              name="compensationPeriod"
              ariaLabel="Period"
              placeholder="Year"
              options={SALARY_PERIODS}
              className="w-28"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function parseIntegerInput(value: string): number | undefined {
  const digits = value.replace(/\D/g, '');

  return digits ? Number.parseInt(digits, 10) : undefined;
}

function formatThousands(value?: number): string {
  if (!isDefined(value)) {
    return '';
  }

  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function RequiredMarker({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return <span className="text-destructive">*</span>;
}

function RangeConnector({ children }: { children: string }) {
  return <span className="flex h-9 items-center text-sm text-muted-foreground">{children}</span>;
}

interface AmountFieldProps {
  control: UseFormReturn<DraftFormData>['control'];
  name: 'compensationMin' | 'compensationMax';
  ariaLabel: string;
  placeholder: string;
  currencySymbol: string;
}

function AmountField({ control, name, ariaLabel, placeholder, currencySymbol }: AmountFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, onChange, ref } }) => {
        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange(parseIntegerInput(event.target.value));
        };

        return (
          <FormItem className="w-36">
            <FormControl>
              <InputGroup>
                <InputGroupAddon align="inline-start">{currencySymbol}</InputGroupAddon>
                <InputGroupInput
                  ref={ref}
                  type="text"
                  inputMode="numeric"
                  aria-label={ariaLabel}
                  placeholder={placeholder}
                  value={formatThousands(value)}
                  onChange={handleInputChange}
                />
              </InputGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

interface SelectFieldProps {
  control: UseFormReturn<DraftFormData>['control'];
  name: 'category';
  label: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
}

function SelectField({ control, name, label, placeholder, options, required }: SelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn({ 'gap-1': required })}>
            {label}
            <RequiredMarker show={required ?? false} />
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ''}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface CompactSelectFieldProps {
  control: UseFormReturn<DraftFormData>['control'];
  name: 'compensationCurrency' | 'compensationPeriod';
  ariaLabel: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  displayOptions?: readonly { value: string; label: string }[];
  className?: string;
}

function CompactSelectField({
  control,
  name,
  ariaLabel,
  placeholder,
  options,
  displayOptions = options,
  className,
}: CompactSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedLabel = displayOptions.find((option) => option.value === field.value)?.label;

        return (
          <FormItem className={className}>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="w-full" aria-label={ariaLabel}>
                  <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
