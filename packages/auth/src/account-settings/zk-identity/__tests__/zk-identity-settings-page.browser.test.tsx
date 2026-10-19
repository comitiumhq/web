import type { User } from '@comitium/schemas/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { productUser } from '../../../__tests__/identity-fixtures';
import type { ZkIdentityApi } from '../../../zk-identity';
import { ZkIdentitySettingsPage } from '../zk-identity-settings-page';

const mocks = vi.hoisted(() => ({ user: null as User | null }));
vi.mock('../../../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../zk-identity-section', () => ({
  ZkIdentitySection: ({ queryKey }: { queryKey: readonly unknown[] }) => (
    <output aria-label="Verification owner">{queryKey.join(':')}</output>
  ),
}));

const api: ZkIdentityApi = {
  getZkIdentityStatus: vi.fn(),
  createZkIdentityAttempt: vi.fn(),
  completeZkIdentityAttempt: vi.fn(),
};
const queryKey = (id: string) => ['account', 'zk-identity', id];

beforeEach(() => {
  mocks.user = productUser();
});

describe('ZK Identity account ownership', () => {
  it('uses the stable product account even before personal-key setup', async () => {
    const screen = await render(<ZkIdentitySettingsPage api={api} queryKey={queryKey} />);

    await expect
      .element(screen.getByLabelText('Verification owner'))
      .toHaveTextContent(`account:zk-identity:${productUser().id}`);
  });

  it('does not render another owner while product bootstrap is unresolved', async () => {
    mocks.user = null;
    const screen = await render(<ZkIdentitySettingsPage api={api} queryKey={queryKey} />);

    await expect.element(screen.getByLabelText('Verification owner')).not.toBeInTheDocument();
  });
});
