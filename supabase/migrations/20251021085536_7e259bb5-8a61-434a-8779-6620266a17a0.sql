-- Create transport_notifications table
CREATE TABLE public.transport_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dirty_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_type TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.transport_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin and Inventar can view all transport notifications"
ON public.transport_notifications
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'INVENTAR'::app_role));

CREATE POLICY "Admin and Inventar can insert transport notifications"
ON public.transport_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'INVENTAR'::app_role));

CREATE POLICY "Admin and Inventar can update transport notifications"
ON public.transport_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'INVENTAR'::app_role));

-- Create trigger function to automatically create transport notifications
CREATE OR REPLACE FUNCTION public.check_and_create_transport_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dirty_count INTEGER;
  existing_notification UUID;
BEGIN
  -- Count dirty doormats for this seller
  SELECT COUNT(*) INTO dirty_count
  FROM public.doormats
  WHERE seller_id = NEW.seller_id
    AND status = 'dirty';
  
  -- If 10 or more, check if there's already an active notification
  IF dirty_count >= 10 THEN
    SELECT id INTO existing_notification
    FROM public.transport_notifications
    WHERE seller_id = NEW.seller_id
      AND status = 'pending'
    LIMIT 1;
    
    -- If doesn't exist, create new one
    IF existing_notification IS NULL THEN
      INSERT INTO public.transport_notifications (seller_id, dirty_count, status)
      VALUES (NEW.seller_id, dirty_count, 'pending');
    ELSE
      -- Update the count
      UPDATE public.transport_notifications
      SET dirty_count = dirty_count
      WHERE id = existing_notification;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on doormats table
CREATE TRIGGER trigger_transport_notification
  AFTER UPDATE OF status ON public.doormats
  FOR EACH ROW
  WHEN (NEW.status = 'dirty')
  EXECUTE FUNCTION public.check_and_create_transport_notification();

-- Also trigger on insert in case doormats are created with dirty status
CREATE TRIGGER trigger_transport_notification_insert
  AFTER INSERT ON public.doormats
  FOR EACH ROW
  WHEN (NEW.status = 'dirty')
  EXECUTE FUNCTION public.check_and_create_transport_notification();