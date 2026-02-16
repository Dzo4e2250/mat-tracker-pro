/**
 * @file usePaginatedCompanies.ts
 * @description Hook za paginacijo podjetij z infinite scroll podporo
 *
 * Uporaba:
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaginatedCompanies(userId, {
 *   pageSize: 50,
 *   searchQuery: 'iskanje',
 * });
 * ```
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Company, Contact } from '@/integrations/supabase/types';
import { sanitizeSearchQuery } from '@/lib/utils';

export type PaginatedCompany = Company & {
  contacts: Contact[];
  cycleStats: {
    onTest: number;
    signed: number;
    total: number;
  };
};

interface PaginatedCompaniesOptions {
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
}

interface PageData {
  companies: PaginatedCompany[];
  nextCursor: number | null;
  totalCount: number;
}

/**
 * Hook za paginacijo podjetij
 * Uporablja cursor-based pagination za boljšo performance
 */
export function usePaginatedCompanies(
  userId?: string,
  options: PaginatedCompaniesOptions = {}
) {
  const { pageSize = 50, searchQuery = '', statusFilter } = options;

  return useInfiniteQuery({
    queryKey: ['paginated-companies', userId, pageSize, searchQuery, statusFilter],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) {
        return { companies: [], nextCursor: null, totalCount: 0 };
      }

      // Base query for companies
      let query = supabase
        .from('companies')
        .select(`
          *,
          contacts(*),
          cycles:cycles!cycles_company_id_fkey(
            status,
            contract_signed
          )
        `, { count: 'exact' })
        .eq('created_by', userId)
        .order('name', { ascending: true })
        .range(pageParam, pageParam + pageSize - 1);

      // Add search filter
      if (searchQuery) {
        const q = sanitizeSearchQuery(searchQuery);
        query = query.or(`name.ilike.%${q}%,display_name.ilike.%${q}%,tax_number.ilike.%${q}%`);
      }

      // Add status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('pipeline_status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      const companies: PaginatedCompany[] = (data || []).map((company: any) => {
        const cycles = company.cycles || [];
        const onTest = cycles.filter((c: any) => c.status === 'on_test').length;
        const signed = cycles.filter((c: any) => c.contract_signed).length;
        const total = cycles.length;

        return {
          ...company,
          contacts: company.contacts || [],
          cycles: undefined, // Remove raw cycles from response
          cycleStats: { onTest, signed, total },
        };
      });

      // Calculate next cursor
      const currentEnd = pageParam + companies.length;
      const hasMore = count ? currentEnd < count : false;
      const nextCursor = hasMore ? currentEnd : null;

      return {
        companies,
        nextCursor,
        totalCount: count || 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

/**
 * Hook za prefetch naslednje strani
 */
export function usePrefetchNextPage(userId?: string, options: PaginatedCompaniesOptions = {}) {
  const queryClient = useQueryClient();
  const { pageSize = 50, searchQuery = '', statusFilter } = options;

  return (cursor: number) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['paginated-companies', userId, pageSize, searchQuery, statusFilter],
      queryFn: async () => {
        // Prefetch logic would go here
        return { companies: [], nextCursor: null, totalCount: 0 };
      },
      initialPageParam: cursor,
    });
  };
}

/**
 * Helper za flat seznam podjetij iz paginated data
 */
export function flattenPaginatedCompanies(data: { pages: PageData[] } | undefined): PaginatedCompany[] {
  if (!data?.pages) return [];
  return data.pages.flatMap(page => page.companies);
}

/**
 * Hook za štetje podjetij (za prikaz "Nalagam X od Y")
 */
export function useCompanyCount(userId?: string, searchQuery?: string) {
  return useInfiniteQuery({
    queryKey: ['company-count', userId, searchQuery],
    queryFn: async () => {
      if (!userId) return { count: 0 };

      let query = supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId);

      if (searchQuery) {
        const q = sanitizeSearchQuery(searchQuery);
        query = query.or(`name.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { count, error } = await query;
      if (error) throw error;

      return { count: count || 0 };
    },
    initialPageParam: 0,
    getNextPageParam: () => null,
    enabled: !!userId,
  });
}
