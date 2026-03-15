-- Add block_order column to user_email_templates
-- Stores the order of email blocks for visual builder
ALTER TABLE mat_tracker.user_email_templates
ADD COLUMN IF NOT EXISTS block_order text[]
DEFAULT ARRAY['intro','seasonal','tables','service','closing'];
