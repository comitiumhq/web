import { z } from 'zod';

import { encryptedEnvelopeSchema } from './common';
import { successSchema, uuidSchema } from './public';

export const candidateSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  profile: encryptedEnvelopeSchema.nullable(),
  firstSeenAt: z.string(),
  updatedAt: z.string(),
  identityCount: z.number(),
  applicationCount: z.number(),
});

export type CandidateResponse = z.infer<typeof candidateSchema>;

const candidateApplicationTargetSchema = z.object({
  id: uuidSchema,
  jobOnChainId: z.number().int().nullable(),
  title: z.string().nullable(),
  departmentName: z.string().nullable(),
});

export const candidateApplicationTargetsResponseSchema = z.object({
  data: z.array(candidateApplicationTargetSchema),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const considerCandidateForJobResponseSchema = z.object({
  data: z.object({
    id: uuidSchema,
    jobId: uuidSchema,
    currentStageId: uuidSchema.nullable(),
    appliedAt: z.string().nullable(),
    createdAt: z.string(),
    isResponded: z.boolean(),
  }),
  duplicate: z.boolean(),
});

export type CandidateApplicationTarget = z.infer<typeof candidateApplicationTargetSchema>;
export type CandidateApplicationTargetsResponse = z.infer<typeof candidateApplicationTargetsResponseSchema>;

const candidateIdentityInputSchema = z
  .object({
    type: z.enum(['email', 'phone', 'linkedin', 'github', 'website']),
    value: z.string().trim().min(1).max(500),
  })
  .strict();

export const resolveCandidateResponseSchema = z.object({
  candidateId: uuidSchema,
  resolution: z.enum(['existing', 'new']),
});

const createCandidateFileSchema = z
  .object({
    fileId: uuidSchema,
    kind: z.enum(['resume', 'cover_letter', 'portfolio', 'attachment', 'other']),
    r2Key: z.string().trim().min(1).max(255),
    fileName: z.string().trim().min(1).max(255).optional(),
    mimeType: z.string().trim().min(1).max(120).optional(),
    sizeBytes: z.number().int().min(0).max(2_147_483_647).optional(),
  })
  .strict();

const createCandidateBodySchema = z
  .object({
    candidateId: uuidSchema,
    profile: encryptedEnvelopeSchema,
    identities: z.array(candidateIdentityInputSchema).min(1).max(20),
    origin: z
      .object({
        sourceId: uuidSchema.optional(),
        creditedTo: uuidSchema.optional(),
      })
      .strict()
      .optional(),
    files: z.array(createCandidateFileSchema).max(20),
  })
  .strict();

export const createCandidateResponseSchema = z.object({
  data: candidateSchema.omit({ identityCount: true, applicationCount: true }),
  duplicate: z.boolean(),
  matchedIdentityType: z.enum(['email', 'phone', 'linkedin', 'github', 'website']).nullable(),
});

export type CandidateIdentityInput = z.infer<typeof candidateIdentityInputSchema>;
export type CreateCandidateFile = z.infer<typeof createCandidateFileSchema>;
export type CreateCandidateBody = z.infer<typeof createCandidateBodySchema>;
export type CreateCandidateResponse = z.infer<typeof createCandidateResponseSchema>;

const candidateNoteSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  author: uuidSchema,
  content: encryptedEnvelopeSchema,
  mentions: z.array(z.string()),
  isPrivate: z.boolean(),
  createdAt: z.string(),
});

export const createNoteResponseSchema = z.object({ data: candidateNoteSchema });
export const deleteNoteResponseSchema = z.object({ deleted: z.literal(true) });
export const candidateNotesResponseSchema = z.object({
  data: z.array(candidateNoteSchema),
  total: z.number().int().nonnegative(),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export type CandidateNote = z.infer<typeof candidateNoteSchema>;
export type CandidateNotesResponse = z.infer<typeof candidateNotesResponseSchema>;

// --- Candidate profile (decrypted from vault) ---

export const candidateProfileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  linkedIn: z.string().nullable(),
  github: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  currentTitle: z.string().nullable(),
  currentCompany: z.string().nullable(),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export const candidateProfileUpdateResponseSchema = successSchema;

const candidateFileKindSchema = z.enum(['resume', 'cover_letter', 'portfolio', 'attachment', 'other']);
const candidateFileVisibilitySchema = z.enum(['standard', 'private']);

const candidateFileSchema = z.object({
  id: uuidSchema,
  kind: candidateFileKindSchema,
  visibility: candidateFileVisibilitySchema,
  metadata: encryptedEnvelopeSchema,
  storageSizeBytes: z.number().int().nonnegative().nullable(),
  source: z.enum(['public_apply', 'recruiter_upload', 'email_import', 'api_import', 'provider_import']),
  isCurrentResume: z.boolean(),
  applicationId: uuidSchema.nullable(),
  jobId: z.number().int().nullable(),
  jobTitle: z.string().nullable(),
  appliedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const candidateFilesResponseSchema = z.object({ files: z.array(candidateFileSchema) });

export const candidateFileReservationResponseSchema = z.object({
  fileId: uuidSchema,
  uploadToken: z.string().min(1),
  uploadUrl: z.string().min(1),
  expiresAt: z.string(),
});

export const candidateFileUploadResponseSchema = z.object({
  fileId: uuidSchema,
  status: z.literal('uploaded'),
});

export const candidateFileFinalizeResponseSchema = z.object({ fileId: uuidSchema });

export type CandidateFile = z.infer<typeof candidateFileSchema>;
export type CandidateFileKind = z.infer<typeof candidateFileKindSchema>;
export type CandidateFileVisibility = z.infer<typeof candidateFileVisibilitySchema>;

/** Combine firstName + lastName into a display string. */
export function formatCandidateName(profile?: Pick<CandidateProfile, 'firstName' | 'lastName'> | null): string | null {
  if (!profile) {
    return null;
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  return name || null;
}
