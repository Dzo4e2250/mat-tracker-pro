-- Create table for tester requests
CREATE TABLE IF NOT EXISTS public.tester_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  quantities JSONB NOT NULL,
  generated_qr_codes TEXT[]
);

-- Enable RLS
ALTER TABLE public.tester_requests ENABLE ROW LEVEL SECURITY;

-- Inventar can view all requests
CREATE POLICY "Inventar can view all tester requests"
ON public.tester_requests
FOR SELECT
USING (has_role(auth.uid(), 'INVENTAR'::app_role));

-- Inventar can insert requests
CREATE POLICY "Inventar can insert tester requests"
ON public.tester_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'INVENTAR'::app_role));

-- Inventar can update requests
CREATE POLICY "Inventar can update tester requests"
ON public.tester_requests
FOR UPDATE
USING (has_role(auth.uid(), 'INVENTAR'::app_role));

-- Add generation_date to doormats for better tracking
ALTER TABLE public.doormats 
ADD COLUMN IF NOT EXISTS generation_date DATE DEFAULT CURRENT_DATE;