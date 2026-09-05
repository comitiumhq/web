import type { CareerJob } from '@comitium/jobs/schemas';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ApplicationForm } from './index';

const mocks = vi.hoisted(() => ({
  session: {
    isSessionLoading: false,
    isSignedIn: false,
    user: null as { id: string } | null,
  },
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal()),
  useQuery: () => ({ data: null, isFetching: false }),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ children, search, to }: { children: ReactNode; search: { returnTo: string }; to: string }) => (
    <a href={`${to}?returnTo=${encodeURIComponent(search.returnTo)}`}>{children}</a>
  ),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: {
        hash: '#apply',
        pathname: '/careers/comitium/jobs/frontend-engineer',
        searchStr: '?source=board',
      },
    }),
}));

vi.mock('@/hooks/mutations/use-apply-job', () => ({
  useApplyJob: () => ({
    submit: vi.fn(),
    isPending: false,
    isConfirming: false,
  }),
}));

const applicationProps = {} as ComponentProps<typeof ApplicationForm>;
const RESUME_QUESTION_ID = '11111111-1111-4111-8111-111111111111';

const resumeForm: NestedForm = {
  form: {
    id: '22222222-2222-4222-8222-222222222222',
    formClass: 'application',
    title: 'Application',
  },
  sections: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      position: 0,
      title: 'Application',
      questions: [
        {
          id: RESUME_QUESTION_ID,
          position: 0,
          questionType: 'resume',
          prompt: 'Resume',
          description: null,
          isRequired: false,
          isPrivate: false,
          visibility: 'standard',
          selectableValues: null,
          config: null,
          reusableField: null,
        },
      ],
    },
  ],
};

const jobData: JobApplicationData = {
  id: '44444444-4444-4444-8444-444444444444',
  postingId: '55555555-5555-4555-8555-555555555555',
  chainId: 84532,
  jobId: 1,
  commitmentContract: '0x1111111111111111111111111111111111111111',
  orgId: '66666666-6666-4666-8666-666666666666',
  creatorAddress: '0x2222222222222222222222222222222222222222',
};

const policy: CareerJob['recruitingPrivacy'] = {
  controllerName: 'Comitium',
  privacyPolicyUrl: 'https://example.com/privacy',
  aiCriteriaEvaluation: {
    enabled: true,
    additionalNotice: null,
    additionalNoticeUrl: null,
  },
};

const authenticatedApplicationProps: ComponentProps<typeof ApplicationForm> = {
  applyForm: resumeForm,
  jobData,
  jobTitle: 'Product Designer',
  company: 'Comitium',
  responseDeadlineDays: 14,
  policy,
};

beforeEach(() => {
  localStorage.clear();
  mocks.session = {
    isSessionLoading: false,
    isSignedIn: false,
    user: null,
  };
});

describe('ApplicationForm', () => {
  it('requires sign-in before rendering fields so an OAuth reload cannot discard entered answers', async () => {
    const screen = await render(<ApplicationForm {...applicationProps} />);

    await expect.element(screen.getByRole('heading', { name: 'Sign in to apply' })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'Sign in' }))
      .toHaveAttribute(
        'href',
        '/login?returnTo=%2Fcareers%2Fcomitium%2Fjobs%2Ffrontend-engineer%3Fsource%3Dboard%23apply',
      );
  });

  it('does not flash the sign-in prompt while the existing session is resolving', async () => {
    mocks.session = {
      isSessionLoading: true,
      isSignedIn: false,
      user: null,
    };
    const screen = await render(<ApplicationForm {...applicationProps} />);

    await expect.element(screen.getByLabelText('Loading application form')).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows resume-processing details only while the authenticated applicant has selected a resume', async () => {
    mocks.session = {
      isSessionLoading: false,
      isSignedIn: true,
      user: { id: 'applicant-1' },
    };
    const screen = await render(<ApplicationForm {...authenticatedApplicationProps} />);

    await expect
      .element(screen.getByText('Your application is encrypted and available to authorized hiring-team members.'))
      .toBeInTheDocument();
    await expect.element(screen.getByText(/AI-assisted resume processing may be used/)).not.toBeInTheDocument();

    await userEvent.upload(
      screen.getByLabelText('Resume PDF file'),
      new File(['resume'], 'resume.pdf', { type: 'application/pdf' }),
    );

    await expect.element(screen.getByText(/AI-assisted resume processing may be used/)).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Learn more' }).click();
    await expect
      .element(screen.getByRole('heading', { name: 'Resume processing and AI assistance' }))
      .toBeInTheDocument();
    const optOut = screen.getByRole('checkbox', {
      name: 'Do not use AI-assisted evaluation for my application',
    });
    await expect.element(optOut).not.toBeChecked();
    await optOut.click();
    await expect.element(optOut).toBeChecked();

    await userEvent.keyboard('{Escape}');
    await expect
      .element(screen.getByRole('heading', { name: 'Resume processing and AI assistance' }))
      .not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Remove resume.pdf' }).click();

    await expect.element(screen.getByText(/AI-assisted resume processing may be used/)).not.toBeInTheDocument();
    await expect
      .element(screen.getByText('Your application is encrypted and available to authorized hiring-team members.'))
      .toBeInTheDocument();
  });
});
