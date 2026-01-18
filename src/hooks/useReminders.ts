import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Reminder, ReminderInsert, Company } from '@/integrations/supabase/types';

export type ReminderWithCompany = Reminder & {
  company?: Company;
};

// Fetch all reminders for a user
export function useReminders(userId?: string) {
  return useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('reminder_at', { ascending: true });

      if (error) throw error;
      return data as ReminderWithCompany[];
    },
    enabled: !!userId,
  });
}

// Fetch due reminders (reminder_at <= now)
export function useDueReminders(userId?: string) {
  return useQuery({
    queryKey: ['reminders', 'due', userId],
    staleTime: 1000 * 60, // 1 minuta
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .lte('reminder_at', now)
        .order('reminder_at', { ascending: true });

      if (error) throw error;
      return data as ReminderWithCompany[];
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Fetch companies with contracts sent but not signed (for auto-reminders)
export function useContractPendingCompanies(userId?: string, daysThreshold: number = 3) {
  return useQuery({
    queryKey: ['companies', 'contract-pending', userId, daysThreshold],
    staleTime: 1000 * 60 * 5, // 5 minut
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          contacts(*)
        `)
        .eq('created_by', userId)
        .eq('pipeline_status', 'contract_sent')
        .lte('contract_sent_at', thresholdDate.toISOString())
        .order('contract_sent_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Create a new reminder
export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminder: ReminderInsert) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert(reminder)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Mark reminder as completed
export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_completed: true, updated_at: new Date().toISOString() })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Delete a reminder
export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Update company pipeline status
export function useUpdatePipelineStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, status, contractSentAt }: {
      companyId: string;
      status: string;
      contractSentAt?: string;
    }) => {
      const updateData: any = {
        pipeline_status: status,
        updated_at: new Date().toISOString()
      };

      if (contractSentAt) {
        updateData.contract_sent_at = contractSentAt;
      }

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Pipeline status options
export const PIPELINE_STATUSES = [
  { value: 'new', label: 'Nov kontakt', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Kontaktiran', color: 'bg-blue-100 text-blue-800' },
  { value: 'offer_sent', label: 'Poslana ponudba', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'contract_sent', label: 'Poslana pogodba', color: 'bg-orange-100 text-orange-800' },
  { value: 'contract_signed', label: 'Podpisana pogodba', color: 'bg-green-100 text-green-800' },
  { value: 'active', label: 'Aktivna stranka', color: 'bg-emerald-100 text-emerald-800' },
] as const;

export type PipelineStatus = typeof PIPELINE_STATUSES[number]['value'];
