import {
  type ConnectedWallet,
  usePrivy,
  useSendTransaction as usePrivySendTransaction,
  useSignMessage as usePrivySignMessage,
  useSignTypedData as usePrivySignTypedData,
  useWallets,
} from '@privy-io/react-auth';
import { useCallback, useMemo } from 'react';
import type { Address, Hex } from 'viem';

import {
  type CanonicalWallet,
  isCanonicalLinkedWallet,
  type WalletAccount,
  type WalletConnectionStatus,
} from './wallet';

function getCanonicalConnectedWallet(wallets: ConnectedWallet[], address: string): ConnectedWallet | null {
  return (
    wallets.find(
      (wallet) =>
        wallet.walletClientType === 'privy' &&
        wallet.walletIndex === 0 &&
        wallet.address.toLowerCase() === address.toLowerCase(),
    ) ?? null
  );
}

function getConnectionStatus(params: {
  authenticated: boolean;
  privyReady: boolean;
  wallet: CanonicalWallet | null;
  walletsReady: boolean;
}): WalletConnectionStatus {
  if (!params.privyReady || (params.authenticated && !params.walletsReady)) {
    return 'unknown';
  }

  if (!params.authenticated) {
    return 'disconnected';
  }

  if (!params.wallet) {
    return 'connecting';
  }

  return 'connected';
}

export function useAccount() {
  const { authenticated, ready, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { sendTransaction } = usePrivySendTransaction();
  const { signTypedData } = usePrivySignTypedData();
  const linkedWallet = user?.linkedAccounts.find(isCanonicalLinkedWallet) ?? null;
  const connectedWallet = linkedWallet ? getCanonicalConnectedWallet(wallets, linkedWallet.address) : null;

  const wallet = useMemo<CanonicalWallet | null>(() => {
    if (!authenticated || !linkedWallet || !connectedWallet) {
      return null;
    }

    const address = linkedWallet.address as Address;

    return {
      id: linkedWallet.id,
      address,
      sendTransaction: async (input) => {
        const result = await sendTransaction(input, { address, sponsor: true });

        return result.hash;
      },
      signTypedData: async (input) => {
        const result = await signTypedData(input, { address });

        return result.signature as Hex;
      },
      switchChain: (chainId) => connectedWallet.switchChain(chainId),
    };
  }, [authenticated, connectedWallet, linkedWallet, sendTransaction, signTypedData]);

  const account = useMemo<WalletAccount | null>(() => {
    if (!wallet) {
      return null;
    }

    return {
      address: wallet.address,
      signTypedData: wallet.signTypedData,
    };
  }, [wallet]);

  const connectionStatus = getConnectionStatus({
    authenticated,
    privyReady: ready,
    wallet,
    walletsReady,
  });

  return {
    address: wallet?.address,
    isConnected: wallet !== null,
    account,
    wallet,
    connectionStatus,
  };
}

export function useSignMessage() {
  const { wallet } = useAccount();
  const { signMessage: privySignMessage } = usePrivySignMessage();

  const signMessage = useCallback(
    async (message: string): Promise<Hex> => {
      if (!wallet) {
        throw new Error('Canonical wallet is not ready');
      }

      const result = await privySignMessage({ message }, { address: wallet.address });

      return result.signature as Hex;
    },
    [privySignMessage, wallet],
  );

  return { signMessage, canSign: wallet !== null };
}

export function useActiveWalletConnectionStatus(): WalletConnectionStatus {
  return useAccount().connectionStatus;
}

export function useActiveWallet(): CanonicalWallet | null {
  return useAccount().wallet;
}
