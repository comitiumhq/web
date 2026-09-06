import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { WorkspaceSetup } from '@/lib/schemas/org';
import { WorkspaceSetupShell } from './workspace-setup-shell';

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  setup: undefined as WorkspaceSetup | undefined,
  isError: false,
  isLoading: false,
  enabled: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ isAdmin: mocks.isAdmin }),
}));

vi.mock('@/hooks/queries/use-query-workspace-setup', () => ({
  useQueryWorkspaceSetup: (_orgId: string, enabled: boolean) => {
    mocks.enabled(enabled);

    return { data: mocks.setup, isError: mocks.isError, isLoading: mocks.isLoading };
  },
}));

vi.mock('./workspace-setup-card', () => ({
  WorkspaceSetupCard: () => <section>Getting started card</section>,
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
  mocks.setup = undefined;
  mocks.isError = false;
  mocks.isLoading = false;
  mocks.enabled.mockClear();
});

describe('workspace setup shell', () => {
  it('shows shared setup around ordinary org work only for an admin with incomplete setup', async () => {
    mocks.isAdmin = true;
    mocks.setup = setup();
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
    await expect.element(screen.getByRole('complementary', { name: 'Getting started' })).toBeInTheDocument();
    await expect.element(screen.getByText('Getting started card')).toBeInTheDocument();
    expect(mocks.enabled).toHaveBeenCalledWith(true);
  });

  it('does not request or show cached setup for a non-admin member', async () => {
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

  it.each([
    { name: 'complete', data: setup(true), isError: false },
    { name: 'unavailable', data: undefined, isError: true },
  ])('keeps ordinary org work and omits setup when the read is $name', async ({ data, isError }) => {
    mocks.isAdmin = true;
    mocks.setup = data;
    mocks.isError = isError;
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
    mocks.isLoading = true;
    const screen = await render(
      <WorkspaceSetupShell orgId="org-1">
        <main>Organization work</main>
      </WorkspaceSetupShell>,
    );

    expect(document.querySelector('aside[aria-label="Getting started"]')).toBeNull();
    await expect.element(screen.getByText('Organization work')).toBeInTheDocument();
  });
});
