import type { PublicEncryptionKey } from '@comitium/crypto';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { httpsUrlSchema } from '@comitium/schemas/common';
import { Button } from '@comitium/ui/button';
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
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateCandidateProfile } from '@/hooks/mutations/use-update-candidate-profile';
import { cn } from '@/lib/utils';

const optionalProfileFieldSchema = z.string().trim().max(500, 'Use 500 characters or fewer');
const optionalProfileUrlSchema = optionalProfileFieldSchema.pipe(
  z.union([z.literal(''), httpsUrlSchema], { error: 'Enter an HTTPS URL' }),
);

const candidateProfileFormSchema = z.object({
  firstName: optionalProfileFieldSchema,
  lastName: optionalProfileFieldSchema,
  email: optionalProfileFieldSchema,
  phone: optionalProfileFieldSchema,
  location: optionalProfileFieldSchema,
  currentTitle: optionalProfileFieldSchema,
  currentCompany: optionalProfileFieldSchema,
  linkedIn: optionalProfileUrlSchema,
  github: optionalProfileUrlSchema,
  website: optionalProfileUrlSchema,
});

type CandidateProfileFormValues = z.infer<typeof candidateProfileFormSchema>;
type CandidateProfileFieldName = keyof CandidateProfileFormValues;

interface CandidateProfileField {
  name: CandidateProfileFieldName;
  label: string;
  type?: 'email' | 'tel' | 'url';
  autoComplete?: string;
  fullWidth?: boolean;
}

const PROFILE_FIELDS: CandidateProfileField[] = [
  { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { name: 'location', label: 'Location', autoComplete: 'address-level2', fullWidth: true },
  { name: 'currentTitle', label: 'Current title' },
  { name: 'currentCompany', label: 'Current company' },
  { name: 'linkedIn', label: 'LinkedIn URL', type: 'url', fullWidth: true },
  { name: 'github', label: 'GitHub URL', type: 'url', fullWidth: true },
  { name: 'website', label: 'Website', type: 'url', fullWidth: true },
];

const EMPTY_PROFILE_FORM: CandidateProfileFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
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
  vaultPublicKey: PublicEncryptionKey;
  vaultKeyVersion: number;
}

const FORM_ID = 'candidate-profile-edit-form';

export function CandidateProfileEditSheet({
  open,
  onOpenChange,
  candidateId,
  orgId,
  profile,
  vaultPublicKey,
  vaultKeyVersion,
}: CandidateProfileEditSheetProps) {
  const { mutateAsync: updateProfile, isPending } = useUpdateCandidateProfile();
  const form = useForm<CandidateProfileFormValues>({
    resolver: zodResolver(candidateProfileFormSchema),
    defaultValues: toProfileFormValues(profile),
  });

  useEffect(() => {
    if (open) {
      form.reset(toProfileFormValues(profile));
    }
  }, [form, open, profile]);

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
      await updateProfile({
        candidateId,
        orgId,
        profile: toCandidateProfile(values),
        vaultPublicKey,
        vaultKeyVersion,
      });

      onOpenChange(false);
    },
    [candidateId, onOpenChange, orgId, updateProfile, vaultKeyVersion, vaultPublicKey],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent width="fixed-640">
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Edit candidate profile</SheetTitle>
          <SheetDescription>Update candidate-wide contact and profile details.</SheetDescription>
        </FeatureSheetHeader>

        <FeatureSheetBody>
          <Form {...form}>
            <form
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
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
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
    location: profile.location ?? '',
    currentTitle: profile.currentTitle ?? '',
    currentCompany: profile.currentCompany ?? '',
    linkedIn: profile.linkedIn ?? '',
    github: profile.github ?? '',
    website: profile.website ?? '',
  };
}

function toCandidateProfile(values: CandidateProfileFormValues): CandidateProfile {
  return {
    firstName: normalizeProfileField(values.firstName),
    lastName: normalizeProfileField(values.lastName),
    email: normalizeProfileField(values.email),
    phone: normalizeProfileField(values.phone),
    location: normalizeProfileField(values.location),
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
