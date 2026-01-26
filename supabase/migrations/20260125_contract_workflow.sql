-- Add contract_called_at to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_called_at TIMESTAMPTZ DEFAULT NULL;

-- Add reminder_type to reminders table for different reminder workflows
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'general';

-- Add comment for reminder_type values
COMMENT ON COLUMN reminders.reminder_type IS 'Type of reminder: general, contract_followup';
