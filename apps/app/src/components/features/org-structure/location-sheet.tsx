import type { City } from '@comitium/schemas/cities';
import { Button } from '@comitium/ui/button';
import { CitySearchInput } from '@comitium/ui/city-search-input';
import {
  FeatureSheetBody,
  FeatureSheetContent,
  FeatureSheetFooter,
  FeatureSheetHeader,
} from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateOrgLocation, useUpdateOrgLocation } from '@/hooks/mutations/use-org-structure';
import { searchCities } from '@/lib/api/cities';
import {
  type CreateOrgLocationBody,
  createOrgLocationBodySchema,
  type OrgLocation,
  type OrgLocationType,
  orgLocationTypeSchema,
  type UpdateOrgLocationBody,
} from '@/lib/schemas/org-structure';
import { isDefined } from '@/lib/utils';

import { LOCATION_TYPE_OPTIONS } from './labels';

type LocationFormData = Omit<CreateOrgLocationBody, 'locationType'> & { locationType: OrgLocationType | '' };

const locationFormSchema = createOrgLocationBodySchema
  .extend({
    locationType: z.union([orgLocationTypeSchema, z.literal('')]),
  })
  .refine((data) => data.locationType !== '', {
    path: ['locationType'],
    message: 'Select a location type',
  })
  .refine((data) => isDefined(data.cityId), {
    path: ['cityId'],
    message: 'Select a city',
  });

interface LocationSheetProps {
  orgId: string;
  location: OrgLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function locationDefaults(location: OrgLocation | null): LocationFormData {
  return {
    name: location?.name ?? '',
    candidateFacingName: location?.candidateFacingName ?? '',
    parentLocationId: location?.parentLocationId ?? null,
    locationType: location?.locationType ?? '',
    cityId: location?.cityId ?? null,
    addressCountry: location?.addressCountry ?? '',
    addressRegion: location?.addressRegion ?? '',
    addressLocality: location?.addressLocality ?? '',
    postalCode: location?.postalCode ?? '',
    streetAddress: location?.streetAddress ?? '',
    sortOrder: location?.sortOrder ?? 0,
  };
}

function locationCityLabel(locality?: string | null, region?: string | null, country?: string | null) {
  return [locality, region, country].filter(Boolean).join(', ');
}

function locationSubmitBody(data: LocationFormData): CreateOrgLocationBody {
  const { locationType, ...body } = data;

  if (!locationType) {
    throw new Error('Location type is required');
  }

  return { ...body, locationType };
}

function locationUpdateBody(data: CreateOrgLocationBody, location: OrgLocation): UpdateOrgLocationBody {
  const body: UpdateOrgLocationBody = { ...data };

  if (body.parentLocationId === location.parentLocationId) {
    body.parentLocationId = undefined;
  }

  return body;
}

export function LocationSheet({ orgId, location, open, onOpenChange }: LocationSheetProps) {
  const createMutation = useCreateOrgLocation();
  const updateMutation = useUpdateOrgLocation();
  const isEdit = location !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: locationDefaults(null),
  });
  const addressLocality = form.watch('addressLocality');
  const addressRegion = form.watch('addressRegion');
  const addressCountry = form.watch('addressCountry');
  const cityInputValue = locationCityLabel(addressLocality, addressRegion, addressCountry);

  useEffect(() => {
    if (open) {
      form.reset(locationDefaults(location));
    }
  }, [form, location, open]);

  const onSubmit = useCallback(
    async (data: LocationFormData) => {
      const body = locationSubmitBody(data);

      if (isEdit && location) {
        await updateMutation.mutateAsync({ orgId, locationId: location.id, body: locationUpdateBody(body, location) });
      } else {
        await createMutation.mutateAsync({ orgId, body });
      }

      onOpenChange(false);
    },
    [createMutation, isEdit, location, onOpenChange, orgId, updateMutation],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        onOpenChange(nextOpen);
      }
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);
  const handleCityTextChange = useCallback(
    (value: string) => {
      form.setValue('cityId', null, { shouldDirty: true, shouldValidate: true });
      form.setValue('addressLocality', value, { shouldDirty: true, shouldValidate: true });
      form.setValue('addressRegion', '', { shouldDirty: true, shouldValidate: true });
      form.setValue('addressCountry', '', { shouldDirty: true, shouldValidate: true });
    },
    [form],
  );
  const handleCitySelect = useCallback(
    (city: City, label: string) => {
      form.setValue('cityId', city.id, { shouldDirty: true, shouldValidate: true });
      form.setValue('addressLocality', city.name, { shouldDirty: true, shouldValidate: true });
      form.setValue('addressRegion', city.admin1 ?? '', { shouldDirty: true, shouldValidate: true });
      form.setValue('addressCountry', city.countryCode, { shouldDirty: true, shouldValidate: true });

      if (!form.getValues('name').trim()) {
        form.setValue('name', label, { shouldDirty: true, shouldValidate: true });
      }
    },
    [form],
  );
  const submitLabel = isEdit ? 'Save' : 'Create location';
  const title = isEdit ? 'Edit location' : 'New location';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="xl">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">{title}</SheetTitle>
          <SheetDescription>Used when creating jobs and shown on public postings and careers filters.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form id="location-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal name</FormLabel>
                      <FormControl>
                        <Input autoFocus placeholder="San Francisco HQ" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="candidateFacingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate-facing name</FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOCATION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <CitySearchInput
                          searchCities={searchCities}
                          value={cityInputValue}
                          onCitySelect={handleCitySelect}
                          onTextChange={handleCityTextChange}
                          placeholder="Search city..."
                          disabled={isPending}
                          name={field.name}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input placeholder="94105" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street address</FormLabel>
                      <FormControl>
                        <Input placeholder="1 Market St" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="location-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving...' : submitLabel}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}
