import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/integrations/supabase/types';

// Type for creating a new user
export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'inventar' | 'prodajalec';
  codePrefix?: string;
};

export type ProfileWithQRCount = Profile & {
  qr_count?: number;
};

// Fetch all profiles
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name');

      if (error) throw error;
      return data as Profile[];
    },
  });
}

// Fetch profiles by role
export function useProfilesByRole(role: 'prodajalec' | 'inventar' | 'admin') {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name');

      if (error) throw error;
      return data as Profile[];
    },
  });
}

// Fetch prodajalec profiles with their QR code counts
export function useProdajalecProfiles() {
  return useQuery({
    queryKey: ['profiles', 'prodajalec', 'with-counts'],
    queryFn: async () => {
      // Get all profiles that have prodajalec as primary OR secondary role
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .or('role.eq.prodajalec,secondary_role.eq.prodajalec')
        .order('last_name')
        .order('first_name');

      console.log('useProdajalecProfiles: fetched profiles', profiles);
      if (profileError) {
        console.error('useProdajalecProfiles error:', profileError);
        throw profileError;
      }

      // Get QR code counts for each profile
      const profilesWithCounts: ProfileWithQRCount[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count, error: countError } = await supabase
            .from('qr_codes')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profile.id);

          return {
            ...profile,
            qr_count: countError ? 0 : (count || 0),
          };
        })
      );

      return profilesWithCounts;
    },
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, any>;
    }) => {
      console.log('useUpdateProfile: updating', id, 'with', updates);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('useUpdateProfile error:', error);
        throw error;
      }
      console.log('useUpdateProfile result:', data);
      return { id, ...updates };
    },
    onSuccess: () => {
      // Invalidate all profile-related queries including prodajalec with counts
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// Deactivate profile (soft delete)
export function useDeactivateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

// Get dashboard stats for inventar
export function useInventarStats() {
  return useQuery({
    queryKey: ['inventar', 'stats'],
    queryFn: async () => {
      // Get total QR codes
      const { count: totalQRCodes } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true });

      // Get available QR codes count
      const { count: availableQRCodes } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      // Get active prodajalec count
      const { count: activeProdajalec } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'prodajalec')
        .eq('is_active', true);

      // Get pending tester requests (cycles waiting for pickup)
      const { count: pendingRequests } = await supabase
        .from('cycles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_driver');

      return {
        totalQRCodes: totalQRCodes || 0,
        availableQRCodes: availableQRCodes || 0,
        activeProdajalec: activeProdajalec || 0,
        pendingRequests: pendingRequests || 0,
      };
    },
  });
}

// Create a new user via Edge Function
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Niste prijavljeni');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            full_name: `${input.firstName} ${input.lastName}`,
            role: input.role.toUpperCase(),
            qr_prefix: input.codePrefix?.toUpperCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Napaka pri ustvarjanju uporabnika');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
