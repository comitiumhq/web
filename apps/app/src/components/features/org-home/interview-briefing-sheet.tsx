import { useSession } from '@comitium/auth/use-session';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { FeatureErrorFallback } from '@comitium/ui/error-fallbacks';
import { FeatureSheetBody, FeatureSheetContent, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { ArrowSquareOutIcon, CalendarBlankIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { type ComponentType, type ReactNode, useCallback, useMemo, useState } from 'react';
import { ApplicationSubmissionView } from '@/components/features/application-submission/application-submission-view';
import {
  FeedbackSubmissionPanel,
  FeedbackSubmissionSkeleton,
  type FeedbackSubmissionSource,
} from '@/components/features/feedback-submission';
import { ResumePreview } from '@/components/features/resume/resume-preview';
import { RichTextEditor } from '@/components/tiptap-ui/rich-text-editor';
import { useQueryInterviewBriefing } from '@/hooks/queries/use-query-interviews';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { qk } from '@/hooks/query-keys';
import { useDecryptCandidateProfileInput } from '@/hooks/use-decrypt-candidate-profile-input';
import { useDecryptResume } from '@/hooks/use-decrypt-resume';
import { type InterviewBriefing, InterviewStatus, type MyInterview } from '@/lib/schemas/interviews';
import { tipTapToPlainText } from '@/lib/tiptap/tokens';
import { cn, formatDate } from '@/lib/utils';

import { isInterviewFeedbackDue } from './home-data';
import { useInterviewBriefingApplication } from './use-interview-briefing-application';

const BRIEFING_TABS = ['overview', 'briefing', 'resume', 'application', 'feedback'] as const;
const BRIEFING_TAB_SKELETONS = [
  { key: 'overview', width: 'w-20' },
  { key: 'briefing', width: 'w-20' },
  { key: 'resume', width: 'w-16' },
  { key: 'application', width: 'w-24' },
  { key: 'feedback', width: 'w-28' },
] as const;

type BriefingTab = (typeof BRIEFING_TABS)[number];

interface InterviewBriefingSheetProps {
  interview: MyInterview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function InterviewBriefingSheet({ interview, open, onOpenChange, orgId }: InterviewBriefingSheetProps) {
  const [activeTab, setActiveTab] = useState<BriefingTab>(() => getInitialTab(interview));
  const [isFeedbackInitialized, setIsFeedbackInitialized] = useState(() => getInitialTab(interview) === 'feedback');

  const queryClient = useQueryClient();
  const { user } = useSession();

  const feedbackSource = useMemo<FeedbackSubmissionSource>(
    () => ({ kind: 'event', eventId: interview.eventId, interviewTitle: interview.title }),
    [interview.eventId, interview.title],
  );

  const {
    data: briefingResponse,
    isLoading,
    error,
    refetch,
  } = useQueryInterviewBriefing(open ? interview.applicationId : undefined, open ? interview.eventId : undefined);

  const briefing = briefingResponse?.data;

  const { data: vaultKey } = useQueryOrgVaultKey(open ? orgId : undefined);
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(open ? orgId : undefined);

  const {
    error: resumeError,
    isLoading: isResumeLoading,
    pdfData,
    downloadResume,
  } = useDecryptResume(
    orgId,
    briefing?.applicationId ?? null,
    briefing?.hasResume ?? false,
    briefing?.resumeFileId ?? null,
    wrappedVaultKey,
    interview.eventId,
  );

  const candidateProfileQuery = useDecryptCandidateProfileInput({
    applicationId: briefing?.applicationId ?? null,
    enabled: open,
    envelope: briefing?.candidateProfileInput ?? null,
    orgId,
    wrappedVaultKey,
  });

  const applicationForm = useInterviewBriefingApplication({
    applicationId: briefing?.applicationId ?? null,
    enabled: open,
    interviewEventId: interview.eventId,
    orgId,
    submission: briefing?.applicationSubmission ?? null,
    wrappedVaultKey,
  });

  const hasCandidateProfileInput =
    briefing?.candidateProfileInput !== null && briefing?.candidateProfileInput !== undefined;
  const candidateProfileError =
    hasCandidateProfileInput && candidateProfileQuery.isError ? candidateProfileQuery.error : null;

  const candidateName = candidateProfileQuery.data
    ? `${candidateProfileQuery.data.firstName} ${candidateProfileQuery.data.lastName}`
    : null;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRetryCandidateProfile = useCallback(() => {
    candidateProfileQuery.refetch();
  }, [candidateProfileQuery.refetch]);

  const handleTabChange = useCallback((value: string) => {
    if (isBriefingTab(value)) {
      setActiveTab(value);

      if (value === 'feedback') {
        setIsFeedbackInitialized(true);
      }
    }
  }, []);

  const handleFeedbackComplete = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: qk.interviews.my(orgId) });

    onOpenChange(false);
  }, [onOpenChange, orgId, queryClient]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <FeatureSheetContent side="right" width="2xl" className="w-full">
        <FeatureSheetHeader>
          <SheetTitle className="pr-8 text-heading-20">
            {candidateName ?? (candidateProfileError ? 'Candidate name unavailable' : 'Candidate')}
          </SheetTitle>
          <SheetDescription>
            {briefing?.interview.title ?? interview.title} · {briefing?.jobTitle ?? interview.jobTitle}
          </SheetDescription>
        </FeatureSheetHeader>

        {isLoading && <InterviewBriefingSkeleton feedbackDue={isInterviewFeedbackDue(interview)} />}

        {!isLoading && error && (
          <FeatureErrorFallback
            className="flex-1"
            error={error}
            resetErrorBoundary={handleRetry}
            title="Briefing unavailable"
          />
        )}

        {!isLoading && !error && candidateProfileError && (
          <FeatureErrorFallback
            className="flex-1"
            error={candidateProfileError}
            resetErrorBoundary={handleRetryCandidateProfile}
            title="Candidate name unavailable"
          />
        )}

        {!isLoading && !error && !candidateProfileError && briefing && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-0 flex-1 gap-0">
            <div className="shrink-0 overflow-x-auto px-6 pt-4">
              <TabsList className="min-w-max">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="briefing">Briefing</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="application">Application</TabsTrigger>
                <TabsTrigger value="feedback">Your Feedback</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="min-h-0 flex-1 overflow-hidden">
              <FeatureSheetBody className="h-full space-y-6">
                <InterviewDetails briefing={briefing} />
                <InterviewPanel interviewers={briefing.interviewers} />
              </FeatureSheetBody>
            </TabsContent>

            <TabsContent value="briefing" className="min-h-0 flex-1 overflow-hidden">
              <FeatureSheetBody className="h-full">
                <InterviewInstructions briefing={briefing} />
              </FeatureSheetBody>
            </TabsContent>

            <TabsContent value="resume" className="min-h-0 flex-1 overflow-hidden">
              <FeatureSheetBody className="h-full">
                <ResumePreview
                  orgId={orgId}
                  hasResume={briefing.hasResume}
                  pdfData={pdfData}
                  isLoading={isResumeLoading}
                  error={resumeError}
                  onDownload={downloadResume}
                  showDownload={false}
                />
              </FeatureSheetBody>
            </TabsContent>

            <TabsContent value="application" className="min-h-0 flex-1 overflow-hidden">
              <FeatureSheetBody className="h-full">
                <ApplicationSubmissionView orgId={orgId} form={applicationForm} />
              </FeatureSheetBody>
            </TabsContent>

            <TabsContent
              value="feedback"
              forceMount
              className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <FeedbackSubmissionPanel
                active={open && isFeedbackInitialized}
                applicationId={briefing.applicationId}
                orgId={orgId}
                source={feedbackSource}
                currentUserId={user?.id}
                vaultPublicKey={vaultKey?.vaultPublicKey ?? null}
                vaultKeyVersion={vaultKey?.keyVersion ?? null}
                wrappedVaultKey={wrappedVaultKey}
                onComplete={handleFeedbackComplete}
              />
            </TabsContent>
          </Tabs>
        )}
      </FeatureSheetContent>
    </Sheet>
  );
}

