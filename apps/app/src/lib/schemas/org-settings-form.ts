import { httpsUrlSchema } from '@comitium/schemas/common';
import { CAREERS_SLUG_REGEX } from '@comitium/schemas/patterns';
import { z } from 'zod';
import { CAREERS_SLUG_MAX_LENGTH, isReservedCareersSlug } from '@/lib/careers/slugs';

const ORG_PROFILE_NAME_MAX_LENGTH = 255;
const ORG_PROFILE_DESCRIPTION_MAX_LENGTH = 1000;
const ORG_PROFILE_WEBSITE_MAX_LENGTH = 255;

const URL_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (URL_SCHEME_REGEX.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(ORG_PROFILE_NAME_MAX_LENGTH),
  careersSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Careers page address must be at least 3 characters')
    .max(CAREERS_SLUG_MAX_LENGTH)
    .regex(CAREERS_SLUG_REGEX, 'Use lowercase letters, numbers, and hyphens')
    .refine((value) => !isReservedCareersSlug(value), {
      message: 'This careers page address is reserved',
    }),
  description: z.string().trim().max(ORG_PROFILE_DESCRIPTION_MAX_LENGTH),
  website: z
    .string()
    .transform(normalizeWebsiteUrl)
    .pipe(
      z.union([z.literal(''), httpsUrlSchema.max(ORG_PROFILE_WEBSITE_MAX_LENGTH)], {
        error: 'Please enter a valid HTTPS URL',
      }),
    ),
});

export type OrgSettingsFormData = z.infer<typeof orgSettingsSchema>;
