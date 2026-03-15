-- User notification settings (one row per user)
CREATE TABLE mat_tracker.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Ponudba follow-up
  offer_followup_enabled BOOLEAN NOT NULL DEFAULT true,
  offer_followup_max_rounds INTEGER NOT NULL DEFAULT 3 CHECK (offer_followup_max_rounds BETWEEN 0 AND 10),
  offer_followup_interval_days INTEGER NOT NULL DEFAULT 2 CHECK (offer_followup_interval_days BETWEEN 1 AND 14),
  offer_auto_escalate_call BOOLEAN NOT NULL DEFAULT true,

  -- Pogodba follow-up
  contract_followup_enabled BOOLEAN NOT NULL DEFAULT true,
  contract_followup_interval_days INTEGER NOT NULL DEFAULT 1 CHECK (contract_followup_interval_days BETWEEN 1 AND 14),
  contract_detection_days INTEGER NOT NULL DEFAULT 3 CHECK (contract_detection_days BETWEEN 1 AND 14),

  -- Splošno
  general_reminders_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Kanali (Phase 3)
  channel_in_app BOOLEAN NOT NULL DEFAULT true,
  channel_browser_push BOOLEAN NOT NULL DEFAULT false,
  channel_email_digest BOOLEAN NOT NULL DEFAULT false,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly')),

  -- Tihi čas
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME DEFAULT '18:00',
  quiet_hours_end TIME DEFAULT '08:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE mat_tracker.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON mat_tracker.user_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON mat_tracker.user_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON mat_tracker.user_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings"
  ON mat_tracker.user_notification_settings FOR DELETE
  USING (auth.uid() = user_id);
