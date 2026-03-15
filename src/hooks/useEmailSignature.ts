/**
 * @file useEmailSignature.ts
 * @description Fetch + upsert za user_email_signatures
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserEmailSignature, UserEmailSignatureUpdate } from '@/integrations/supabase/types';
import { QUERY_KEYS } from '@/constants/queryKeys';

export function useEmailSignature(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.emailSignature(userId);

  const { data: signature, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from('user_email_signatures')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          // Table doesn't exist yet - return null gracefully
          console.warn('[useEmailSignature] Query failed (table may not exist):', error.message);
          return null;
        }
        return data as UserEmailSignature | null;
      } catch (err) {
        console.warn('[useEmailSignature] Unexpected error:', err);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: false,
  });

  // Upsert signature (insert or update)
  const upsertSignature = useMutation({
    mutationFn: async (updates: Omit<UserEmailSignatureUpdate, 'user_id' | 'id'>) => {
      if (!userId) throw new Error('No user ID');

      if (signature?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('user_email_signatures')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', signature.id)
          .select()
          .single();
        if (error) throw error;
        return data as UserEmailSignature;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_email_signatures')
          .insert({ ...updates, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        return data as UserEmailSignature;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    signature,
    isLoading,
    upsertSignature,
  };
}
