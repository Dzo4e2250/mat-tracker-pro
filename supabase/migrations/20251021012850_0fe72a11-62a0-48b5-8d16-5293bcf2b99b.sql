-- Add qr_prefix column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN qr_prefix TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN public.profiles.qr_prefix IS 'QR code prefix for sellers (e.g., RIST for George Ristov)';

-- Create an index for faster lookups
CREATE INDEX idx_profiles_qr_prefix ON public.profiles(qr_prefix);