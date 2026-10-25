import { z } from 'zod';
import type { CandidateProfileSearchField } from './candidate-profile-search-hash';
import { URL_SCHEME_REGEX } from './patterns';
import { CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION, type CandidateProfileSearchProjection } from './schemas/search';

export const CANDIDATE_PROFILE_MAPPINGS = {
  first_name: { profileField: 'firstName', questionType: 'short_answer', label: 'First name', managed: true },
  last_name: { profileField: 'lastName', questionType: 'short_answer', label: 'Last name', managed: true },
  phone: { profileField: 'phone', questionType: 'phone', label: 'Phone', managed: false },
  linkedin: { profileField: 'linkedIn', questionType: 'url', label: 'LinkedIn', managed: false },
  github: { profileField: 'github', questionType: 'url', label: 'GitHub', managed: false },
  website: { profileField: 'website', questionType: 'url', label: 'Website', managed: false },
  current_title: { profileField: 'currentTitle', questionType: 'short_answer', label: 'Current title', managed: false },
  current_company: {
    profileField: 'currentCompany',
    questionType: 'short_answer',
    label: 'Current company',
    managed: false,
  },
} as const satisfies Record<
  string,
  {
    profileField: Exclude<keyof CandidateProfileValues, 'location' | 'email'>;
    questionType: string;
    label: string;
    managed: boolean;
  }
>;

export type CandidateProfileMappingField = keyof typeof CANDIDATE_PROFILE_MAPPINGS;

export const CANDIDATE_PROFILE_MAPPING_FIELDS = Object.keys(
  CANDIDATE_PROFILE_MAPPINGS,
) as CandidateProfileMappingField[];

export function profileMappingError(
  question: {
    questionType: string;
    isPrivate?: boolean;
    visibility?: string;
    isLocked?: boolean;
    config?: { candidateProfileField?: CandidateProfileMappingField } | null;
  },
  formClass: string,
): string | null {
  const target = question.config?.candidateProfileField;
  const isPrivate = question.isPrivate || (question.visibility && question.visibility !== 'standard');

  if (question.questionType === 'candidate_location' && isPrivate) {
    return 'Candidate location must have standard visibility';
  }

  if (!target) {
    return null;
  }

  if (formClass !== 'application') {
    return 'Only application questions can map to Candidate profile fields';
  }

  if (isPrivate) {
    return 'Private answers cannot map to Candidate profile fields';
  }

  const mapping = CANDIDATE_PROFILE_MAPPINGS[target];

  if (mapping.managed && !question.isLocked) {
    return 'Candidate name mappings are server-managed';
  }

  return question.questionType === mapping.questionType
    ? null
    : 'Question type is incompatible with the Candidate profile field';
}

export const candidateLocationValueSchema = z
  .object({
    cityId: z.number().int().positive(),
    city: z.string().min(1).max(120),
    region: z.string().min(1).max(120).optional(),
    country: z.string().length(2).toUpperCase(),
  })
  .strict();

export type CandidateLocationValue = z.infer<typeof candidateLocationValueSchema>;

export const candidateProfileValuesSchema = z
  .object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    linkedIn: z.string().nullable(),
    github: z.string().nullable(),
    website: z.string().nullable(),
    location: candidateLocationValueSchema.nullable(),
    currentTitle: z.string().nullable(),
    currentCompany: z.string().nullable(),
  })
  .strict();

export type CandidateProfileValues = z.infer<typeof candidateProfileValuesSchema>;
export const candidateProfileFieldSchema = candidateProfileValuesSchema.keyof();
export const CANDIDATE_PROFILE_FIELDS = candidateProfileFieldSchema.options;

export const candidateProfileSchema = candidateProfileValuesSchema
  .extend({
    manuallyClearedFields: z.array(candidateProfileFieldSchema).max(CANDIDATE_PROFILE_FIELDS.length),
  })
  .strict()
  .superRefine((profile, ctx) => {
    if (new Set(profile.manuallyClearedFields).size !== profile.manuallyClearedFields.length) {
      ctx.addIssue({ code: 'custom', path: ['manuallyClearedFields'], message: 'Duplicate cleared field' });
    }

    for (const field of profile.manuallyClearedFields) {
      if (profile[field] !== null) {
        ctx.addIssue({ code: 'custom', path: ['manuallyClearedFields'], message: 'A cleared field must be null' });
      }
    }
  });

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export async function projectCandidateProfileSearch(
  profile: CandidateProfile,
  hashValue: (field: CandidateProfileSearchField, value: string | number) => Promise<string>,
): Promise<CandidateProfileSearchProjection> {
  const optionalHash = (field: CandidateProfileSearchField, value: string | number | null) =>
    value === null ? Promise.resolve(null) : hashValue(field, value);

  const [contactEmailDigest, locationCityDigest, locationCountryDigest] = await Promise.all([
    optionalHash('email', profile.email),
    optionalHash('cityId', profile.location?.cityId ?? null),
    optionalHash('country', profile.location?.country ?? null),
  ]);

  return {
    version: CANDIDATE_PROFILE_SEARCH_PROJECTION_VERSION,
    contactEmailDigest,
    locationCityDigest,
    locationCountryDigest,
  };
}

export function normalizeCandidateProfileValues(input: CandidateProfileValues): CandidateProfileValues {
  const values = candidateProfileValuesSchema.parse(
    Object.fromEntries(CANDIDATE_PROFILE_FIELDS.map((field) => [field, input[field]])),
  );
  const text = (value: string | null) => value?.trim() || null;

  return {
    firstName: text(values.firstName),
    lastName: text(values.lastName),
    email: text(values.email)?.toLowerCase() ?? null,
    phone: text(values.phone),
    linkedIn: normalizeCandidateProfileUrl(values.linkedIn),
    github: normalizeCandidateProfileUrl(values.github),
    website: normalizeCandidateProfileUrl(values.website),
    location: values.location,
    currentTitle: text(values.currentTitle),
    currentCompany: text(values.currentCompany),
  };
}

export function normalizeCandidateProfileUrl(value: string | null): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const url = new URL(URL_SCHEME_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`);

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Expected an HTTP(S) profile URL');
  }

  return url.href;
}

export function createCandidateProfile(values: CandidateProfileValues): CandidateProfile {
  return { ...normalizeCandidateProfileValues(values), manuallyClearedFields: [] };
}

export function editCandidateProfile(previous: CandidateProfile, input: CandidateProfileValues): CandidateProfile {
  const current = candidateProfileSchema.parse(previous);
  const values = normalizeCandidateProfileValues(input);
  const cleared = new Set(current.manuallyClearedFields);

  for (const field of CANDIDATE_PROFILE_FIELDS) {
    if (values[field] !== null) {
      cleared.delete(field);
    } else if (current[field] !== null) {
      cleared.add(field);
    }
  }

  return candidateProfileSchema.parse({ ...values, manuallyClearedFields: [...cleared] });
}

export function mergeCandidateProfile(
  previous: CandidateProfile,
  input: Partial<CandidateProfileValues>,
): CandidateProfile {
  const current = candidateProfileSchema.parse(previous);
  const { manuallyClearedFields: _, ...previousValues } = current;
  const values = normalizeCandidateProfileValues({ ...previousValues, ...input });
  const merged = { ...current };

  for (const field of CANDIDATE_PROFILE_FIELDS) {
    if (current[field] === null && !current.manuallyClearedFields.includes(field)) {
      Object.assign(merged, { [field]: values[field] });
    }
  }

  return candidateProfileSchema.parse(merged);
}
