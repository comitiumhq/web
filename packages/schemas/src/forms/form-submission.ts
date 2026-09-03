import { encryptedEnvelopeSchema } from '@comitium/crypto/schemas';
import { z } from 'zod';
import { uuidSchema } from './contract-primitives';
import { formSectionRowSchema, formSnapshotQuestionSchema } from './form-definitions';

export const formSnapshotSchema = z.object({
  v: z.literal(1),
  formId: uuidSchema,
  formClass: z.string(),
  title: z.string(),
  capturedAt: z.string(),
  sections: z.array(
    formSectionRowSchema.pick({ id: true, position: true, title: true }).extend({
      questions: z.array(formSnapshotQuestionSchema),
    }),
  ),
});

export type FormDefinitionSnapshot = z.infer<typeof formSnapshotSchema>;

const fieldValueIdentitySchema = z.object({
  questionId: uuidSchema,
  reusableFieldId: uuidSchema,
  ordinal: z.number().int().nonnegative(),
});

export const formSubmissionFieldValueSchema = z.discriminatedUnion('kind', [
  fieldValueIdentitySchema.extend({ kind: z.literal('boolean'), value: z.boolean() }),
  fieldValueIdentitySchema.extend({ kind: z.literal('option'), value: z.string() }),
  fieldValueIdentitySchema.extend({ kind: z.literal('number'), value: z.string() }),
  fieldValueIdentitySchema.extend({ kind: z.literal('timestamp'), value: z.string() }),
]);

export type FormSubmissionFieldValue = z.infer<typeof formSubmissionFieldValueSchema>;

export const answerEnvelopeSchema = z.object({
  visibility: z.enum(['standard', 'private']),
  answers: encryptedEnvelopeSchema,
});

const candidateIdentityInputSchema = z
  .object({
    applicationId: uuidSchema,
    questionId: uuidSchema,
    envelope: encryptedEnvelopeSchema.refine(
      (envelope) => envelope.purpose === 'candidate_identity_input' && envelope.ct.length <= 500_000,
      'Expected candidate identity input envelope',
    ),
  })
  .strict();

export type CandidateIdentityInput = z.infer<typeof candidateIdentityInputSchema>;

const candidateIdentityInputsSchema = z
  .array(candidateIdentityInputSchema)
  .max(10)
  .superRefine((identities, context) => {
    const questionIds = new Set(identities.map((identity) => identity.questionId));

    if (questionIds.size !== identities.length) {
      context.addIssue({ code: 'custom', message: 'Candidate identity question IDs must be unique' });
    }
  });

const formSubmissionFileSchema = z.object({
  fileId: uuidSchema,
  questionId: uuidSchema,
  metadata: encryptedEnvelopeSchema,
  storageSizeBytes: z.number().nullable(),
});

export type FormSubmissionFile = z.infer<typeof formSubmissionFileSchema>;

export const fileDisplayMetadataSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  originalSize: z.number(),
});

export type FileDisplayMetadata = z.infer<typeof fileDisplayMetadataSchema>;

export const formSubmissionResponseSchema = z
  .object({
    id: uuidSchema,
    formId: uuidSchema,
    formSnapshot: formSnapshotSchema,
    answerEnvelopes: z.array(answerEnvelopeSchema),
    candidateIdentityInputs: candidateIdentityInputsSchema,
    files: z.array(formSubmissionFileSchema),
    canReadPrivate: z.boolean(),
    submittedAt: z.string(),
  })
  .nullable();

export type FormSubmissionResponse = NonNullable<z.infer<typeof formSubmissionResponseSchema>>;
