import type { PublicEncryptionKey } from '@comitium/crypto';
import type { ApplicationApiResponse } from '@comitium/schemas/applications';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { ScrollArea } from '@comitium/ui/scroll-area';
import { CustomFieldValuesSection } from '@/components/features/custom-fields/custom-field-values-section';

import { CandidateProfileCard } from './candidate-profile-card';
import { HiringTeamCard } from './hiring-team-card';
import { ProcessingStatus } from './processing-status';

interface CandidateOverviewProps {
  application: ApplicationApiResponse;
  orgId: string;
  decryptedProfile: CandidateProfile | null;
  isLoadingProfile: boolean;
  hasEncryptedProfile: boolean;
  profileQueryError: boolean;
  profileDecryptionError: boolean;
  onRetryProfile: () => void;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
}

export function CandidateOverview({
  application,
  orgId,
  decryptedProfile,
  isLoadingProfile,
  hasEncryptedProfile,
  profileQueryError,
  profileDecryptionError,
  onRetryProfile,
  vaultPublicKey,
  vaultKeyVersion,
}: CandidateOverviewProps) {
  const canEditCandidate = application.considerationContext.capabilities.candidate.canEditProfile;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 px-4 pb-4 pt-20">
        <CandidateProfileCard
          candidateId={application.candidateId}
          orgId={orgId}
          profile={decryptedProfile}
          isLoading={isLoadingProfile}
          hasEncryptedProfile={hasEncryptedProfile}
          queryError={profileQueryError}
          decryptionError={profileDecryptionError}
          onRetry={onRetryProfile}
          canEdit={canEditCandidate}
          vaultPublicKey={vaultPublicKey}
          vaultKeyVersion={vaultKeyVersion}
        />

        <HiringTeamCard members={application.considerationContext.hiringTeam} />

        {application.processing && <ProcessingStatus processing={application.processing} />}

        {application.candidateId && (
          <CustomFieldValuesSection candidateId={application.candidateId} orgId={orgId} canEdit={canEditCandidate} />
        )}
      </div>
    </ScrollArea>
  );
}
