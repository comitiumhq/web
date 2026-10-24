import { QueryClient, type QueryKey, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSaveJobEditor } from '@/components/features/job-settings/use-save-job-editor';
import { qk } from '@/hooks/query-keys';
import { useUpdateJobPosting } from '../use-job-posting-mutations';
import { useUpdateJobTemplate } from '../use-job-template-mutations';

interface MutationOptions {
  onSuccess: (result: never, variables: never) => unknown;
}

const mocks = vi.hoisted(() => ({
  queryClient: null as QueryClient | null,
  mutationOptions: null as MutationOptions | null,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useQueryClient: () => mocks.queryClient,
    useMutation: (options: MutationOptions) => {
      mocks.mutationOptions = options;

      return {};
    },
  };
});

const target = { orgId: 'org', jobId: 'job' };
const subscriptions: (() => void)[] = [];
let queryClient: QueryClient;

async function cached(queryKey: QueryKey, active = false) {
  const options = { queryKey, queryFn: vi.fn(async () => null) };

  await queryClient.fetchQuery(options);

  if (active) {
    const observer = new QueryObserver(queryClient, options);

    subscriptions.push(observer.subscribe(() => {}));
  }

  return options;
}

async function saved(setup: () => unknown, result: unknown, variables: unknown) {
  setup();

  const options = mocks.mutationOptions;

  if (!options) {
    throw new Error('Mutation options were not registered');
  }

  await options.onSuccess(result as never, variables as never);
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  mocks.queryClient = queryClient;
  mocks.mutationOptions = null;
});

afterEach(() => {
  for (const unsubscribe of subscriptions.splice(0)) {
    unsubscribe();
  }

  queryClient.clear();
});

