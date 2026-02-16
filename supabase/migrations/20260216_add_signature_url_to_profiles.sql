-- Add signature_url field to profiles for contract signing
ALTER TABLE mat_tracker.profiles
ADD COLUMN IF NOT EXISTS signature_url text NULL;
