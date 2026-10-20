import type { EncryptionSetupGate } from '@comitium/auth/encryption-setup-gate';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { EncryptionSetup } from '../encryption-setup';

const mocks = vi.hoisted(() => ({
  location: { pathname: '/org/create' },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useRouterState: ({ select }: { select: (state: { location: typeof mocks.location }) => unknown }) =>
    select({ location: mocks.location }),
}));

vi.mock('@comitium/auth/encryption-setup-gate', () => ({
  EncryptionSetupGate: ({ children, isSuppressed, requireRecovery }: ComponentProps<typeof EncryptionSetupGate>) =>
    isSuppressed ? children : <p>{requireRecovery ? 'Password and recovery required' : 'Password required'}</p>,
}));

beforeEach(() => {
  mocks.location = { pathname: '/org/create' };
});

async function renderRoute() {
  return render(
    <EncryptionSetup>
      <main>Route content</main>
    </EncryptionSetup>,
  );
}

describe('ATS encryption route boundary', () => {
  it('requires password and recovery before organization setup', async () => {
    const screen = await renderRoute();
    await expect.element(screen.getByText('Password and recovery required')).toBeVisible();
    await expect.element(screen.getByText('Route content')).not.toBeInTheDocument();
  });

  it('lets the root redirect choose a creator or member route before key setup', async () => {
    mocks.location = { pathname: '/' };
    const screen = await renderRoute();
    await expect.element(screen.getByText('Route content')).toBeVisible();
    await expect.element(screen.getByText('Password and recovery required')).not.toBeInTheDocument();
  });
});
