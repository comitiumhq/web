import { wrappedKeySchema } from '@comitium/schemas/common';
import { jobAccessRoleSchema } from '@comitium/schemas/jobs';
import { uuidSchema, walletAddressSchema } from '@comitium/schemas/public';
import { z } from 'zod';
import { orgRoleSchema } from './org';

const vaultGrantSchema = z.object({ wrappedVaultKey: wrappedKeySchema });
export type VaultGrant = z.infer<typeof vaultGrantSchema>;

export const orgLocationTypeSchema = z.enum(['remote', 'hybrid', 'on_site']);
export type OrgLocationType = z.infer<typeof orgLocationTypeSchema>;

const nullableText = z.string().nullable();

export const orgDepartmentSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  parentDepartmentId: uuidSchema.nullable(),
  name: z.string(),
  candidateFacingName: nullableText,
  slug: z.string(),
  sortOrder: z.number().int(),
  archivedAt: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrgDepartment = z.infer<typeof orgDepartmentSchema>;

export const orgLocationSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  parentLocationId: uuidSchema.nullable(),
  name: z.string(),
  candidateFacingName: nullableText,
  locationType: orgLocationTypeSchema,
  cityId: z.number().int().positive().nullable(),
  addressCountry: nullableText,
  addressRegion: nullableText,
  addressLocality: nullableText,
  postalCode: nullableText,
  streetAddress: nullableText,
  slug: z.string(),
  sortOrder: z.number().int(),
  archivedAt: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrgLocation = z.infer<typeof orgLocationSchema>;

export const listOrgDepartmentsResponseSchema = z.object({
  data: z.array(orgDepartmentSchema),
});

export const listOrgLocationsResponseSchema = z.object({
  data: z.array(orgLocationSchema),
});

const departmentGrantSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  departmentId: uuidSchema,
  departmentName: z.string(),
  memberId: uuidSchema,
  userId: uuidSchema,
  walletAddress: walletAddressSchema,
  memberName: nullableText,
  memberEmail: nullableText,
  role: jobAccessRoleSchema,
  roleName: z.string(),
  permissions: z.array(z.string()),
  grantedBy: uuidSchema.nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DepartmentGrant = z.infer<typeof departmentGrantSchema>;

const directJobAssignmentStatusSchema = z.enum(['draft', 'open', 'closed', 'archived']);
const jobAccessGrantSourceSchema = z.enum(['manual', 'import', 'hiring_team']);

const memberDirectJobAssignmentSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  jobId: uuidSchema,
  jobTitle: z.string().nullable(),
  jobStatus: directJobAssignmentStatusSchema,
  memberId: uuidSchema,
  userId: uuidSchema,
  walletAddress: walletAddressSchema,
  memberName: nullableText,
  memberEmail: nullableText,
  role: jobAccessRoleSchema,
  roleName: z.string(),
  permissions: z.array(z.string()),
  source: jobAccessGrantSourceSchema,
  grantedBy: uuidSchema.nullable(),
  assignedAt: z.string(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MemberDirectJobAssignment = z.infer<typeof memberDirectJobAssignmentSchema>;

export const memberAccessResponseSchema = z.object({
  memberId: uuidSchema,
  userId: uuidSchema,
  walletAddress: walletAddressSchema,
  memberName: nullableText,
  memberEmail: nullableText,
  isActive: z.boolean(),
  orgRole: orgRoleSchema,
  orgRoleName: z.string(),
  directJobAssignments: z.array(memberDirectJobAssignmentSchema),
  departmentGrants: z.array(departmentGrantSchema),
});

const nameField = z.string().trim().min(1, 'Name is required').max(255, 'Max 255 characters');
const optionalNameField = z.string().trim().max(255, 'Max 255 characters').optional();
const sortOrderField = z.number().int().min(0).max(10000).optional();

export const createOrgDepartmentBodySchema = z.object({
  name: nameField,
  candidateFacingName: optionalNameField,
  parentDepartmentId: uuidSchema.nullable().optional(),
  sortOrder: sortOrderField,
});

export type CreateOrgDepartmentBody = z.infer<typeof createOrgDepartmentBodySchema>;

const updateOrgDepartmentBodySchema = createOrgDepartmentBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateOrgDepartmentBody = z.infer<typeof updateOrgDepartmentBodySchema>;

const createMemberDepartmentGrantBodySchema = z.object({
  departmentId: uuidSchema,
  roleSlug: jobAccessRoleSchema,
  vaultGrant: vaultGrantSchema.optional(),
});

export type CreateMemberDepartmentGrantBody = z.infer<typeof createMemberDepartmentGrantBodySchema>;

const replaceMemberDepartmentGrantBodySchema = z.object({
  roleSlug: jobAccessRoleSchema,
});

export type ReplaceMemberDepartmentGrantBody = z.infer<typeof replaceMemberDepartmentGrantBodySchema>;

export const createOrgLocationBodySchema = z.object({
  name: nameField,
  candidateFacingName: optionalNameField,
  parentLocationId: uuidSchema.nullable().optional(),
  locationType: orgLocationTypeSchema,
  cityId: z.number().int().positive().nullable().optional(),
  addressCountry: z.string().trim().max(2, 'Use ISO country code').optional(),
  addressRegion: z.string().trim().max(120, 'Max 120 characters').optional(),
  addressLocality: z.string().trim().max(120, 'Max 120 characters').optional(),
  postalCode: z.string().trim().max(32, 'Max 32 characters').optional(),
  streetAddress: z.string().trim().max(255, 'Max 255 characters').optional(),
  sortOrder: sortOrderField,
});

export type CreateOrgLocationBody = z.infer<typeof createOrgLocationBodySchema>;

const updateOrgLocationBodySchema = createOrgLocationBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export type UpdateOrgLocationBody = z.infer<typeof updateOrgLocationBodySchema>;
