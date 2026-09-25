import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useAccount } from '../use-wallet';

const mocks = vi.hoisted(() => {
  const address = '0x1111111111111111111111111111111111111111';

  return {
    address,
    user: {
      linkedAccounts: [
        {
          type: 'wallet',
          address,
          chainType: 'ethereum',
          id: 'wallet-id',
          walletClientType: 'privy',
          walletIndex: 0,
        },
      ],
    },
    wallets: [
      {
        address,
        walletClientType: 'privy',
        switchChain: vi.fn(),
      },
    ],
  };
});

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ authenticated: true, ready: true, user: mocks.user }),
  useSendTransaction: () => ({ sendTransaction: vi.fn() }),
  useSignMessage: () => ({ signMessage: vi.fn() }),
  useSignTypedData: () => ({ signTypedData: vi.fn() }),
  useWallets: () => ({ ready: true, wallets: mocks.wallets }),
}));

function AccountProbe() {
  const account = useAccount();

  return (
    <output aria-label="Account connection">
      {account.connectionStatus}:{account.address}
    </output>
  );
}

beforeEach(() => {
  mocks.wallets[0]?.switchChain.mockReset();
});

describe('useAccount', () => {
  it('connects the canonical wallet when Privy omits the optional wallet index', async () => {
    const screen = await render(<AccountProbe />);

    await expect.element(screen.getByLabelText('Account connection')).toHaveTextContent(`connected:${mocks.address}`);
  });
});
