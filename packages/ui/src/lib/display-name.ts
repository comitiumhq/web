import { type CandidateProfile, formatCandidateName } from '@comitium/schemas/candidates';
import type { DisplayIdentity } from '@comitium/schemas/common';
import { getNameInitials } from './get-name-initials';

export { getNameInitials };

interface CandidateDisplayNameInput {
  applicationId?: string | null;
  candidateId?: string | null;
  fallbackName?: string | null;
  profile?: Pick<CandidateProfile, 'firstName' | 'lastName'> | null;
}

interface DisplayIdentityInput {
  walletAddress: string | null;
  name: string | null;
  email: string | null;
}

export interface MemberDisplayIdentity {
  walletAddress?: string | null;
  name?: string | null;
  email?: string | null;
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getCandidateDisplayName({
  applicationId,
  candidateId,
  fallbackName,
  profile,
}: CandidateDisplayNameInput): string {
  const profileName = formatCandidateName(profile);
  const displayName = profileName ?? fallbackName;

  if (displayName) {
    return displayName;
  }

  const fallbackId = candidateId ?? applicationId;

  if (fallbackId) {
    return `Candidate ${fallbackId.slice(0, 8)}`;
  }

  return 'Unknown Candidate';
}

export function getMemberDisplayName(identity: MemberDisplayIdentity): string {
  const label = identity.name || identity.email;

  if (label) {
    return label;
  }

  if (identity.walletAddress) {
    return truncateAddress(identity.walletAddress);
  }

  return 'Team member';
}

export function createDisplayIdentity({ walletAddress, name, email }: DisplayIdentityInput): DisplayIdentity | null {
  if (!walletAddress) {
    return null;
  }

  return {
    walletAddress,
    name,
    email,
  };
}

export function getActorDisplayName(actorName?: string | null, fallback = 'Team member'): string {
  if (actorName) {
    return actorName;
  }

  return fallback;
}

export function getEmailSender(
  senderRole: 'applicant' | 'org_member',
  orgSenderName: string | null,
  candidateName: string | null,
): { name: string; initials: string } {
  if (senderRole === 'applicant') {
    return {
      name: candidateName || 'Candidate',
      initials: getNameInitials(candidateName, 'C'),
    };
  }

  return {
    name: orgSenderName || 'Team member',
    initials: getNameInitials(orgSenderName),
  };
}
