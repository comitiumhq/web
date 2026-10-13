import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LucideProvider } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { useCspNonce } from '../lib/security-headers';
import { TooltipProvider } from './tooltip';

interface WebAppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
  forcedTheme?: 'light' | 'dark';
}

export function WebAppProviders({ children, queryClient, forcedTheme }: WebAppProvidersProps) {
  const nonce = useCspNonce();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={!forcedTheme}
      forcedTheme={forcedTheme}
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        <LucideProvider strokeWidth={1.5}>
          <TooltipProvider>{children}</TooltipProvider>
        </LucideProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
