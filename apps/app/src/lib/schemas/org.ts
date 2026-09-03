import { tipTapDocSchema } from '@comitium/schemas/common';
import {
  preparedRelayedOnchainOperationSchema,
  userWalletAuthorizationPayloadSchema,
} from '@comitium/schemas/onchain-operations';
import { uuidSchema, walletAddressSchema } from '@comitium/schemas/public';
import { z } from 'zod';

// --- Org roles & permissions ---

export const orgRoleSchema = z.enum(['org_admin', 'org_member']);
export type OrgRole = z.infer<typeof orgRoleSchema>;

const permissionSchema = z.enum([
  'org_member:read',
  'org_member:write',
  'access_role:read',
  'access_role:write',
  'org_settings:read',
  'org_settings:write',
  'vault:read',
  'vault:grant',
  'job:read',
  'job:create',
  'job:edit',
  'job:publish',
  'job:unpublish',
  'job:close',
  'hiring_team:read',
  'hiring_team:write',
  'candidate:read',
  'candidate:write',
  'candidate:contact',
  'application:read',
  'pipeline:write',
  'note:write',
  'interview:write',
  'tag:write',
  'tag:assign',
  'feedback:submit',
  'feedback:moderate',
  'private_data:read',
  'job_template:write',
  'email_template:write',
  'interview_plan:read',
  'interview_plan:write',
  'custom_field:write',
  'form:write',
  'archive_reason:write',
  'close_reason:write',
  'cancel_reschedule_reason:write',
]);

export type Permission = z.infer<typeof permissionSchema>;

// Runtime const for `Permission.ORG_MEMBER_READ` style access
export const Permission = {
  ORG_MEMBER_READ: 'org_member:read',
  ORG_MEMBER_WRITE: 'org_member:write',
  ACCESS_ROLE_READ: 'access_role:read',
  ACCESS_ROLE_WRITE: 'access_role:write',
  ORG_SETTINGS_READ: 'org_settings:read',
  ORG_SETTINGS_WRITE: 'org_settings:write',
  VAULT_READ: 'vault:read',
  VAULT_GRANT: 'vault:grant',
  JOB_READ: 'job:read',
  JOB_CREATE: 'job:create',
  JOB_EDIT: 'job:edit',
  JOB_PUBLISH: 'job:publish',
  JOB_UNPUBLISH: 'job:unpublish',
  JOB_CLOSE: 'job:close',
  HIRING_TEAM_READ: 'hiring_team:read',
  HIRING_TEAM_WRITE: 'hiring_team:write',
  CANDIDATE_READ: 'candidate:read',
  CANDIDATE_WRITE: 'candidate:write',
  CANDIDATE_CONTACT: 'candidate:contact',
  APPLICATION_READ: 'application:read',
  PIPELINE_WRITE: 'pipeline:write',
  NOTE_WRITE: 'note:write',
  INTERVIEW_WRITE: 'interview:write',
  TAG_WRITE: 'tag:write',
  TAG_ASSIGN: 'tag:assign',
  FEEDBACK_SUBMIT: 'feedback:submit',
  FEEDBACK_MODERATE: 'feedback:moderate',
  PRIVATE_DATA_READ: 'private_data:read',
  JOB_TEMPLATE_WRITE: 'job_template:write',
  EMAIL_TEMPLATE_WRITE: 'email_template:write',
  INTERVIEW_PLAN_READ: 'interview_plan:read',
  INTERVIEW_PLAN_WRITE: 'interview_plan:write',
  CUSTOM_FIELD_WRITE: 'custom_field:write',
  FORM_WRITE: 'form:write',
  ARCHIVE_REASON_WRITE: 'archive_reason:write',
  CLOSE_REASON_WRITE: 'close_reason:write',
  CANCEL_RESCHEDULE_REASON_WRITE: 'cancel_reschedule_reason:write',
} as const;

// --- Org member (current user) ---

export const orgMeSchema = z.object({
  userId: uuidSchema,
  role: orgRoleSchema,
  permissions: z.array(permissionSchema),
  name: z.string().nullable(),
  jobTitle: z.string().nullable(),
  email: z.string().nullable(),
  emailSignature: tipTapDocSchema.nullable(),
  timezone: z.string().nullable(),
});

