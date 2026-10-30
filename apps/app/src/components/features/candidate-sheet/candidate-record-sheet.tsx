import { useSession } from '@comitium/auth/use-session';
import { formatCandidateName } from '@comitium/schemas/candidates';
import { SheetHeader } from '@comitium/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { useState } from 'react';
import { CustomFieldValuesSection } from '@/components/features/custom-fields/custom-field-values-section';
import { useQueryOrgVaultAccess } from '@/hooks/queries/use-query-org-vault-access';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@/lib/schemas/org';
import { CandidateFiles } from './candidate-files';
import { CandidateSheetShell } from './candidate-sheet-shell';
import { NotesTab } from './collaboration/notes';
import { useDecryptedNotes } from './collaboration/notes/use-decrypted-notes';
import { useNoteActions } from './collaboration/notes/use-note-actions';
import { useDecryptProfile } from './hooks/use-decrypt-profile';
import { CandidateProfileCard } from './overview/candidate-profile-card';
import { WorkspaceTabsNavigation } from './workspace-tabs-navigation';

interface CandidateRecordSheetProps {
  candidateId: string;
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateRecordSheet({ candidateId, orgId, open, onOpenChange }: CandidateRecordSheetProps) {
  const { user } = useSession();
  const { can } = usePermissions();
  const { data: access } = useQueryOrgVaultAccess(orgId);
  const { data: key } = useQueryOrgVaultKey(orgId);
  const profile = useDecryptProfile(open ? candidateId : null, orgId, access);
  const notes = useDecryptedNotes(null, orgId, open ? candidateId : null);
  const noteActions = useNoteActions(candidateId);
  const [tab, setTab] = useState('overview');
  const canEdit = can(Permission.CANDIDATE_WRITE);
  const name = formatCandidateName(profile.profile) || (profile.decryptionError ? 'Profile unavailable' : 'Candidate');

  return (
    <CandidateSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description="Candidate profile, files and notes."
    >
      <SheetHeader className="shrink-0 border-b border-separator px-6 py-4 pr-14">
        <h2 className="text-heading-20">{name}</h2>
        <p className="text-sm text-muted-foreground">
          {[profile.profile?.currentTitle, profile.profile?.currentCompany].filter(Boolean).join(' · ')}
        </p>
      </SheetHeader>
      <Tabs value={tab} onValueChange={setTab} className="relative min-h-0 flex-1 gap-0">
        <WorkspaceTabsNavigation>
          <TabsList className="mx-4 my-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </WorkspaceTabsNavigation>
        <TabsContent value="overview" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-20">
            <CandidateProfileCard
              candidateId={candidateId}
              orgId={orgId}
              profile={profile.profile}
              profileRevision={profile.profileRevision}
              isLoading={profile.isLoading}
              hasEncryptedProfile={profile.hasEncryptedProfile}
              queryError={profile.queryError}
              decryptionError={profile.decryptionError}
              onRetry={profile.retryQuery}
              canEdit={canEdit}
              vaultPublicKey={key?.vaultPublicKey ?? null}
              vaultKeyVersion={key?.keyVersion ?? null}
              vaultAccess={access}
            />
            <CustomFieldValuesSection candidateId={candidateId} orgId={orgId} canEdit={canEdit} />
          </div>
        </TabsContent>
        <TabsContent value="files" className="mt-0 min-h-0 flex-1">
          <CandidateFiles orgId={orgId} candidateId={candidateId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-0 min-h-0 flex-1">
          <NotesTab
            orgId={orgId}
            candidateId={candidateId}
            currentUserId={user?.id ?? ''}
            vaultPublicKey={key?.vaultPublicKey ?? null}
            vaultKeyVersion={key?.keyVersion ?? null}
            canManageNotes={can(Permission.NOTE_WRITE)}
            decryptedNotes={notes.decryptedNotes}
            notes={notes.notes}
            totalNotes={notes.total}
            isLoading={notes.isLoading}
            isError={notes.isError}
            decryptingNoteIds={notes.decryptingNoteIds}
            failedNoteIds={notes.failedNoteIds}
            isVaultKeyError={notes.isVaultKeyError}
            hasNextPage={notes.hasNextPage}
            isFetchingNextPage={notes.isFetchingNextPage}
            isFetchNextPageError={notes.isFetchNextPageError}
            onLoadMore={notes.fetchNextPage}
            onRetry={notes.refetch}
            onDeleteNote={noteActions.handleDeleteNote}
            deletingNoteId={noteActions.deletingNoteId}
          />
        </TabsContent>
      </Tabs>
    </CandidateSheetShell>
  );
}
