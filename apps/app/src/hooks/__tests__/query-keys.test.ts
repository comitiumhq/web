import { describe, expect, it } from 'vitest';

import { qk } from '@/hooks/query-keys';

describe('query key factory', () => {
  it('keeps existing org key topology stable', () => {
    expect(qk.orgs.my()).toEqual(['orgs', 'my']);
    expect(qk.org.team('org-1')).toEqual(['org', 'org-1', 'team']);
    expect(qk.org.teamMember('org-1', 'user-1')).toEqual(['org', 'org-1', 'team-member', 'user-1']);
    expect(qk.org.memberAccess('org-1', 'user-1')).toEqual(['org', 'org-1', 'members', 'user-1', 'access']);
    expect(qk.org.permissions('org-1')).toEqual(['org-permissions', 'org-1']);
    expect(qk.orgs.creation()).toEqual(['orgs', 'creation']);
  });

  it('keeps application surface invalidation prefixes stable', () => {
    expect(qk.application.root()).toEqual(['application']);
    expect(qk.application.detail('app-1')).toEqual(['application', 'app-1']);
    expect(qk.application.emails('app-1')).toEqual(['emails', 'app-1']);
    expect(qk.application.interviewProgress('app-1')).toEqual(['application', 'app-1', 'interview-progress']);
  });

  it('keeps job and pipeline prefixes stable', () => {
    expect(qk.jobs.detail('job-1')).toEqual(['job', 'job-1']);
    expect(qk.jobs.summary('job-1')).toEqual(['job', 'job-1', 'summary']);
    expect(qk.jobs.kanbanRoot('job-1')).toEqual(['jobs', 'job-1', 'kanban']);
    expect(qk.jobs.archivedKanban('job-1')).toEqual(['jobs', 'job-1', 'kanban', 'archived']);
    expect(qk.pipeline.root()).toEqual(['pipeline']);
    expect(qk.pipeline.candidatesRoot()).toEqual(['pipeline', 'candidates']);
    expect(qk.jobs.isKanban(['jobs', 'job-1', 'kanban', {}])).toBe(true);
  });
});
