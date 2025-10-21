-- Add comment column to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS comment TEXT;