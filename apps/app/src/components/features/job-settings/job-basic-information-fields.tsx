import { CATEGORIES, EMPLOYMENT_TYPES } from '@comitium/schemas/job-enums';
import { Combobox } from '@comitium/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import type { UseFormReturn } from 'react-hook-form';
import { useQueryOrgDepartments, useQueryOrgLocations } from '@/hooks/queries/use-query-org-structure';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { RequiredMarker } from './required-marker';

interface JobBasicInformationFieldsProps {
  orgId: string;
  form: UseFormReturn<JobSettingsFormData>;
  showPublishRequiredMarkers?: boolean;
  editableStructure?: boolean;
  readOnly?: boolean;
}

export function JobBasicInformationFields({
  orgId,
  form,
  showPublishRequiredMarkers = true,
  editableStructure = true,
  readOnly = false,
}: JobBasicInformationFieldsProps) {
  const { control, setValue } = form;
  const { data: departmentsData } = useQueryOrgDepartments(orgId);
  const { data: locationsData } = useQueryOrgLocations(orgId);
  const departments = departmentsData?.data ?? [];
  const locations = locationsData?.data ?? [];

  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.name,
  }));

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.candidateFacingName ?? location.name,
  }));

  const handleDepartmentChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setValue('departmentId', value, { shouldDirty: true });
  };

  const handleLocationChange = (value: string | null) => {
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
  };

  const handleEmploymentTypeChange = (value: string) => {
    if (!value) {
      return;
    }

    setValue('employmentType', value as JobSettingsFormData['employmentType'], { shouldDirty: true });
  };

  return (
    <fieldset aria-label="Basic information" disabled={readOnly}>
      <div className="flex flex-col gap-5">
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

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <FormField
            control={control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="gap-1">
                  Team <RequiredMarker show={showPublishRequiredMarkers} />
                </FormLabel>
                <FormControl>
                  <Combobox
                    ariaLabel="Team"
                    options={departmentOptions}
                    value={field.value ?? null}
                    clearable={false}
                    onValueChange={handleDepartmentChange}
                    placeholder="Select team"
                    searchPlaceholder="Search teams…"
                    emptyMessage="No teams found."
                    disabled={!editableStructure || readOnly}
                  />
                </FormControl>
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
                <FormControl>
                  <Combobox
                    ariaLabel="Location"
                    options={locationOptions}
                    value={field.value ?? null}
                    clearable={false}
                    onValueChange={handleLocationChange}
                    placeholder="Select location"
                    searchPlaceholder="Search locations…"
                    emptyMessage="No locations found."
                    disabled={!editableStructure || readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          <CategoryField control={control} required={showPublishRequiredMarkers} />
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
                  className="w-full flex-wrap sm:w-fit"
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
      </div>
    </fieldset>
  );
}

function CategoryField({
  control,
  required,
}: {
  control: UseFormReturn<JobSettingsFormData>['control'];
  required: boolean;
}) {
  return (
    <FormField
      control={control}
      name="category"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="gap-1">
            Category <RequiredMarker show={required} />
          </FormLabel>
          <FormControl>
            <Combobox
              ariaLabel="Category"
              options={[...CATEGORIES]}
              value={field.value ?? null}
              onValueChange={field.onChange}
              placeholder="Select category"
              searchPlaceholder="Search category…"
              emptyMessage="No category options found."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
