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

// Postpone reminder to a new date
export function usePostponeReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reminderId, newDate }: { reminderId: string; newDate: Date }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          reminder_at: newDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
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

// Mark contract as called and create follow-up reminder
export function useMarkContractCalled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId }: { companyId: string; userId: string }) => {
      // 1. Update company with contract_called_at
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          contract_called_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. Create follow-up reminder for tomorrow at 9:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert({
          company_id: companyId,
          user_id: userId,
          reminder_at: tomorrow.toISOString(),
          note: 'Ali si dobil podpisano pogodbo?',
          reminder_type: 'contract_followup',
          is_completed: false,
        });

      if (reminderError) throw reminderError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Mark contract as received (signed)
export function useMarkContractReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, reminderId }: { companyId: string; reminderId?: string }) => {
      // 1. Update company status to contract_signed
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          pipeline_status: 'contract_signed',
          contract_called_at: null, // Reset called status
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. If there's a reminder, mark it as completed
      if (reminderId) {
        const { error: reminderError } = await supabase
          .from('reminders')
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq('id', reminderId);

        if (reminderError) throw reminderError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Postpone contract follow-up reminder to tomorrow
export function usePostponeContractFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const { data, error } = await supabase
        .from('reminders')
        .update({
          reminder_at: tomorrow.toISOString(),
          updated_at: new Date().toISOString(),
        })
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

// ============================================
// OFFER WORKFLOW HOOKS
// ============================================

// Fetch companies with offers sent that need first follow-up (no reminder exists yet)
export function useOfferPendingCompanies(userId?: string, daysThreshold: number = 2) {
  return useQuery({
    queryKey: ['companies', 'offer-pending', userId, daysThreshold],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      // Get companies with offer_sent status older than threshold
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', userId)
        .eq('pipeline_status', 'offer_sent')
        .lte('offer_sent_at', thresholdDate.toISOString())
        .is('offer_called_at', null) // Not yet called
        .order('offer_sent_at', { ascending: true });

      if (companiesError) throw companiesError;
      if (!companies || companies.length === 0) return [];

      // Check which companies already have active offer reminders
      const companyIds = companies.map(c => c.id);
      const { data: existingReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('company_id')
        .in('company_id', companyIds)
        .in('reminder_type', ['offer_followup_1', 'offer_followup_2', 'offer_call'])
        .eq('is_completed', false)
        .eq('user_id', userId);

      if (remindersError) throw remindersError;

      const companiesWithReminders = new Set(existingReminders?.map(r => r.company_id) || []);

      // Return companies without active reminders
      return companies.filter(c => !companiesWithReminders.has(c.id));
    },
    enabled: !!userId,
  });
}

// Create first offer follow-up reminder (after 2 days)
export function useCreateOfferFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId }: { companyId: string; userId: string }) => {
      // Create reminder for now (will show immediately as due)
      const { error } = await supabase
        .from('reminders')
        .insert({
          company_id: companyId,
          user_id: userId,
          reminder_at: new Date().toISOString(),
          note: 'Ali si dobil odgovor na ponudbo?',
          reminder_type: 'offer_followup_1',
          is_completed: false,
        });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Handle offer response - DA (positive response, wants contract)
export function useOfferResponseContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, reminderId }: { companyId: string; reminderId?: string }) => {
      // 1. Update company status to contract_sent
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          pipeline_status: 'contract_sent',
          contract_sent_at: new Date().toISOString(),
          offer_called_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. Complete the reminder if exists
      if (reminderId) {
        await supabase
          .from('reminders')
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq('id', reminderId);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Handle offer response - DA (needs more time)
export function useOfferResponseNeedsTime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId, reminderId }: { companyId: string; userId: string; reminderId?: string }) => {
      // 1. Complete current reminder
      if (reminderId) {
        await supabase
          .from('reminders')
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq('id', reminderId);
      }

      // 2. Create new reminder for 5 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(9, 0, 0, 0);

      const { error } = await supabase
        .from('reminders')
        .insert({
          company_id: companyId,
          user_id: userId,
          reminder_at: futureDate.toISOString(),
          note: 'Stranka potrebuje čas - preveri stanje ponudbe',
          reminder_type: 'offer_followup_1',
          is_completed: false,
        });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Handle offer response - DA (no interest)
export function useOfferResponseNoInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId, reminderId }: { companyId: string; userId: string; reminderId?: string }) => {
      // 1. Update company status back to contacted
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          pipeline_status: 'contacted',
          offer_sent_at: null,
          offer_called_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. Complete the reminder
      if (reminderId) {
        await supabase
          .from('reminders')
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq('id', reminderId);
      }

      // 3. Add a note about no interest
      const { error: noteError } = await supabase
        .from('company_notes')
        .insert({
          company_id: companyId,
          created_by: userId,
          content: 'Ni interesa za ponudbo',
          note_date: new Date().toISOString().split('T')[0],
        });

      if (noteError) throw noteError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['company_notes'] });
    },
  });
}

