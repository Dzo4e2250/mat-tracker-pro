import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Driver, DriverInsert } from '@/integrations/supabase/types';

// Fetch all active drivers
export function useDrivers(includeInactive = false) {
  return useQuery({
    queryKey: ['drivers', includeInactive],
    queryFn: async (): Promise<Driver[]> => {
      let query = supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('useDrivers error:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Create a new driver
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<DriverInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          name: input.name,
          phone: input.phone || null,
          region: input.region || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('useCreateDriver error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Update an existing driver
export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Driver, 'id' | 'created_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('useUpdateDriver error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Deactivate a driver (soft delete)
export function useDeactivateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('useDeactivateDriver error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Reactivate a driver
export function useReactivateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('useReactivateDriver error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// Delete a driver permanently
export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('useDeleteDriver error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}