export type OrgMeResponse = z.infer<typeof orgMeSchema>;

// --- My orgs list ---

export const myOrgSchema = z.object({
  id: uuidSchema,
  orgId: z.number(),
  domain: z.string().nullable(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  createdAt: z.string(),
  role: orgRoleSchema,
  hasVaultAccess: z.boolean(),
});

export type MyOrg = z.infer<typeof myOrgSchema>;

// --- Org details ---

export const orgDetailsSchema = z.object({
  id: uuidSchema,
  orgId: z.number(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  careersSlug: z.string(),
  domain: z.string().nullable(),
  createdAt: z.string(),
});

export type OrgDetails = z.infer<typeof orgDetailsSchema>;

export const prepareOrgContentUriUpdateResponseSchema = preparedRelayedOnchainOperationSchema;

export type PrepareOrgContentUriUpdateData = {
  name: string;
  careersSlug: string;
  description: string;
  logo: string | null;
  website: string;
};

export const orgTreasuryStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    currentTreasury: walletAddressSchema,
    pendingTransfer: z
      .object({
        proposedTreasury: walletAddressSchema,
        accepted: z.boolean(),
      })
      .nullable(),
    viewerIsCurrentTreasury: z.boolean(),
    viewerCanFinalizeTreasuryTransfer: z.boolean(),
    viewerCanCancelTreasuryTransfer: z.boolean(),
  }),
  z.object({
    status: z.literal('missing_projection'),
  }),
]);

export type OrgTreasuryStatus = z.infer<typeof orgTreasuryStatusSchema>;

// --- Org ID by on-chain ID ---

// --- Team members ---

const teamMemberAccessRoleSchema = z.enum(['hiring_member', 'hiring_manager', 'admin']);
const teamMemberJobGrantSourceSchema = z.enum(['manual', 'import', 'hiring_team']);

const teamMemberAccessSummarySchema = z.object({
  departmentGrants: z.array(
    z.object({
      departmentId: uuidSchema,
      departmentName: z.string(),
      role: teamMemberAccessRoleSchema,
      roleName: z.string(),
    }),
  ),
  directJobAssignments: z.array(
    z.object({
      jobId: uuidSchema,
      jobTitle: z.string().nullable(),
      role: teamMemberAccessRoleSchema,
      roleName: z.string(),
      source: teamMemberJobGrantSourceSchema,
    }),
  ),
});

export const orgTeamMemberSchema = z.object({
  userId: uuidSchema,
  walletAddress: walletAddressSchema,
  email: z.string().nullable(),
  name: z.string().nullable(),
  jobTitle: z.string().nullable(),
  role: orgRoleSchema,
  timezone: z.string().nullable(),
  isActive: z.boolean(),
  hasVaultAccess: z.boolean(),
  hasScopedAccess: z.boolean(),
  accessSummary: teamMemberAccessSummarySchema,
  invitedBy: uuidSchema.nullable(),
  createdAt: z.string(),
});

export type OrgTeamMember = z.infer<typeof orgTeamMemberSchema>;

export const teamCalendarStatusSchema = z.object({
  userId: uuidSchema,
  hasCalendar: z.boolean(),
});

export type TeamCalendarStatus = z.infer<typeof teamCalendarStatusSchema>;

// --- Invites ---

export const orgInviteSchema = z.object({
  id: uuidSchema,
  email: z.string(),
  name: z.string(),
  invitedBy: uuidSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  isExpired: z.boolean(),
  emailDeliveryStatus: z.enum(['queued', 'sent', 'delivered', 'bounced', 'failed', 'suppressed']).nullable().optional(),
  emailDeliveryError: z.string().nullable().optional(),
  emailDeliverySentAt: z.string().nullable().optional(),
  emailDeliveryStatusUpdatedAt: z.string().nullable().optional(),
  emailDeliveryCreatedAt: z.string().nullable().optional(),
});

export type OrgInvite = z.infer<typeof orgInviteSchema>;

const inviteResultSchema = z.object({
  email: z.string(),
  status: z.enum(['sent', 'already_member', 'error']),
});

export const inviteResultsSchema = z.object({
  results: z.array(inviteResultSchema),
});

