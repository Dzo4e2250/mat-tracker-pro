-- Update the handle_new_user function with correct email spelling
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
  
  -- Automatically assign INVENTAR role to ristovegeorge@gmail.com
  IF NEW.email = 'ristovegeorge@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'INVENTAR');
  END IF;
  
  RETURN NEW;
END;
$$;