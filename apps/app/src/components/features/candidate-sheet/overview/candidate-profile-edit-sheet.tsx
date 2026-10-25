import type { PublicEncryptionKey, VaultKeyAccess } from '@comitium/crypto';
import {
  type CandidateProfile,
  type CandidateProfileValues,
  createCandidateProfile,
  editCandidateProfile,
  formatCandidateLocation,
  normalizeCandidateProfileUrl,
} from '@comitium/schemas/candidates';
import { candidateLocationValueSchema } from '@comitium/schemas/forms/field-types/candidate-location';
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
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateCandidateProfile } from '@/hooks/mutations/use-update-candidate-profile';
import { searchCities } from '@/lib/api/cities';
import { cn } from '@/lib/utils';

const optionalProfileFieldSchema = z.string().trim().max(500, 'Use 500 characters or fewer');

const optionalProfileUrlSchema = optionalProfileFieldSchema.transform((value, ctx) => {
  try {
    return normalizeCandidateProfileUrl(value) ?? '';
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Enter an HTTP(S) URL' });

    return z.NEVER;
  }
});

const candidateProfileFormSchema = z.object({
  firstName: optionalProfileFieldSchema,
  lastName: optionalProfileFieldSchema,
  email: optionalProfileFieldSchema.pipe(z.union([z.literal(''), z.email()])),
  phone: optionalProfileFieldSchema,
  location: candidateLocationValueSchema.nullable(),
  currentTitle: optionalProfileFieldSchema,
  currentCompany: optionalProfileFieldSchema,
  linkedIn: optionalProfileUrlSchema,
  github: optionalProfileUrlSchema,
  website: optionalProfileUrlSchema,
});

type CandidateProfileFormValues = z.infer<typeof candidateProfileFormSchema>;
type CandidateProfileFieldName = Exclude<keyof CandidateProfileFormValues, 'location'>;

interface CandidateProfileField {
  name: CandidateProfileFieldName;
  label: string;
  placeholder: string;
  type?: 'email' | 'tel' | 'url';
  autoComplete?: string;
  fullWidth?: boolean;
}

const PROFILE_FIELDS: CandidateProfileField[] = [
  { name: 'firstName', label: 'First name', placeholder: 'First name', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', placeholder: 'Last name', autoComplete: 'family-name' },
  { name: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone', placeholder: 'Phone number', type: 'tel', autoComplete: 'tel' },
  { name: 'currentTitle', label: 'Current title', placeholder: 'Role or title' },
  { name: 'currentCompany', label: 'Current company', placeholder: 'Company name' },
  {
    name: 'linkedIn',
    label: 'LinkedIn URL',
    placeholder: 'https://linkedin.com/in/...',
    type: 'url',
    fullWidth: true,
  },
  {
    name: 'github',
    label: 'GitHub URL',
    placeholder: 'https://github.com/...',
    type: 'url',
    fullWidth: true,
  },
  { name: 'website', label: 'Website', placeholder: 'https://example.com', type: 'url', fullWidth: true },
];

const EMPTY_PROFILE_FORM: CandidateProfileFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: null,
  currentTitle: '',
  currentCompany: '',
  linkedIn: '',
  github: '',
  website: '',
};

interface CandidateProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  orgId: string;
  profile: CandidateProfile | null;
  profileRevision: number | null;
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
  vaultAccess: VaultKeyAccess;
}

const FORM_ID = 'candidate-profile-edit-form';

export function CandidateProfileEditSheet({
  open,
  onOpenChange,
  candidateId,
  orgId,
  profile,
  profileRevision,
  vaultPublicKey,
  vaultKeyVersion,
  vaultAccess,
}: CandidateProfileEditSheetProps) {
  const { mutateAsync: updateProfile, isPending } = useUpdateCandidateProfile();
  const wasOpen = useRef(false);
  const baseline = useRef({ profile, profileRevision });
  const form = useForm<CandidateProfileFormValues>({
    resolver: zodResolver(candidateProfileFormSchema),
    defaultValues: toProfileFormValues(profile),
  });

  useEffect(() => {
    if (open && !wasOpen.current) {
      baseline.current = { profile, profileRevision };
      form.reset(toProfileFormValues(profile));
    }

    wasOpen.current = open;
  }, [form, open, profile, profileRevision]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [isPending, onOpenChange],
  );

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);
  const handleSubmit = useCallback(
    async (values: CandidateProfileFormValues) => {
      if (baseline.current.profileRevision === null) {
        return;
      }

      const nextValues = toCandidateProfile(values);

      await updateProfile({
        candidateId,
        orgId,
        profile: baseline.current.profile
          ? editCandidateProfile(baseline.current.profile, nextValues)
          : createCandidateProfile(nextValues),
        expectedProfileRevision: baseline.current.profileRevision,
        vaultPublicKey,
        vaultKeyVersion,
        vaultAccess,
      });

      onOpenChange(false);
    },
    [candidateId, onOpenChange, orgId, updateProfile, vaultKeyVersion, vaultPublicKey, vaultAccess],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent size="form">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Edit candidate profile</SheetTitle>
          <SheetDescription>Update candidate-wide contact and profile details.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form
              noValidate
              id={FORM_ID}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {PROFILE_FIELDS.map((profileField) => (
                <FormField
                  key={profileField.name}
                  control={form.control}
                  name={profileField.name}
                  render={({ field }) => (
                    <FormItem className={cn(profileField.fullWidth && 'sm:col-span-2')}>
                      <FormLabel>{profileField.label}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={profileField.type}
                          autoComplete={profileField.autoComplete}
                          placeholder={profileField.placeholder}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <CitySearchInput
                        searchCities={searchCities}
                        value={formatCandidateLocation(field.value) ?? ''}
                        onCitySelect={(city) =>
                          field.onChange({
                            cityId: city.id,
                            city: city.name,
                            ...(city.admin1 ? { region: city.admin1 } : {}),
                            country: city.countryCode,
                          })
                        }
                        onTextChange={() => field.onChange(null)}
                        onBlur={field.onBlur}
                        name={field.name}
                        inputRef={field.ref}
                        placeholder="Search city..."
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </FeatureSheetBody>

        <FeatureSheetFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </FeatureSheetFooter>
      </FeatureSheetContent>
    </Sheet>
  );
}

function toProfileFormValues(profile: CandidateProfile | null): CandidateProfileFormValues {
  if (!profile) {
    return { ...EMPTY_PROFILE_FORM };
  }

  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    location: profile.location,
    currentTitle: profile.currentTitle ?? '',
    currentCompany: profile.currentCompany ?? '',
    linkedIn: profile.linkedIn ?? '',
    github: profile.github ?? '',
    website: profile.website ?? '',
  };
}

function toCandidateProfile(values: CandidateProfileFormValues): CandidateProfileValues {
  return {
    firstName: normalizeProfileField(values.firstName),
    lastName: normalizeProfileField(values.lastName),
    email: normalizeProfileField(values.email),
    phone: normalizeProfileField(values.phone),
    location: values.location,
    currentTitle: normalizeProfileField(values.currentTitle),
    currentCompany: normalizeProfileField(values.currentCompany),
    linkedIn: normalizeProfileField(values.linkedIn),
    github: normalizeProfileField(values.github),
    website: normalizeProfileField(values.website),
  };
}

function normalizeProfileField(value: string): string | null {
  const normalized = value.trim();

  return normalized || null;
}
