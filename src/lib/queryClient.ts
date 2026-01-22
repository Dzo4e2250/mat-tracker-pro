import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { handleError, parseSupabaseError } from '@/utils/errorHandler';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show error if query is not marked as silent
      if (query.meta?.silent !== true) {
        const queryKey = Array.isArray(query.queryKey)
          ? query.queryKey.join('/')
          : String(query.queryKey);
        handleError(error, `Query: ${queryKey}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Only show error if mutation is not marked as silent
      if (mutation.meta?.silent !== true) {
        const mutationKey = mutation.options.mutationKey
          ? Array.isArray(mutation.options.mutationKey)
            ? mutation.options.mutationKey.join('/')
            : String(mutation.options.mutationKey)
          : 'unknown';
        handleError(error, `Mutation: ${mutationKey}`);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        const appError = parseSupabaseError(error);
        if (appError.code.startsWith('AUTH_')) {
          return false;
        }
        // Don't retry permission errors
        if (appError.code === 'DB_PERMISSION_DENIED') {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
