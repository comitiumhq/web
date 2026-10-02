import type { CareerJob } from '@comitium/jobs/schemas';
import type { NestedForm } from '@comitium/schemas/forms/form-definitions';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { TooltipProvider } from '@comitium/ui/tooltip';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ApplicationForm } from './index';

const mocks = vi.hoisted(() => ({
  applicationStatus: { hasApplied: false },
  submitApplication: vi.fn(),
  session: {
    isSessionLoading: false,
    isSignedIn: false,
    user: null as { id: string } | null,
  },
  zkIdentityStatus: { status: 'verified' } as { status: 'verified' | 'not_started'; verifiedAt?: string },
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@comitium/auth/use-wallet', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal()),
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) =>
    queryKey[0] === 'account'
      ? { data: mocks.zkIdentityStatus, isError: false, isFetching: false, isLoading: false }
      : { data: mocks.applicationStatus, isError: false, isFetching: false, isLoading: false },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ children, search, to }: { children: ReactNode; search?: { returnTo: string }; to: string }) => {
    const href = search ? `${to}?returnTo=${encodeURIComponent(search.returnTo)}` : to;

    return <a href={href}>{children}</a>;
  },
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
  useApplyJob: ({ onCompleted }: { onCompleted: () => void }) => ({
    submit: (input: unknown) => {
      mocks.submitApplication(input);
      onCompleted();
    },
    isPending: false,
    isConfirming: false,
  }),
}));

const RESUME_QUESTION_ID = '11111111-1111-4111-8111-111111111111';
const FIRST_NAME_QUESTION_ID = '77777777-7777-4777-8777-777777777777';
const LAST_NAME_QUESTION_ID = '88888888-8888-4888-8888-888888888888';
const EMAIL_QUESTION_ID = '99999999-9999-4999-8999-999999999999';

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

const applicationForm: NestedForm = {
  form: resumeForm.form,
  sections: [
    {
      ...resumeForm.sections[0],
      questions: [
        {
          id: FIRST_NAME_QUESTION_ID,
          position: 0,
          questionType: 'short_answer',
          prompt: 'First name',
          description: null,
          isRequired: true,
          isPrivate: false,
          visibility: 'standard',
          selectableValues: null,
          config: { candidateProfileField: 'first_name' },
          reusableField: null,
        },
        {
          id: LAST_NAME_QUESTION_ID,
          position: 1,
          questionType: 'short_answer',
          prompt: 'Last name',
          description: null,
          isRequired: true,
          isPrivate: false,
          visibility: 'standard',
          selectableValues: null,
          config: { candidateProfileField: 'last_name' },
          reusableField: null,
        },
        {
          id: EMAIL_QUESTION_ID,
          position: 2,
          questionType: 'email',
          prompt: 'Email',
          description: null,
          isRequired: true,
          isLocked: true,
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
  orgId: '66666666-6666-4666-8666-666666666666',
  skillsRevision: 0,
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
  policy,
};

beforeEach(() => {
  localStorage.clear();
  mocks.applicationStatus = { hasApplied: false };
  mocks.session = {
    isSessionLoading: false,
    isSignedIn: false,
    user: null,
  };
  mocks.submitApplication.mockReset();
  mocks.zkIdentityStatus = { status: 'verified' };
});

describe('ApplicationForm', () => {
  it('requires sign-in before rendering fields so an OAuth reload cannot discard entered answers', async () => {
    const screen = await render(<ApplicationForm {...authenticatedApplicationProps} />);

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
    const screen = await render(<ApplicationForm {...authenticatedApplicationProps} />);

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

  it('submits an Application through the unified flow', async () => {
    mocks.session = {
      isSessionLoading: false,
      isSignedIn: true,
      user: { id: 'applicant-1' },
    };
    const screen = await render(<ApplicationForm {...authenticatedApplicationProps} applyForm={applicationForm} />);

    await expect.element(screen.getByRole('button', { name: 'Submit application' })).toBeEnabled();
    await expect.element(screen.getByRole('button', { name: 'Continue' })).not.toBeInTheDocument();

    const nameInputs = screen.getByPlaceholder('Type your answer...');
    await nameInputs.nth(0).fill('Ada');
    await nameInputs.nth(1).fill('Lovelace');
    await screen.getByPlaceholder('name@example.com').fill('ada@example.com');
    await screen.getByRole('button', { name: 'Submit application' }).click();

    expect(mocks.submitApplication).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        jobData,
        formId: applicationForm.form.id,
        candidateProfileInput: { firstName: 'Ada', lastName: 'Lovelace', location: null },
      }),
    );
    await expect.element(screen.getByRole('heading', { name: 'Application Submitted' })).toBeInTheDocument();
  });

  it('shows the submitted state for an existing Application', async () => {
    mocks.session = {
      isSessionLoading: false,
      isSignedIn: true,
      user: { id: 'applicant-1' },
    };
    mocks.applicationStatus = { hasApplied: true };
    const screen = await render(<ApplicationForm {...authenticatedApplicationProps} applyForm={applicationForm} />);

    await expect.element(screen.getByRole('heading', { name: 'Application Submitted' })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
  });

  it('keeps the Application Form visible and explains why submission requires ZK Identity', async () => {
    mocks.session = {
      isSessionLoading: false,
      isSignedIn: true,
      user: { id: 'applicant-1' },
    };
    mocks.zkIdentityStatus = { status: 'not_started' };
    const screen = await render(
      <TooltipProvider>
        <ApplicationForm {...authenticatedApplicationProps} applyForm={applicationForm} />
      </TooltipProvider>,
    );

    const submitButton = screen.getByRole('button', { name: 'Submit application' });

    await expect.element(screen.getByPlaceholder('name@example.com')).toBeInTheDocument();
    await expect.element(submitButton).toHaveAttribute('aria-disabled', 'true');
    await submitButton.hover();
    const tooltip = screen.getByRole('tooltip');

    await expect.element(tooltip).toHaveTextContent('Complete ZK Identity before submitting this application.');
    await expect
      .element(tooltip.getByRole('link', { name: 'Open ZK Identity' }))
      .toHaveAttribute('href', '/account/zk-identity');
  });
});
