import type { OtherApplicationSummary } from '@comitium/schemas/applications';
import { PageContainer } from '@comitium/ui/page-container';
import { useCallback, useMemo, useRef, useState } from 'react';
import { CandidateSheetMount, type CandidateSheetSelection } from '@/components/features/candidate-sheet';
import { useQueryMyInterviews } from '@/hooks/queries/use-query-interviews';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryPipelineCandidates } from '@/hooks/queries/use-query-pipeline-candidates';
import { useQueryPipelineJobs } from '@/hooks/queries/use-query-pipeline-jobs';
import { useQueryPipelineSummary } from '@/hooks/queries/use-query-pipeline-summary';
import { useDecryptCandidateNames } from '@/hooks/use-decrypt-candidate-names';
import type { MyInterview } from '@/lib/schemas/interviews';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { ActivitiesCard } from './activities-card';
import { ApplicationReviewCard } from './application-review-card';
import {
  EMPTY_CANDIDATES,
  EMPTY_INTERVIEWS,
  EMPTY_JOBS,
  getApplicationReviewQueue,
  getHomeInterviews,
  getSchedulingAttentionCount,
  JOBS_HOME_LIMIT,
  REVIEW_QUEUE_LIMIT,
} from './home-data';
import { InterviewBriefingSheet } from './interview-briefing-sheet';
import { InterviewsCard } from './interviews-card';
import { JobsCard } from './jobs-card';

const INTERVIEWS_HOME_LIMIT = 8;

interface OrgHomePageProps {
  org: MyOrg;
}

export function OrgHomePage({ org }: OrgHomePageProps) {
  const [selectedApplication, setSelectedApplication] = useState<CandidateSheetSelection | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<MyInterview | null>(null);
  const [interviewSheetSession, setInterviewSheetSession] = useState(0);
  const lastInterviewRef = useRef<MyInterview | null>(null);
  const { data: summary, isLoading: isSummaryLoading } = useQueryPipelineSummary(org.id);
  const { data: interviewsData, isLoading: isInterviewsLoading } = useQueryMyInterviews(org.id);
  const reviewQueueFilters = useMemo(
    () => ({ stageType: 'review' as const, view: 'active' as const, assignedToMe: true, limit: REVIEW_QUEUE_LIMIT }),
    [],
  );
  const jobsFilters = useMemo(() => ({ limit: JOBS_HOME_LIMIT }), []);
  const { data: reviewQueueData, isLoading: isReviewQueueLoading } = useQueryPipelineCandidates(
    org.id,
    reviewQueueFilters,
  );
  const { data: jobsData, isLoading: isJobsLoading } = useQueryPipelineJobs(org.id, jobsFilters);

  const interviews = interviewsData?.data ?? EMPTY_INTERVIEWS;
  const reviewCandidates = reviewQueueData?.data ?? EMPTY_CANDIDATES;
  const jobs = jobsData?.data ?? EMPTY_JOBS;
  const candidateNames = useDecryptCandidateNames(reviewCandidates, org.id);

  const homeInterviews = useMemo(() => getHomeInterviews(interviews, INTERVIEWS_HOME_LIMIT), [interviews]);
  const schedulingAttentionCount = useMemo(() => getSchedulingAttentionCount(interviews), [interviews]);
  const applicationReviewQueue = useMemo(() => getApplicationReviewQueue(reviewCandidates), [reviewCandidates]);
  const applicationReviewCandidateIds = useMemo(
    () => applicationReviewQueue.map((candidate) => candidate.id),
    [applicationReviewQueue],
  );
  const applicationReviewCount = reviewQueueData?.data.length ?? null;
  const jobsCount = summary?.jobCount ?? jobs.length;
  const offerCount = summary?.stageTypes.offer ?? null;
  const isActivitiesLoading = isInterviewsLoading || isReviewQueueLoading || isSummaryLoading;

  const selectApplication = useCallback(
    (candidate: PipelineCandidate): CandidateSheetSelection => ({
      id: candidate.id,
      jobId: candidate.jobId,
      jobOnChainId: candidate.jobOnChainId,
      jobTitle: candidate.jobTitle,
      stages: [],
    }),
    [],
  );

  const handleApplicationReviewOpen = useCallback(
    (candidate: PipelineCandidate) => {
      setSelectedApplication(selectApplication(candidate));
    },
    [selectApplication],
  );

  const handleSheetClose = useCallback(() => {
    setSelectedApplication(null);
  }, []);

  const handleSheetNavigate = useCallback(
    (applicationId: string) => {
      const candidate = applicationReviewQueue.find((item) => item.id === applicationId);

      if (candidate) {
        setSelectedApplication(selectApplication(candidate));
      }
    },
    [applicationReviewQueue, selectApplication],
  );

  const handleApplicationSwitch = useCallback((application: OtherApplicationSummary) => {
    setSelectedApplication({
      id: application.id,
      jobId: application.jobId,
      jobOnChainId: application.jobOnChainId,
      jobTitle: application.jobTitle,
      stages: [],
    });
  }, []);

  const handleInterviewOpen = useCallback((interview: MyInterview) => {
    setInterviewSheetSession((session) => session + 1);
    setSelectedInterview(interview);
  }, []);

  const handleBriefingOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSelectedInterview(null);
    }
  }, []);

  if (selectedInterview) {
    lastInterviewRef.current = selectedInterview;
  }

  const displayedInterview = selectedInterview ?? lastInterviewRef.current;

  return (
    <div className="h-full overflow-auto bg-background lg:overflow-hidden">
      <PageContainer className="grid grid-cols-1 items-start gap-4 py-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] lg:items-stretch">
        <section className="flex min-w-0 flex-col gap-4 lg:min-h-0">
          <ApplicationReviewCard
            candidates={applicationReviewQueue}
            className="lg:min-h-0 lg:flex-1 lg:max-h-[28rem]"
            isLoading={isReviewQueueLoading || isSummaryLoading}
            namesMap={candidateNames}
            onCandidateOpen={handleApplicationReviewOpen}
            orgId={org.id}
            totalCount={applicationReviewCount}
          />
          <InterviewsCard
            className="lg:min-h-[20rem] lg:flex-1"
            interviews={homeInterviews}
            isLoading={isInterviewsLoading}
            onInterviewOpen={handleInterviewOpen}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-4 lg:min-h-0">
          <ActivitiesCard
            applicationReviewCount={applicationReviewCount}
            interviewsToScheduleCount={schedulingAttentionCount}
            isLoading={isActivitiesLoading}
            offerCount={offerCount}
            orgId={org.id}
          />
          <JobsCard
            className="lg:min-h-0 lg:flex-1"
            isLoading={isJobsLoading || isSummaryLoading}
            jobs={jobs}
            orgId={org.id}
            totalCount={jobsCount}
          />
        </aside>
      </PageContainer>
      <CandidateSheetMount
        selectedApp={selectedApplication}
        orgId={org.id}
        onClose={handleSheetClose}
        onNavigate={handleSheetNavigate}
        onApplicationSwitch={handleApplicationSwitch}
        candidateIds={applicationReviewCandidateIds}
      />
      {displayedInterview && (
        <InterviewBriefingSheet
          key={interviewSheetSession}
          interview={displayedInterview}
          open={selectedInterview !== null}
          onOpenChange={handleBriefingOpenChange}
          orgId={org.id}
        />
      )}
    </div>
  );
}
