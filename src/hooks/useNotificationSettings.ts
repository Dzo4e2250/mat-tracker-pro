/**
 * @file useNotificationSettings.ts
 * @description Fetch + upsert za user_notification_settings (one row per user)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserNotificationSettings, UserNotificationSettingsUpdate } from '@/integrations/supabase/types';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const DEFAULT_NOTIFICATION_SETTINGS: Omit<UserNotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  offer_followup_enabled: true,
  offer_followup_max_rounds: 3,
  offer_followup_interval_days: 2,
  offer_auto_escalate_call: true,
  contract_followup_enabled: true,
  contract_followup_interval_days: 1,
  contract_detection_days: 3,
  general_reminders_enabled: true,
  channel_in_app: true,
  channel_browser_push: false,
  channel_email_digest: false,
  email_digest_frequency: 'daily',
  quiet_hours_enabled: false,
  quiet_hours_start: '18:00',
  quiet_hours_end: '08:00',
};

export function useNotificationSettings(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.notificationSettings(userId);

  const { data: settings, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn('[useNotificationSettings] Query failed (table may not exist):', error.message);
          return null;
        }
        return data as UserNotificationSettings | null;
      } catch (err) {
        console.warn('[useNotificationSettings] Unexpected error:', err);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Omit<UserNotificationSettingsUpdate, 'user_id' | 'id'>) => {
      if (!userId) throw new Error('No user ID');

      if (settings?.id) {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data as UserNotificationSettings;
      } else {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .insert({ ...updates, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        return data as UserNotificationSettings;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    settings,
    isLoading,
    upsertSettings,
  };
}
