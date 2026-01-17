import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MatType } from '@/integrations/supabase/types';

export function useMatTypes() {
  return useQuery({
    queryKey: ['mat_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mat_types')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      return data as MatType[];
    },
  });
}
