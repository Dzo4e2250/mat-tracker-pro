-- Create deletion history table
CREATE TABLE public.deletion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doormat_qr_code TEXT NOT NULL,
  doormat_type doormat_type NOT NULL,
  seller_id UUID,
  seller_name TEXT,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deletion_type TEXT NOT NULL, -- 'selected', 'bulk_seller', 'single'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deletion_history ENABLE ROW LEVEL SECURITY;

-- Inventar can view all deletion history
CREATE POLICY "Inventar can view deletion history"
ON public.deletion_history
FOR SELECT
USING (has_role(auth.uid(), 'INVENTAR'::app_role));

-- Inventar can insert deletion history
CREATE POLICY "Inventar can insert deletion history"
ON public.deletion_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'INVENTAR'::app_role));

-- Create index for faster queries
CREATE INDEX idx_deletion_history_deleted_at ON public.deletion_history(deleted_at DESC);
CREATE INDEX idx_deletion_history_seller_id ON public.deletion_history(seller_id);