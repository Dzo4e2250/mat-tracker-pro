-- Email templates and signatures for user-customizable offer emails
-- =================================================================

-- 1. User email templates
CREATE TABLE mat_tracker.user_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('najem','nakup','primerjava','dodatna','custom')),
  intro_text TEXT NOT NULL DEFAULT '',
  service_text TEXT NOT NULL DEFAULT '',
  closing_text TEXT NOT NULL DEFAULT '',
  seasonal_text TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- RLS for user_email_templates
ALTER TABLE mat_tracker.user_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON mat_tracker.user_email_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON mat_tracker.user_email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON mat_tracker.user_email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON mat_tracker.user_email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- 2. User email signatures
CREATE TABLE mat_tracker.user_email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT DEFAULT '',
  title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_email_signatures
ALTER TABLE mat_tracker.user_email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signature"
  ON mat_tracker.user_email_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signature"
  ON mat_tracker.user_email_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signature"
  ON mat_tracker.user_email_signatures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signature"
  ON mat_tracker.user_email_signatures FOR DELETE
  USING (auth.uid() = user_id);
