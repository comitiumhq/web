import { Button } from '@comitium/ui/button';
import { useConnectWallet, usePrivy } from '@privy-io/react-auth';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { type ReactNode, useCallback } from 'react';

interface ConnectWalletButtonProps {
  className?: string;
  children?: ReactNode;
}

export const ConnectWalletButton = ({ className, children = 'Log in' }: ConnectWalletButtonProps) => {
  const navigate = useNavigate();
  const returnTo = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  });

  return (
    <Button
      onClick={() => navigate({ to: '/login', search: { returnTo } })}
      variant="outline"
      size="lg"
      className={className}
    >
      {children}
    </Button>
  );
};

export function useConnectWalletModal() {
  const { isModalOpen } = usePrivy();
  const { connectWallet } = useConnectWallet();

  const openConnectModal = useCallback(() => {
    connectWallet({ walletChainType: 'ethereum-only' });
  }, [connectWallet]);

  return { openConnectModal, isConnecting: isModalOpen };
}