describe('Editor autosave cache synchronization', () => {
  it('refreshes the open Job while hidden lists wait until they are opened', async () => {
    const [editor, summary, posting, jobs, archived, drafts, activities, forms] = await Promise.all([
      cached(qk.jobs.editor(target.orgId, target.jobId), true),
      cached(qk.jobs.summary(target.jobId), true),
      cached(qk.jobs.posting(target.orgId, target.jobId)),
      cached(qk.jobs.orgAllPages(target.orgId)),
      cached(qk.jobs.archivedAllPages(target.orgId)),
      cached(qk.jobs.draftsAllPages(target.orgId)),
      cached(qk.stageActivities.job(target.jobId), true),
      cached(qk.settings.formsList(target.orgId, {}), true),
    ]);

    await saved(
      () => useSaveJobEditor(target.orgId, target.jobId),
      { success: true, version: 2 },
      {
        employmentType: 'contract',
        expectedVersion: 1,
      },
    );

    expect(editor.queryFn).toHaveBeenCalledTimes(2);
    expect(summary.queryFn).toHaveBeenCalledTimes(2);

    for (const query of [posting, jobs, archived, drafts]) {
      expect(query.queryFn).toHaveBeenCalledOnce();
      expect(queryClient.getQueryState(query.queryKey)?.isInvalidated).toBe(true);
    }

    expect(activities.queryFn).toHaveBeenCalledOnce();
    expect(forms.queryFn).toHaveBeenCalledOnce();

    const observer = new QueryObserver(queryClient, jobs);

    subscriptions.push(observer.subscribe(() => {}));
    await vi.waitFor(() => expect(jobs.queryFn).toHaveBeenCalledTimes(2));
  });

  it('refreshes stages and activities only for the Job whose plan changed', async () => {
    const [pipeline, activities, options, otherJob] = await Promise.all([
      cached(qk.jobs.pipeline(target.jobId), true),
      cached(qk.stageActivities.job(target.jobId), true),
      cached(qk.stageActivities.jobOptions(target.jobId), true),
      cached(qk.stageActivities.job('other-job'), true),
    ]);

    await saved(
      () => useSaveJobEditor(target.orgId, target.jobId),
      { success: true, version: 2 },
      {
        interviewPlanId: 'plan',
        expectedVersion: 1,
      },
    );

    expect(pipeline.queryFn).toHaveBeenCalledTimes(2);
    expect(activities.queryFn).toHaveBeenCalledTimes(2);
    expect(options.queryFn).toHaveBeenCalledTimes(2);
    expect(otherJob.queryFn).toHaveBeenCalledOnce();
  });

  it('uses the returned Posting without reading it again and refreshes usage when its form is cleared', async () => {
    const [posting, jobs, usage] = await Promise.all([
      cached(qk.jobs.posting(target.orgId, target.jobId), true),
      cached(qk.jobs.orgAllPages(target.orgId)),
      cached(qk.settings.formUsage(target.orgId, 'old-form'), true),
    ]);
    const response = { id: 'posting', version: 2, form: null };

    await saved(() => useUpdateJobPosting(target), response, { formId: null, expectedVersion: 1 });

    expect(queryClient.getQueryData(posting.queryKey)).toEqual(response);
    expect(posting.queryFn).toHaveBeenCalledOnce();
    expect(jobs.queryFn).toHaveBeenCalledOnce();
    expect(queryClient.getQueryState(jobs.queryKey)?.isInvalidated).toBe(true);
    await vi.waitFor(() => expect(usage.queryFn).toHaveBeenCalledTimes(2));
  });

  it('prevents an older Posting read from replacing the successful mutation response', async () => {
    const postingKey = qk.jobs.posting(target.orgId, target.jobId);
    const previous = { id: 'posting', version: 1, description: null };
    const response = { ...previous, version: 2 };
    let resolveRead!: (posting: typeof previous) => void;
    const pendingRead = new Promise<typeof previous>((resolve) => {
      resolveRead = resolve;
    });

    queryClient.setQueryData(postingKey, previous);

    const read = queryClient
      .fetchQuery({ queryKey: postingKey, queryFn: () => pendingRead, staleTime: 0 })
      .catch(() => undefined);

    await saved(() => useUpdateJobPosting(target), response, { description: null, expectedVersion: 1 });

    resolveRead(previous);
    await read;

    expect(queryClient.getQueryData(postingKey)).toEqual(response);
  });

  it('refreshes the open template without refreshing unrelated activities or form usage', async () => {
    const [template, templates, activities, usage] = await Promise.all([
      cached(qk.templates.job(target.orgId, 'template'), true),
      cached(qk.templates.jobs(target.orgId, {}), true),
      cached(qk.stageActivities.template(target.orgId, 'template'), true),
      cached(qk.settings.formUsage(target.orgId, 'form'), true),
    ]);

    await saved(
      useUpdateJobTemplate,
      { success: true },
      {
        orgId: target.orgId,
        templateId: 'template',
        body: { employmentType: 'contract' },
      },
    );

    expect(template.queryFn).toHaveBeenCalledTimes(2);
    expect(templates.queryFn).toHaveBeenCalledTimes(2);
    expect(activities.queryFn).toHaveBeenCalledOnce();
    expect(usage.queryFn).toHaveBeenCalledOnce();
  });

  it('refreshes only the affected template activities when its plan changes', async () => {
    const [activities, options, otherTemplate, job] = await Promise.all([
      cached(qk.stageActivities.template(target.orgId, 'template'), true),
      cached(qk.stageActivities.templateOptions(target.orgId, 'template'), true),
      cached(qk.stageActivities.template(target.orgId, 'other-template'), true),
      cached(qk.stageActivities.job(target.jobId), true),
    ]);

    await saved(
      useUpdateJobTemplate,
      { success: true },
      {
        orgId: target.orgId,
        templateId: 'template',
        body: { interviewPlanId: null },
      },
    );

    expect(activities.queryFn).toHaveBeenCalledTimes(2);
    expect(options.queryFn).toHaveBeenCalledTimes(2);
    expect(otherTemplate.queryFn).toHaveBeenCalledOnce();
    expect(job.queryFn).toHaveBeenCalledOnce();
  });
});
