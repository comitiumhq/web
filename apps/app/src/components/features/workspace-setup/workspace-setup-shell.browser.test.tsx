import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { WorkspaceSetup } from '@/lib/schemas/org';
import { WorkspaceSetupShell } from './workspace-setup-shell';

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  memberName: 'Admin' as string | null,
  memberIsError: false,
  memberIsLoading: false,
  setup: undefined as WorkspaceSetup | undefined,
  setupIsError: false,
  setupIsLoading: false,
  enabled: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ isAdmin: mocks.isAdmin }),
  useQueryOrgMe: () => ({
    data: mocks.memberIsLoading ? undefined : { name: mocks.memberName },
    isError: mocks.memberIsError,
    isLoading: mocks.memberIsLoading,
  }),
}));

vi.mock('@/hooks/queries/use-query-workspace-setup', () => ({
  useQueryWorkspaceSetup: (_orgId: string, enabled: boolean) => {
    mocks.enabled(enabled);

    return { data: mocks.setup, isError: mocks.setupIsError, isLoading: mocks.setupIsLoading };
  },
}));

vi.mock('./workspace-setup-card', () => ({
  WorkspaceSetupCard: ({ profileComplete, setup }: { profileComplete: boolean; setup?: WorkspaceSetup }) => (
    <section>
      Getting started card · profile {profileComplete ? 'complete' : 'incomplete'} ·{' '}
      {setup ? 'workspace' : 'personal only'}
    </section>
  ),
}));

function setup(complete = false): WorkspaceSetup {
  return {
    required: {
      companyDetails: { complete },
      department: { complete },
      location: { complete },
      recruitingPrivacy: { complete },
      firstJob: { complete },
    },
    recommended: { inviteTeammate: { complete: false } },
    completedRequired: complete ? 5 : 0,
    requiredTotal: 5,
    complete,
  };
}

beforeEach(() => {
  mocks.isAdmin = false;
  mocks.memberName = 'Admin';
  mocks.memberIsError = false;
  mocks.memberIsLoading = false;
  mocks.setup = undefined;
  mocks.setupIsError = false;
  mocks.setupIsLoading = false;
  mocks.enabled.mockClear();
});

describe('workspace setup shell', () => {
  it('combines the completed personal step with incomplete workspace setup for an admin', async () => {
    mocks.isAdmin = true;
    mocks.setup = setup();
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
    await expect.element(screen.getByRole('complementary', { name: 'Getting started' })).toBeInTheDocument();
    await expect.element(screen.getByText('Getting started card · profile complete · workspace')).toBeInTheDocument();
    const setupAside = document.querySelector('aside[aria-label="Getting started"]');
    expect(setupAside?.classList.contains('fixed')).toBe(true);
    expect(setupAside?.previousElementSibling?.classList.contains('pb-20')).toBe(false);
    expect(mocks.enabled).toHaveBeenCalledWith(true);
  });

  it('does not request or show workspace setup for a non-admin with a complete profile', async () => {
    mocks.setup = setup();
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect.element(screen.getByText('Getting started card')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
    expect(mocks.enabled).toHaveBeenCalledWith(false);
  });

  it('shows a personal-only Complete Profile checklist for a non-admin without a name', async () => {
    mocks.memberName = null;
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect
      .element(screen.getByText('Getting started card · profile incomplete · personal only'))
      .toBeInTheDocument();
    expect(mocks.enabled).toHaveBeenCalledWith(false);
  });

  it('shows only the personal step when shared workspace setup is already complete', async () => {
    mocks.isAdmin = true;
    mocks.memberName = null;
    mocks.setup = setup(true);
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect
      .element(screen.getByText('Getting started card · profile incomplete · personal only'))
      .toBeInTheDocument();
  });

  it.each([
    { name: 'complete', data: setup(true), isError: false },
    { name: 'unavailable', data: undefined, isError: true },
  ])('keeps ordinary org work and omits setup when the admin read is $name', async ({ data, isError }) => {
    mocks.isAdmin = true;
    mocks.setup = data;
    mocks.setupIsError = isError;
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect.element(screen.getByText('Getting started card')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
  });

  it('does not flash setup UI while the admin read is loading', async () => {
    mocks.isAdmin = true;
    mocks.memberName = null;
    mocks.setupIsLoading = true;
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    expect(document.querySelector('aside[aria-label="Getting started"]')).toBeNull();
    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
  });
});