function InterviewBriefingSkeleton({ feedbackDue }: { feedbackDue: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BriefingTabsSkeleton />
      {feedbackDue ? <FeedbackSubmissionSkeleton /> : <InterviewOverviewSkeleton />}
    </div>
  );
}

function BriefingTabsSkeleton() {
  return (
    <div className="shrink-0 overflow-hidden px-6 pt-4">
      <div className="flex h-10 w-fit items-center gap-1 rounded-4xl border border-input bg-input/30 p-1">
        {BRIEFING_TAB_SKELETONS.map((tab) => (
          <Skeleton key={tab.key} className={cn('h-7 rounded-3xl', tab.width)} />
        ))}
      </div>
    </div>
  );
}

function InterviewOverviewSkeleton() {
  return (
    <FeatureSheetBody className="space-y-6">
      <Card size="sm" className="gap-0">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-5 pt-3 sm:grid-cols-2">
          <BriefingDetailSkeleton valueWidth="w-40" />
          <BriefingDetailSkeleton valueWidth="w-16" />
          <BriefingDetailSkeleton valueWidth="w-28" />
          <BriefingDetailSkeleton valueWidth="w-24" />
        </CardContent>
      </Card>

      <Card size="sm" className="gap-0">
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-4 pt-3">
          <InterviewerSkeleton nameWidth="w-28" />
          <InterviewerSkeleton nameWidth="w-32" />
          <InterviewerSkeleton nameWidth="w-24" />
        </CardContent>
      </Card>
    </FeatureSheetBody>
  );
}

