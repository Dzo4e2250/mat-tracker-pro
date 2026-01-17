-- Fix transport notification trigger to properly update dirty_count
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
      -- Update the count with the actual current count
      UPDATE public.transport_notifications
      SET dirty_count = (
        SELECT COUNT(*)
        FROM public.doormats
        WHERE seller_id = NEW.seller_id
          AND status = 'dirty'
      )
      WHERE id = existing_notification;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
