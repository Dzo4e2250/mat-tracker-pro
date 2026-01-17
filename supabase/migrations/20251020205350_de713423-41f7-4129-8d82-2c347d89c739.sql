-- Create enum for doormat types
CREATE TYPE public.doormat_type AS ENUM ('MBW0', 'MBW1', 'MBW2', 'MBW4', 'ERM10R', 'ERM11R');

-- Create enum for doormat status
CREATE TYPE public.doormat_status AS ENUM (
  'sent_by_inventar',    -- Poslano inventarjem
  'with_seller',         -- Pri prodajalcu (čist)
  'on_test',            -- Na testu pri stranki
  'dirty',              -- Umazan pri prodajalcu
  'collected_by_delivery' -- Pobrano za čiščenje
);

-- Create doormats table
CREATE TABLE public.doormats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  type doormat_type NOT NULL,
  status doormat_status NOT NULL DEFAULT 'sent_by_inventar',
  seller_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_placements table
CREATE TABLE public.test_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doormat_id UUID REFERENCES public.doormats(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  contact_role TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  tax_number TEXT,
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  extended_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, collected, contract_signed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contacts table (generated from test placements)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  contact_role TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  tax_number TEXT,
  first_contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.doormats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doormats
CREATE POLICY "Inventar can view all doormats"
  ON public.doormats FOR SELECT
  USING (has_role(auth.uid(), 'INVENTAR'::app_role));

CREATE POLICY "Inventar can insert doormats"
  ON public.doormats FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'INVENTAR'::app_role));

CREATE POLICY "Inventar can update doormats"
  ON public.doormats FOR UPDATE
  USING (has_role(auth.uid(), 'INVENTAR'::app_role));

CREATE POLICY "Sellers can view their doormats"
  ON public.doormats FOR SELECT
  USING (has_role(auth.uid(), 'PRODAJALEC'::app_role) AND seller_id = auth.uid());

CREATE POLICY "Sellers can update their doormats"
  ON public.doormats FOR UPDATE
  USING (has_role(auth.uid(), 'PRODAJALEC'::app_role) AND seller_id = auth.uid());

-- RLS Policies for test_placements
CREATE POLICY "Sellers can view their test placements"
  ON public.test_placements FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert their test placements"
  ON public.test_placements FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their test placements"
  ON public.test_placements FOR UPDATE
  USING (seller_id = auth.uid());

CREATE POLICY "Inventar can view all test placements"
  ON public.test_placements FOR SELECT
  USING (has_role(auth.uid(), 'INVENTAR'::app_role));

-- RLS Policies for contacts
CREATE POLICY "Sellers can view their contacts"
  ON public.contacts FOR SELECT
  USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert their contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their contacts"
  ON public.contacts FOR UPDATE
  USING (seller_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_doormats_updated_at
  BEFORE UPDATE ON public.doormats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to count dirty doormats and notify inventar
CREATE OR REPLACE FUNCTION public.check_dirty_doormats_count()
RETURNS TRIGGER AS $$
DECLARE
  dirty_count INTEGER;
BEGIN
  -- Count dirty doormats for this seller
  SELECT COUNT(*) INTO dirty_count
  FROM public.doormats
  WHERE seller_id = NEW.seller_id
    AND status = 'dirty';
  
  -- If count reaches 10 or more, we should notify (handled in app)
  -- This function just ensures data integrity
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER check_dirty_count_trigger
  AFTER UPDATE ON public.doormats
  FOR EACH ROW
  WHEN (NEW.status = 'dirty')
  EXECUTE FUNCTION public.check_dirty_doormats_count();