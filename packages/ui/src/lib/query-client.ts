import { shouldRetryQuery } from '@comitium/schemas/api-query-policy';
import { MutationCache, QueryCache, QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { ZodError } from 'zod';

import { logger } from './logger';

const QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ZodError) {
          return false;
        }

        return shouldRetryQuery(failureCount, error);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
    },
    mutations: {
      retry: false,
    },
  },
};

function logSchemaError(scope: 'query' | 'mutation', key: unknown, error: unknown) {
  if (!(error instanceof ZodError)) {
    return;
  }

  logger.error(`[zod] ${scope} schema mismatch`, {
    key,
    issues: error.issues,
  });
}

export function createQueryClient() {
  return new QueryClient({
    ...QUERY_CONFIG,
    queryCache: new QueryCache({
      onError: (error, query) => logSchemaError('query', query.queryKey, error),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        logSchemaError('mutation', mutation.options.mutationKey, error),
    }),
  });
}
