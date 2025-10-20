-- Update the handle_new_user function to automatically assign INVENTAR role to ristovgeorge@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Automatically assign INVENTAR role to ristovgeorge@gmail.com
  IF NEW.email = 'ristovgeorge@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'INVENTAR');
  END IF;
  
  RETURN NEW;
END;
$$;