// Handle offer response - NE (no response yet)
// First NE: wait 2 more days, Second NE: create call reminder
export function useOfferNoResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId, reminderId, reminderType }: {
      companyId: string;
      userId: string;
      reminderId: string;
      reminderType: string;
    }) => {
      // Complete current reminder
      await supabase
        .from('reminders')
        .update({ is_completed: true, updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      // Determine next step based on current reminder type
      if (reminderType === 'offer_followup_1') {
        // First NE - create second follow-up in 2 days
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        futureDate.setHours(9, 0, 0, 0);

        const { error } = await supabase
          .from('reminders')
          .insert({
            company_id: companyId,
            user_id: userId,
            reminder_at: futureDate.toISOString(),
            note: 'Še vedno ni odgovora na ponudbo',
            reminder_type: 'offer_followup_2',
            is_completed: false,
          });

        if (error) throw error;
      } else {
        // Second NE or later - create call reminder
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const { error } = await supabase
          .from('reminders')
          .insert({
            company_id: companyId,
            user_id: userId,
            reminder_at: tomorrow.toISOString(),
            note: 'Pokliči stranko - ni odgovora na ponudbo že 4+ dni',
            reminder_type: 'offer_call',
            is_completed: false,
          });

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Mark offer as called
export function useMarkOfferCalled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId, reminderId }: {
      companyId: string;
      userId: string;
      reminderId?: string;
    }) => {
      // 1. Update company with offer_called_at
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          offer_called_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (updateError) throw updateError;

      // 2. Complete current reminder if exists
      if (reminderId) {
        await supabase
          .from('reminders')
          .update({ is_completed: true, updated_at: new Date().toISOString() })
          .eq('id', reminderId);
      }

      // 3. Create follow-up reminder for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert({
          company_id: companyId,
          user_id: userId,
          reminder_at: tomorrow.toISOString(),
          note: 'Ali si dobil odgovor po klicu glede ponudbe?',
          reminder_type: 'offer_followup_1',
          is_completed: false,
        });

      if (reminderError) throw reminderError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Offer call - not reachable, try again tomorrow
export function useOfferCallNotReachable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, userId, reminderId }: {
      companyId: string;
      userId: string;
      reminderId: string;
    }) => {
      // Complete current reminder
      await supabase
        .from('reminders')
        .update({ is_completed: true, updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      // Create new call reminder for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const { error } = await supabase
        .from('reminders')
        .insert({
          company_id: companyId,
          user_id: userId,
          reminder_at: tomorrow.toISOString(),
          note: 'Ponovno pokliči stranko - včeraj ni dosegljiv',
          reminder_type: 'offer_call',
          is_completed: false,
        });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

// Pipeline status options
export const PIPELINE_STATUSES = [
  { value: 'osnutek', label: 'Osnutek', color: 'bg-amber-100 text-amber-700 border border-amber-300' },
  { value: 'new', label: 'Nov kontakt', color: 'bg-gray-100 text-gray-800' },
  { value: 'contacted', label: 'Kontaktiran', color: 'bg-blue-100 text-blue-800' },
  { value: 'offer_sent', label: 'Poslana ponudba', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'contract_sent', label: 'Poslana pogodba', color: 'bg-orange-100 text-orange-800' },
  { value: 'contract_signed', label: 'Podpisana pogodba', color: 'bg-green-100 text-green-800' },
  { value: 'active', label: 'Aktivna stranka', color: 'bg-emerald-100 text-emerald-800' },
] as const;

export type PipelineStatus = typeof PIPELINE_STATUSES[number]['value'];
