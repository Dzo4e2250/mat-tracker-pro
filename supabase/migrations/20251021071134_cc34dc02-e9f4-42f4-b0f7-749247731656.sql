-- Sprememba vlog za obstoječe uporabnike in ustvarjanje Admin uporabnika (popravljena verzija)

-- 1. Spremeni George Ristov iz INVENTAR v PRODAJALEC
UPDATE public.user_roles 
SET role = 'PRODAJALEC'
WHERE user_id = '13b55386-4cae-4ac4-bdf8-aa393aecdc68' 
AND role = 'INVENTAR';

-- 2. Odstrani ADMIN vlogo za Vasja Stanko (obdrži samo PRODAJALEC)
DELETE FROM public.user_roles 
WHERE user_id = 'd44a7c8f-550f-4e74-8dde-1a57968c77cc' 
AND role = 'ADMIN';

-- 3. Ustvari novega Admin uporabnika
-- Najprej preveri, če uporabnik že obstaja
DO $$
DECLARE
  new_user_id uuid;
  user_exists boolean;
BEGIN
  -- Preveri, če uporabnik že obstaja
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'info@ristov.xyz') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Ustvari uporabnika v auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'info@ristov.xyz',
      crypt('Prijava123', gen_salt('bf')),
      now(),
      '{"full_name": "Admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;
    
    -- Trigger handle_new_user bi moral ustvariti profil avtomatsko
    -- Dodaj samo ADMIN vlogo
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'ADMIN');
  ELSE
    -- Če uporabnik že obstaja, samo preveri, da ima ADMIN vlogo
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'info@ristov.xyz';
    
    -- Dodaj ADMIN vlogo, če je še nima
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'ADMIN')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
END $$;