import { bytes32HexSchema, paginatedWithTotalSchema, uuidSchema, walletAddressSchema } from '@comitium/schemas/public';
import { companyInfoSchema, jobListItemSchema, jobStatusSchema } from '@comitium/schemas/public-jobs';
import { z } from 'zod';

const careerOrgSchema = z.object({
  id: z.string(),
  onChainOrgId: z.number(),
  careersSlug: z.string(),
  txHash: bytes32HexSchema,
  name: z.string().nullable(),
  description: z.string().nullable(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
});

export type CareerOrg = z.infer<typeof careerOrgSchema>;

const careerDepartmentSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  count: z.number(),
});

export type CareerDepartment = z.infer<typeof careerDepartmentSchema>;

const careerJobListItemSchema = jobListItemSchema.extend({
  departmentId: uuidSchema.nullable(),
  departmentSlug: z.string().nullable(),
  departmentName: z.string().nullable(),
  departmentSortOrder: z.number().nullable(),
});

export type CareerJobListItem = z.infer<typeof careerJobListItemSchema>;

export const careerPageSchema = z.object({
  org: careerOrgSchema,
  departments: z.array(careerDepartmentSchema),
  jobs: paginatedWithTotalSchema(careerJobListItemSchema),
});

export type CareerPage = z.infer<typeof careerPageSchema>;
export const careerJobsResponseSchema = paginatedWithTotalSchema(careerJobListItemSchema);
export type CareerJobsResponse = z.infer<typeof careerJobsResponseSchema>;

const recruitingPrivacySchema = z.object({
  controllerName: z.string().max(255).nullable(),
  privacyPolicyUrl: z.string().max(2048).nullable(),
  aiCriteriaEvaluation: z.object({
    enabled: z.boolean(),
    additionalNotice: z.string().max(2000).nullable(),
    additionalNoticeUrl: z.string().max(2048).nullable(),
  }),
});

export const careerJobSchema = careerJobListItemSchema.omit({ orgSlug: true }).extend({
  orgId: z.string(),
  creatorAddress: walletAddressSchema,
  orgOnChainId: z.number(),
  org: careerOrgSchema,
  description: z.string().nullable(),
  status: jobStatusSchema,
  responseDeadlineDays: z.number().nullable(),
  category: z.string().nullable(),
  companyInfo: companyInfoSchema.nullable(),
  recruitingPrivacy: recruitingPrivacySchema,
});

export type CareerJob = z.infer<typeof careerJobSchema>;