export const inviteInfoSchema = z.object({
  orgName: z.string().nullable(),
  orgLogo: z.string().nullable(),
  role: orgRoleSchema,
  email: z.string(),
  expiresAt: z.string(),
  isExpired: z.boolean(),
  isRevoked: z.boolean(),
  isAccepted: z.boolean(),
});

export type InviteInfo = z.infer<typeof inviteInfoSchema>;

export const acceptInviteSchema = z.object({
  success: z.boolean(),
  orgId: z.string(),
});

// --- Funds ---

const balanceEventTypeSchema = z.enum(['deposit', 'withdraw', 'job_funded', 'job_settled']);
export type BalanceEventType = z.infer<typeof balanceEventTypeSchema>;

const balanceEventDetailsSchema = z.union([
  z.object({ amount: z.string() }),
  z.object({ jobId: z.number(), stakeAmount: z.string(), feeAmount: z.string() }),
  z.object({ jobId: z.number(), returnAmount: z.string(), slashedAmount: z.string() }),
]);

export type BalanceEventDetails = z.infer<typeof balanceEventDetailsSchema>;

const balanceEventSchema = z.object({
  id: z.string(),
  eventType: balanceEventTypeSchema,
  details: balanceEventDetailsSchema,
  blockNumber: z.string(),
  txHash: z.string(),
  createdAt: z.string(),
});

export type BalanceEvent = z.infer<typeof balanceEventSchema>;

export const balanceHistorySchema = z.object({
  data: z.array(balanceEventSchema),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

// --- Organization creation ---

export const orgCreationStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('needs_verification') }),
  z.object({ status: z.literal('ready'), email: z.string(), domain: z.string() }),
  z.object({ status: z.literal('failed'), email: z.string(), domain: z.string() }),
  z.object({ status: z.literal('creating'), email: z.string().nullable(), domain: z.string() }),
  z.object({ status: z.literal('created'), organizationId: uuidSchema, hasActiveMembership: z.boolean() }),
]);

export type OrgCreationStatus = z.infer<typeof orgCreationStatusSchema>;

export function canAccessOrganizationOnboarding(
  status: OrgCreationStatus | null,
  activeMembershipCount: number,
): boolean {
  if (activeMembershipCount > 0 || status === null) {
    return false;
  }

  return status.status !== 'created';
}

export function getAccessibleCreatedOrganizationId(status?: OrgCreationStatus): string | null {
  if (status?.status !== 'created' || !status.hasActiveMembership) {
    return null;
  }

  return status.organizationId;
}

export const sendVerificationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('verified'), domain: z.string() }),
  z.object({
    status: z.literal('code_sent'),
    message: z.string(),
    domain: z.string(),
    expiresIn: z.number(),
  }),
]);

export const verifyCodeSchema = z.object({
  verified: z.boolean(),
  domain: z.string(),
});

export const orgCreationPreparationSchema = z.discriminatedUnion('state', [
  z.object({ state: z.enum(['confirming', 'completed', 'try_again']) }),
  userWalletAuthorizationPayloadSchema.extend({
    state: z.literal('wallet_confirmation'),
    operationId: uuidSchema,
  }),
]);

type OrgCreationPreparation = z.infer<typeof orgCreationPreparationSchema>;
export type ExecutableOrgCreation = Extract<OrgCreationPreparation, { state: 'wallet_confirmation' }>;

// --- Request body: update member profile ---

const updateMemberProfileSchema = z.object({
  name: z.string().min(1).optional(),
  jobTitle: z.string().nullable().optional(),
  emailSignature: tipTapDocSchema.nullable().optional(),
  timezone: z.string().min(1).optional(),
});

export type UpdateMemberProfileData = z.infer<typeof updateMemberProfileSchema>;

// --- Funds event type guards ---

export function isDepositOrWithdraw(details: BalanceEventDetails): details is { amount: string } {
  return 'amount' in details;
}

export function isJobFunded(
  details: BalanceEventDetails,
): details is { jobId: number; stakeAmount: string; feeAmount: string } {
  return 'stakeAmount' in details;
}

export function isJobSettled(
  details: BalanceEventDetails,
): details is { jobId: number; returnAmount: string; slashedAmount: string } {
  return 'returnAmount' in details;
}
