import { createContext, createElement, type ReactNode, useContext } from 'react';

const PendingVaultBootstrapContext = createContext<string | null>(null);

export function usePendingVaultBootstrapOrganizationId(): string | null {
  return useContext(PendingVaultBootstrapContext);
}

export function PendingVaultBootstrapProvider({
  organizationId,
  children,
}: {
  organizationId: string | null;
  children: ReactNode;
}) {
  return createElement(PendingVaultBootstrapContext.Provider, { value: organizationId }, children);
}
