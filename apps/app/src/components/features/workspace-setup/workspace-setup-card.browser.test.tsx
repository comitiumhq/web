import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { WorkspaceSetup } from '@/lib/schemas/org';
import { WorkspaceSetupCard } from './workspace-setup-card';

const OPEN_STORAGE_KEY = 'comitium:workspace-setup:open:org-1';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params: _params,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: unknown;
    search?: Record<string, boolean | string>;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const query = search
      ? `?${new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)]))}`
      : '';

    return (
      <a href={`${to}${query}`} {...props}>
        {children}
      </a>
    );
  },
}));

function setup(overrides: Partial<WorkspaceSetup> = {}): WorkspaceSetup {
  return {
    required: {
      companyDetails: { complete: true },
      department: { complete: true },
      location: { complete: false },
      recruitingPrivacy: { complete: false },
      firstJob: { complete: false },
    },
    recommended: { inviteTeammate: { complete: true } },
    completedRequired: 2,
    requiredTotal: 5,
    complete: false,
    ...overrides,
  };
}

describe('workspace setup card', () => {
  beforeEach(() => {
    localStorage.removeItem(OPEN_STORAGE_KEY);
  });

  it('keeps the recommendation outside progress, separates structure, and blocks job creation until prior steps complete', async () => {
    const screen = await render(<WorkspaceSetupCard orgId="org-1" profileComplete setup={setup()} />);

    await expect.element(screen.getByText('3/6')).toBeInTheDocument();
    await expect
      .element(screen.getByRole('progressbar'))
      .toHaveAttribute('aria-label', '3 of 6 getting started steps complete');
    await expect.element(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await expect
      .element(screen.getByRole('link', { name: 'Complete: Complete Profile' }))
      .toHaveAttribute('href', '/org/$orgId/settings');
    await expect.element(screen.getByRole('link', { name: /Invite a member/ })).toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'Complete: Add a department' }))
      .toHaveAttribute('href', '/org/$orgId/organization/departments');
    await expect
      .element(screen.getByRole('link', { name: 'Incomplete: Add a location' }))
      .toHaveAttribute('href', '/org/$orgId/organization/locations');
    await expect
      .element(screen.getByRole('link', { name: 'Incomplete: Add recruiting privacy policy' }))
      .toBeInTheDocument();
    const disabledJob = screen.getByRole('button', { name: /Unavailable: Create your first job/ });
    await expect.element(disabledJob).toBeDisabled();

    const labels = Array.from(document.querySelectorAll('a, button')).map((element) =>
      element.getAttribute('aria-label'),
    );
    expect(labels.indexOf('Complete: Add a department')).toBeLessThan(
      labels.indexOf('Incomplete: Add recruiting privacy policy'),
    );
    expect(labels.indexOf('Incomplete: Add a location')).toBeLessThan(
      labels.indexOf('Incomplete: Add recruiting privacy policy'),
    );
  });

  it('opens the first-job flow after every preceding step is complete', async () => {
    const screen = await render(
      <WorkspaceSetupCard
        orgId="org-1"
        profileComplete
        setup={setup({
          required: {
            companyDetails: { complete: true },
            department: { complete: true },
            location: { complete: true },
            recruitingPrivacy: { complete: true },
            firstJob: { complete: false },
          },
          completedRequired: 4,
        })}
      />,
    );

    await expect
      .element(screen.getByRole('link', { name: 'Incomplete: Create your first job' }))
      .toHaveAttribute('href', '/org/$orgId/jobs?status=all&create=true');
  });

  it('persists a keyboard-collapsed card across route remounts', async () => {
    const firstScreen = await render(<WorkspaceSetupCard orgId="org-1" profileComplete setup={setup()} />);
    const trigger = firstScreen.getByRole('button', { name: /Getting started/ });
    const card = document.querySelector<HTMLElement>('[data-slot="card"]');

    expect(card?.classList.contains('w-72')).toBe(true);
    expect(card?.classList.contains('border-control-border')).toBe(true);
    expect(card?.classList.contains('ring-1')).toBe(false);

    trigger.element().focus();
    await userEvent.keyboard('{Enter}');

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(card?.classList.contains('w-72')).toBe(true);
    expect(card?.classList.contains('w-64')).toBe(false);
    await firstScreen.unmount();

    const nextScreen = await render(<WorkspaceSetupCard orgId="org-1" profileComplete setup={setup()} />);

    await expect
      .element(nextScreen.getByRole('button', { name: /Getting started/ }))
      .toHaveAttribute('aria-expanded', 'false');
  });

  it('shows Complete Profile as a personal-only checklist when workspace setup is not active', async () => {
    const screen = await render(<WorkspaceSetupCard orgId="org-1" profileComplete={false} />);

    await expect.element(screen.getByText('0/1')).toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'Incomplete: Complete Profile' }))
      .toHaveAttribute('href', '/org/$orgId/settings');
    await expect.element(screen.getByText('Add company details')).not.toBeInTheDocument();
  });
});
