-- Add QR code range to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS qr_start_num INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS qr_end_num INTEGER DEFAULT 200;