function BriefingDetailSkeleton({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex gap-2">
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className={cn('h-4', valueWidth)} />
      </div>
    </div>
  );
}

function InterviewerSkeleton({ nameWidth }: { nameWidth: string }) {
  return (
    <div className="flex min-w-44 items-center gap-2.5">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="space-y-2">
        <Skeleton className={cn('h-4', nameWidth)} />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function InterviewDetails({ briefing }: { briefing: InterviewBriefing }) {
  const { interview } = briefing;

  return (
    <Card size="sm" className="gap-0">
      <CardHeader>
        <CardTitle>Interview details</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <dl className="grid gap-x-6 gap-y-4 text-copy-14 sm:grid-cols-2">
          {interview.scheduledAt && (
            <BriefingDetail icon={CalendarBlankIcon} label="Date and time">
              {formatDate(interview.scheduledAt, 'EEE, MMM d · h:mm a')}
            </BriefingDetail>
          )}

          <BriefingDetail icon={ClockIcon} label="Duration">
            {interview.durationMinutes} min
          </BriefingDetail>

          {interview.location && (
            <BriefingDetail icon={MapPinIcon} label="Location">
              {interview.location}
            </BriefingDetail>
          )}

          {interview.meetingUrl && interview.status !== InterviewStatus.COMPLETED && (
            <BriefingDetail icon={ArrowSquareOutIcon} label="Meeting">
              <Button variant="link" className="h-auto p-0" asChild>
                <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer">
                  Join meeting
                </a>
              </Button>
            </BriefingDetail>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function InterviewInstructions({ briefing }: { briefing: InterviewBriefing }) {
  const instructions = briefing.interview.instructions;
  const hasInstructions = instructions ? tipTapToPlainText(instructions).trim().length > 0 : false;

  return (
    <Card size="sm" className="gap-0">
      <CardHeader>
        <CardTitle>Interview instructions</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {hasInstructions && instructions ? (
          <RichTextEditor content={instructions} readOnly />
        ) : (
          <p className="text-copy-14 text-muted-foreground">No instructions were added for this interview.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InterviewPanel({ interviewers }: { interviewers: InterviewBriefing['interviewers'] }) {
  return (
    <Card size="sm" className="gap-0">
      <CardHeader>
        <CardTitle>Interviewers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-6 gap-y-4 pt-3">
        {interviewers.map((interviewer) => (
          <div key={interviewer.userId} className="flex min-w-44 items-center gap-2.5">
            <InitialsAvatar identity={{ name: interviewer.name }} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-label-14">{interviewer.name ?? 'Team member'}</p>
              <p className="text-copy-12 text-muted-foreground">{getInterviewerRoleLabel(interviewer.role)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getInterviewerRoleLabel(role: InterviewBriefing['interviewers'][number]['role']): string {
  if (role === 'lead') {
    return 'Lead interviewer';
  }

  if (role === 'shadow') {
    return 'Shadow interviewer';
  }

  return 'Interviewer';
}

function getInitialTab(interview: MyInterview): BriefingTab {
  return isInterviewFeedbackDue(interview) ? 'feedback' : 'overview';
}

function isBriefingTab(value: string): value is BriefingTab {
  return BRIEFING_TABS.some((tab) => tab === value);
}

interface BriefingDetailProps {
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

function BriefingDetail({ children, icon: Icon, label }: BriefingDetailProps) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-label-12 text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-foreground">{children}</dd>
      </div>
    </div>
  );
}
