import type { PublicEncryptionKey } from '@comitium/crypto';
import type { CandidateProfile } from '@comitium/schemas/candidates';
import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import {
  ArrowSquareOutIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  GlobeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useCallback, useState } from 'react';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { formatUrlForDisplay, isUrl } from '@/lib/utils';

import { CandidateProfileEditSheet } from './candidate-profile-edit-sheet';

interface CandidateProfileCardProps {
  candidateId: string | null;
  orgId: string;
  profile: CandidateProfile | null;
  isLoading: boolean;
  hasEncryptedProfile: boolean;
  queryError: boolean;
  decryptionError: boolean;
  onRetry: () => void;
  canEdit: boolean;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
}

export function CandidateProfileCard({
  candidateId,
  orgId,
  profile,
  isLoading,
  hasEncryptedProfile,
  queryError,
  decryptionError,
  onRetry,
  canEdit,
  vaultPublicKey,
  vaultKeyVersion,
}: CandidateProfileCardProps) {
  const { isUnlocked, runUnlocked } = useEncryptionUnlocked(orgId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const canOpenEditor = canEdit && candidateId !== null && vaultPublicKey !== null && vaultKeyVersion !== null;
  const handleEdit = useCallback(() => runUnlocked(() => setIsEditOpen(true)), [runUnlocked]);

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>

          {canEdit && (
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={handleEdit} disabled={!canOpenEditor}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <CardContent>
          <CandidateProfileContent
            profile={profile}
            orgId={orgId}
            isCandidateResolved={candidateId !== null}
            isUnlocked={isUnlocked}
            isLoading={isLoading}
            hasEncryptedProfile={hasEncryptedProfile}
            queryError={queryError}
            decryptionError={decryptionError}
            onRetry={onRetry}
          />
        </CardContent>
      </Card>

      {canOpenEditor && (
        <CandidateProfileEditSheet
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          candidateId={candidateId}
          orgId={orgId}
          profile={profile}
          vaultPublicKey={vaultPublicKey}
          vaultKeyVersion={vaultKeyVersion}
        />
      )}
    </>
  );
}

interface CandidateProfileContentProps {
  profile: CandidateProfile | null;
  orgId: string;
  isCandidateResolved: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  hasEncryptedProfile: boolean;
  queryError: boolean;
  decryptionError: boolean;
  onRetry: () => void;
}

function CandidateProfileContent({
  profile,
  orgId,
  isCandidateResolved,
  isUnlocked,
  isLoading,
  hasEncryptedProfile,
  queryError,
  decryptionError,
  onRetry,
}: CandidateProfileContentProps) {
  if (!isCandidateResolved) {
    return (
      <p className="text-copy-14 text-muted-foreground">
        Candidate profile is unavailable until identity processing completes.
      </p>
    );
  }

  if (isLoading) {
    return <CandidateProfileSkeleton />;
  }

  if (queryError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
        <p className="text-copy-14 text-muted-foreground">Candidate profile could not be loaded.</p>
        <Button type="button" variant="outline" size="xs" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!isUnlocked && hasEncryptedProfile) {
    return <EncryptedPlaceholder orgId={orgId} variant="block" lines={4} />;
  }

  if (decryptionError) {
    return <p className="text-copy-14 text-muted-foreground">Candidate profile couldn't be decrypted.</p>;
  }

  if (!profile || !hasProfileValues(profile)) {
    return <p className="text-copy-14 text-muted-foreground">No additional profile details yet.</p>;
  }

  return <CandidateProfileFields profile={profile} />;
}

function CandidateProfileSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex min-w-0 items-start gap-2.5">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function CandidateProfileFields({ profile }: { profile: CandidateProfile }) {
  const { phone, location, linkedIn, github, website, currentTitle, currentCompany } = profile;

  return (
    <div className="flex flex-col gap-2.5">
      {currentTitle && currentCompany && (
        <ProfileField icon={<BriefcaseIcon />}>
          {currentTitle} at {currentCompany}
        </ProfileField>
      )}
      {currentTitle && !currentCompany && <ProfileField icon={<BriefcaseIcon />}>{currentTitle}</ProfileField>}
      {!currentTitle && currentCompany && <ProfileField icon={<BuildingOfficeIcon />}>{currentCompany}</ProfileField>}
      {phone && <ProfileField icon={<PhoneIcon />}>{phone}</ProfileField>}
      {location && <ProfileField icon={<MapPinIcon />}>{location}</ProfileField>}
      {isUrl(linkedIn) && (
        <ProfileLink icon={<ArrowSquareOutIcon />} href={linkedIn}>
          LinkedIn
        </ProfileLink>
      )}
      {isUrl(github) && (
        <ProfileLink icon={<ArrowSquareOutIcon />} href={github}>
          GitHub
        </ProfileLink>
      )}
      {isUrl(website) && (
        <ProfileLink icon={<GlobeIcon />} href={website}>
          {formatUrlForDisplay(website)}
        </ProfileLink>
      )}
    </div>
  );
}

function ProfileField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 size-4 shrink-0 text-muted-foreground [&>svg]:size-4">{icon}</span>
      <span className="min-w-0 text-copy-14">{children}</span>
    </div>
  );
}

function ProfileLink({ icon, href, children }: { icon: ReactNode; href: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 size-4 shrink-0 text-muted-foreground [&>svg]:size-4">{icon}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 break-words text-copy-14 text-primary underline-offset-4 hover:underline"
      >
        {children}
      </a>
    </div>
  );
}

function hasProfileValues(profile: CandidateProfile): boolean {
  return [
    profile.phone,
    profile.location,
    profile.linkedIn,
    profile.github,
    profile.website,
    profile.currentTitle,
    profile.currentCompany,
  ].some(Boolean);
}
