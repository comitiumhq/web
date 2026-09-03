import type { QueryKey } from '@tanstack/react-query';

export const qk = {
  auth: {
    sessionRoot: () => ['auth', 'session'] as const,
    session: (privyUserId: string | null) => ['auth', 'session', privyUserId] as const,
  },
  cities: {
    search: (query: string) => ['cities', query] as const,
  },
  orgs: {
    my: () => ['orgs', 'my'] as const,
    creation: () => ['orgs', 'creation'] as const,
  },
  invite: {
    detail: (token: string | null) => ['invite', token] as const,
  },
  org: {
    detail: (orgId?: string | null) => ['org', orgId] as const,
    permissions: (orgId?: string | null) => ['org-permissions', orgId] as const,
    team: (orgId?: string) => ['org', orgId, 'team'] as const,
    teamMember: (orgId?: string, userId?: string) => ['org', orgId, 'team-member', userId] as const,
    teamCalendarStatus: (orgId?: string) => ['org', orgId, 'team', 'calendar-status'] as const,
    departmentsRoot: (orgId: string | null) => ['org', orgId, 'departments'] as const,
    departments: (orgId: string | null, params: unknown) => ['org', orgId, 'departments', params] as const,
    departmentGrants: (orgId: string, departmentId: string) =>
      ['org', orgId, 'departments', departmentId, 'grants'] as const,
    locationsRoot: (orgId: string | null) => ['org', orgId, 'locations'] as const,
    locations: (orgId: string | null, params: unknown) => ['org', orgId, 'locations', params] as const,
    memberAccess: (orgId: string | null, userId: string | null) => ['org', orgId, 'members', userId, 'access'] as const,
    invites: (orgId?: string) => ['org', orgId, 'invites'] as const,
    vaultKey: (orgId?: string) => ['org', orgId, 'vault-key'] as const,
    vaultAccess: (orgId?: string) => ['org', orgId, 'vault-access'] as const,
    encryptionSetup: (orgId: string | null) => ['org', orgId, 'encryption-setup'] as const,
  },
  application: {
    root: () => ['application'] as const,
    detail: (applicationId?: string | null) => ['application', applicationId] as const,
    otherApplications: (applicationId: string | null) => ['application', applicationId, 'other-applications'] as const,
    duplicateAttempts: (applicationId: string | null) => ['application', applicationId, 'duplicate-attempts'] as const,
    emails: (applicationId: string | null) => ['emails', applicationId] as const,
    interviews: (applicationId: string | null) => ['interviews', 'application', applicationId] as const,
    interviewProgress: (applicationId: string | null) => ['application', applicationId, 'interview-progress'] as const,
    interviewBriefing: (applicationId?: string, interviewEventId?: string) =>
      ['application', applicationId, 'interview-briefing', interviewEventId] as const,
    emailTemplateOptions: (applicationId: string | undefined, params: unknown) =>
      ['application', applicationId, 'email-template-options', params] as const,
    feedbackSubmissions: (applicationId?: string, interviewEventId?: string) =>
      interviewEventId
        ? (['feedback-submissions', applicationId, 'interview', interviewEventId] as const)
        : (['feedback-submissions', applicationId] as const),
    formSubmission: (applicationId: string | null) => ['application-form-submission', applicationId] as const,
    candidateProfileInput: (applicationId: string | null) =>
      ['application', applicationId, 'candidate-profile-input'] as const,
    candidateIdentityInputs: (applicationId: string | null, questionIds: string[]) =>
      ['application', applicationId, 'identities', questionIds] as const,
    candidateCustomFieldValues: (candidateId: string | null) => ['candidate-custom-field-values', candidateId] as const,
    candidateNotes: (candidateId: string | null) => ['candidate-notes', candidateId] as const,
  },
  candidate: {
    detail: (candidateId?: string | null) => ['candidate', candidateId] as const,
    files: (candidateId?: string | null) => ['candidate', candidateId, 'files'] as const,
    applicationTargetsRoot: (candidateId?: string | null) => ['candidate', candidateId, 'application-targets'] as const,
    applicationTargets: (candidateId: string | null | undefined, filters: unknown) =>
      ['candidate', candidateId, 'application-targets', filters] as const,
    tags: (orgId: string) => ['candidate-tags', orgId] as const,
    formConnectorsRoot: (formId: string | null) => ['candidate-form-connectors', formId] as const,
    formConnectors: (candidateId: string | null, formId: string | null) =>
      ['candidate-form-connectors', formId, candidateId] as const,
    activityRoot: () => ['candidate-activity'] as const,
    activity: (candidateId: string | null, applicationId: string | null) =>
      ['candidate-activity', candidateId, applicationId] as const,
  },
  pipeline: {
    root: () => ['pipeline'] as const,
    summary: (orgId?: string) => ['pipeline', 'summary', orgId] as const,
    jobs: (orgId: string | undefined, filters: unknown) => ['pipeline', 'jobs', orgId, filters] as const,
    infiniteJobs: (orgId: string | undefined, filters: unknown) =>
      ['pipeline', 'jobs', 'infinite', orgId, filters] as const,
    candidatesRoot: () => ['pipeline', 'candidates'] as const,
    candidates: (orgId: string | undefined, filters: unknown) => ['pipeline', 'candidates', orgId, filters] as const,
    infiniteCandidates: (orgId: string | undefined, filters: unknown) =>
      ['pipeline', 'candidates', 'infinite', orgId, filters] as const,
    bulkOperationCapabilities: (orgId: string | null) => ['bulk-operations', orgId, 'capabilities'] as const,
    bulkOperation: (orgId: string, operationId: string | null) => ['bulk-operations', orgId, operationId] as const,
  },
  jobs: {
    root: () => ['jobs'] as const,
    detail: (jobId: string) => ['job', jobId] as const,
    summary: (jobId: string | null) => ['job', jobId, 'summary'] as const,
    orgRoot: (orgId?: string) => ['jobs', 'org', orgId] as const,
    org: (orgId: string | undefined, filters: unknown) => ['jobs', 'org', orgId, filters] as const,
    orgAllPages: (orgId?: string) => ['jobs', 'org', orgId, 'all-pages'] as const,
    draftsRoot: () => ['jobs', 'drafts'] as const,
    draftsOrg: (orgId: string) => ['jobs', 'drafts', orgId] as const,
    drafts: (orgId: string, filters: unknown) => ['jobs', 'drafts', orgId, filters] as const,
    draftsAllPages: (orgId?: string) => ['jobs', 'drafts', orgId, 'all-pages'] as const,
    draftRoot: () => ['jobs', 'draft'] as const,
    draft: (orgId: string, jobId: string) => ['jobs', 'draft', orgId, jobId] as const,
    pipeline: (jobId: string | null) => ['jobs', jobId, 'pipeline'] as const,
    kanbanRoot: (jobId: string) => ['jobs', jobId, 'kanban'] as const,
    kanban: (jobId: string | null, filters: unknown) => ['jobs', jobId, 'kanban', filters] as const,
    kanbanStagePage: (jobId: string, filters: unknown, stageId: string, cursor: string) =>
      ['jobs', jobId, 'kanban', 'stage-page', filters, stageId, cursor] as const,
    archivedKanban: (jobId: string | null) => ['jobs', jobId, 'kanban', 'archived'] as const,
    applications: (jobId: string) => ['jobs', jobId, 'applications'] as const,
    hiringTeam: (jobId?: string) => ['job', jobId, 'hiring-team'] as const,
    accessMeRoot: () => ['job-access', 'me'] as const,
    accessMe: (jobId: string) => ['job-access', 'me', jobId] as const,
    isKanban: (queryKey: QueryKey) => queryKey[0] === 'jobs' && queryKey[2] === 'kanban',
  },
  applicationFormOptions: {
    root: () => ['application-form-options'] as const,
    job: (jobId: string) => ['application-form-options', 'job', jobId] as const,
    jobTemplate: (orgId: string) => ['application-form-options', 'job-template', orgId] as const,
  },
  jobConfig: {
    current: () => ['job-config'] as const,
    stakeToken: () => ['stake-token'] as const,
  },
  templates: {
    jobsRoot: (orgId?: string) => ['job-templates', orgId] as const,
    jobs: (orgId: string | undefined, params: unknown) => ['job-templates', orgId, params] as const,
    job: (orgId?: string, templateId?: string) => ['job-templates', orgId, templateId] as const,
    interviewsAllRoot: () => ['interview-templates'] as const,
    interviewsRoot: (orgId?: string) => ['interview-templates', orgId] as const,
    interviews: (orgId: string | undefined, params: unknown) => ['interview-templates', orgId, params] as const,
    interview: (orgId?: string, id?: string) => ['interview-templates', orgId, id] as const,
    interviewFeedbackFormOptions: (orgId?: string) => ['interview-templates', orgId, 'feedback-form-options'] as const,
    interviewUsage: (orgId?: string, id?: string) => ['interview-templates', orgId, id, 'usage'] as const,
    emailAllRoot: () => ['email-templates'] as const,
    emailRoot: (orgId?: string) => ['email-templates', orgId] as const,
    email: (orgId: string | undefined, params: unknown) => ['email-templates', orgId, params] as const,
    emailUsage: (orgId?: string, id?: string) => ['email-templates', orgId, id, 'usage'] as const,
  },
  settings: {
    dataPrivacy: (orgId: string) => ['data-privacy', orgId] as const,
    closeReasonsListRoot: (orgId: string) => ['close-reasons-list', orgId] as const,
    closeReasonsList: (orgId: string | null, params: unknown) => ['close-reasons-list', orgId, params] as const,
    archiveReasonsListRoot: (orgId: string) => ['archive-reasons-list', orgId] as const,
    archiveReasonsList: (orgId: string | null, params: unknown) => ['archive-reasons-list', orgId, params] as const,
    cancelRescheduleReasonsRoot: (orgId: string) => ['cancel-reschedule-reasons', orgId] as const,
    cancelRescheduleReasons: (orgId: string | null, params: unknown) =>
      ['cancel-reschedule-reasons', orgId, params] as const,
    customFieldsListRoot: (orgId: string) => ['custom-fields-list', orgId] as const,
    customFieldsList: (orgId: string | null, params: unknown) => ['custom-fields-list', orgId, params] as const,
    formsRoot: () => ['forms-list'] as const,
    formsListRoot: (orgId: string) => ['forms-list', orgId] as const,
    formsList: (orgId: string | null, params: unknown) => ['forms-list', orgId, params] as const,
    form: (orgId: string | null, formId: string | null) => ['form', orgId, formId] as const,
    formUsageRoot: () => ['form-usage'] as const,
    formUsage: (orgId: string | null, formId: string | null) => ['form-usage', orgId, formId] as const,
    formConnectors: (orgId: string | null, formId: string | null) => ['form-connectors', orgId, formId] as const,
    substitutionTokens: (orgId: string | null, registry: string) => ['substitution-tokens', orgId, registry] as const,
  },
  interviewPlans: {
    root: (orgId?: string) => ['interview-plans', orgId] as const,
    list: (orgId: string | undefined, params: unknown) => ['interview-plans', orgId, params] as const,
    detail: (orgId?: string, planId?: string) => ['interview-plans', orgId, planId] as const,
    usage: (orgId: string, planId: string) => ['interview-plans', orgId, planId, 'usage'] as const,
  },
  stageActivities: {
    root: () => ['stage-activities'] as const,
    job: (jobId?: string) => ['stage-activities', 'job', jobId] as const,
    template: (orgId?: string, templateId?: string) => ['stage-activities', 'job-template', orgId, templateId] as const,
    jobOptions: (jobId?: string) => ['stage-activities', 'job', jobId, 'options'] as const,
    templateOptions: (orgId?: string, templateId?: string) =>
      ['stage-activities', 'job-template', orgId, templateId, 'options'] as const,
    stage: (jobId?: string, stageId?: string | null) => ['stage-activities', 'stage', jobId, stageId] as const,
  },
  balance: {
    walletRoot: () => ['wallet-balance'] as const,
    wallet: (stakeToken?: string, address?: string) => ['wallet-balance', stakeToken, address] as const,
    orgRoot: () => ['org-balance'] as const,
    org: (orgId?: number) => ['org-balance', orgId] as const,
    orgHistoryRoot: () => ['org-balance-history'] as const,
    orgHistory: (orgId: string) => ['org-balance-history', orgId] as const,
    orgTreasury: (orgId: string) => ['org-treasury', orgId] as const,
  },
  calendar: {
    token: (orgId?: string) => ['cal', 'token', orgId] as const,
    status: (orgId?: string) => ['cal', 'calendar-status', orgId] as const,
  },
  interviews: {
    rsvp: (applicationId?: string, interviewId?: string) => ['interview-rsvp', applicationId, interviewId] as const,
    busy: (
      applicationId: string | undefined,
      interviewerKey: string,
      startTime: string | undefined,
      endTime: string | undefined,
      timeZone: string,
    ) => ['interview-busy', applicationId, interviewerKey, startTime, endTime, timeZone] as const,
    my: (orgId?: string) => ['interviews', 'my', orgId] as const,
  },
};
