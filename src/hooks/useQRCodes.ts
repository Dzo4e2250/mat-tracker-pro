import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { QRCode } from '@/integrations/supabase/types';

export function useQRCodes(userId?: string) {
  return useQuery({
    queryKey: ['qr_codes', userId],
    queryFn: async () => {
      let query = supabase
        .from('qr_codes')
        .select('*')
        .order('code');

      // If userId provided, filter by owner
      if (userId) {
        query = query.eq('owner_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!userId,
  });
}

export function useAvailableQRCodes(userId: string) {
  return useQuery({
    queryKey: ['qr_codes', 'available', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', 'available')
        .order('code');

      if (error) throw error;
      return data as QRCode[];
    },
    enabled: !!userId,
  });
}
