import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { TooltipProvider } from './tooltip';

interface WebAppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
  forcedTheme?: 'light' | 'dark';
}

export function WebAppProviders({ children, queryClient, forcedTheme }: WebAppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={!forcedTheme} forcedTheme={forcedTheme}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
