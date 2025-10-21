-- Add RLS policy to allow INVENTAR users to view all roles
-- This is needed so INVENTAR users can see the list of sellers (PRODAJALEC roles)
-- in the Tester Requests page

CREATE POLICY "INVENTAR can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'INVENTAR'::app_role));