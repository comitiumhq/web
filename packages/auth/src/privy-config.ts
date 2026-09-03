import { activeChain } from '@comitium/chain/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';

if (!import.meta.env.VITE_PRIVY_APP_ID) {
  throw new Error('VITE_PRIVY_APP_ID is required');
}

export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export type PrivyAuthTransport = 'headers' | 'cookies';

function resolvePrivyAuthTransport(environment: string | undefined, viteProduction: boolean): PrivyAuthTransport {
  const normalizedEnvironment = environment?.trim().toLowerCase();

  if (!normalizedEnvironment) {
    return viteProduction ? 'cookies' : 'headers';
  }

  if (normalizedEnvironment === 'production' || normalizedEnvironment === 'prod') {
    return 'cookies';
  }

  if (normalizedEnvironment === 'development' || normalizedEnvironment === 'dev' || normalizedEnvironment === 'local') {
    return 'headers';
  }

  throw new Error('VITE_ENVIRONMENT must be "development" or "production"');
}

export const PRIVY_AUTH_TRANSPORT = resolvePrivyAuthTransport(
  import.meta.env.VITE_ENVIRONMENT,
  import.meta.env.MODE === 'production',
);

export const privyConfig: PrivyClientConfig = {
  loginMethods: ['email', 'google'],
  supportedChains: [activeChain],
  defaultChain: activeChain,
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'off',
    },
    showWalletUIs: false,
  },
  appearance: {
    landingHeader: 'Log in to Comitium',
    loginMessage: 'Your account includes a secure embedded wallet.',
    walletChainType: 'ethereum-only',
  },
};
