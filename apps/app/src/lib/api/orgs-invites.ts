import { dataArraySchema, successSchema } from '@comitium/schemas/public';
import { acceptInviteSchema, inviteInfoSchema, inviteResultsSchema, orgInviteSchema } from '@/lib/schemas/org';

import { api } from './client';

export function getOrgInvites(orgId: string) {
  return api.get(`/orgs/${orgId}/team/invites`, dataArraySchema(orgInviteSchema));
}

export interface InviteInput {
  email: string;
  name: string;
}

export function inviteMembers(orgId: string, invites: InviteInput[]) {
  return api.post(`/orgs/${orgId}/team/invite`, { invites }, inviteResultsSchema);
}

export function resendInvite(orgId: string, inviteId: string) {
  return api.post(`/orgs/${orgId}/team/invites/${inviteId}/resend`, undefined, successSchema);
}

export function revokeInvite(orgId: string, inviteId: string) {
  return api.delete(`/orgs/${orgId}/team/invites/${inviteId}`, successSchema);
}

export function getInvite(token: string) {
  return api.get(`/invites/${token}`, inviteInfoSchema);
}

export function acceptInvite(token: string) {
  return api.post(`/invites/${token}/accept`, undefined, acceptInviteSchema);
}
