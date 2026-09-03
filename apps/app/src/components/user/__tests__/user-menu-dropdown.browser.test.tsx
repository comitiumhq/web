import type { DisplayIdentity } from '@comitium/schemas/common';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { MyOrg } from '@/lib/schemas/org';

import { UserMenuDropdown } from '../user-menu-dropdown';
import type { ReadyUserMenuState } from '../user-menu-state';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params, to }: { children: ReactNode; params?: { orgId?: string }; to: string }) => {
    const href = params?.orgId ? to.replace('$orgId', params.orgId) : to;

    return <a href={href}>{children}</a>;
  },
}));

vi.mock('@comitium/ui/theme-menu', () => ({ ThemeMenuSub: () => null }));

const identity: DisplayIdentity = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'Illia Yablonski',
  email: 'illia@example.com',
};

const state: ReadyUserMenuState = {
  currentOrgId: 'org-1',
  identity,
  onDisconnect: vi.fn(),
  onSelectOrg: vi.fn(),
  orgs: [] as MyOrg[],
  status: 'ready',
};

describe('UserMenuDropdown personal destinations', () => {
  it('keeps global Account separate from organization Settings', async () => {
    const screen = await render(<UserMenuDropdown state={state} />);

    await screen.getByRole('button', { name: 'Open account menu' }).click();

    await expect.element(page.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
    await expect.element(page.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/org/org-1/settings');
    await expect.element(page.getByText('Wallet', { exact: true })).not.toBeInTheDocument();
  });
});
