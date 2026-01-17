-- Step 2: Update roles and RLS policies

-- Remove PRODAJALEC role from ristovegeorge@gmail.com (keep only INVENTAR)
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ristovegeorge@gmail.com')
  AND role = 'PRODAJALEC';

-- Add ADMIN role to vasja.stanko@lindstromgroup.com
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'vasja.stanko@lindstromgroup.com'),
  'ADMIN'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update doormats policies
DROP POLICY IF EXISTS "Inventar can view all doormats" ON public.doormats;
DROP POLICY IF EXISTS "Inventar can update doormats" ON public.doormats;
DROP POLICY IF EXISTS "Inventar can insert doormats" ON public.doormats;
DROP POLICY IF EXISTS "Inventar can delete doormats" ON public.doormats;

CREATE POLICY "Admin and Inventar can view all doormats" 
ON public.doormats FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can update doormats" 
ON public.doormats FOR UPDATE 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can insert doormats" 
ON public.doormats FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can delete doormats" 
ON public.doormats FOR DELETE 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

-- Update deletion_history policies
DROP POLICY IF EXISTS "Inventar can view deletion history" ON public.deletion_history;
DROP POLICY IF EXISTS "Inventar can insert deletion history" ON public.deletion_history;

CREATE POLICY "Admin and Inventar can view deletion history" 
ON public.deletion_history FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can insert deletion history" 
ON public.deletion_history FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

-- Update tester_requests policies
DROP POLICY IF EXISTS "Inventar can view all tester requests" ON public.tester_requests;
DROP POLICY IF EXISTS "Inventar can update tester requests" ON public.tester_requests;
DROP POLICY IF EXISTS "Inventar can insert tester requests" ON public.tester_requests;

CREATE POLICY "Admin and Inventar can view all tester requests" 
ON public.tester_requests FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can update tester requests" 
ON public.tester_requests FOR UPDATE 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

CREATE POLICY "Admin and Inventar can insert tester requests" 
ON public.tester_requests FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

-- Update test_placements policies
DROP POLICY IF EXISTS "Inventar can view all test placements" ON public.test_placements;

CREATE POLICY "Admin and Inventar can view all test placements" 
ON public.test_placements FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'INVENTAR')
);

-- Update user_roles policies
DROP POLICY IF EXISTS "Inventar can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Inventar can insert roles" ON public.user_roles;

CREATE POLICY "Admin can view all roles" 
ON public.user_roles FOR SELECT 
USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admin can insert roles" 
ON public.user_roles FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admin can update roles" 
ON public.user_roles FOR UPDATE 
USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admin can delete roles" 
ON public.user_roles FOR DELETE 
USING (has_role(auth.uid(), 'ADMIN'));

-- Update profiles policies - Admin can update any profile
CREATE POLICY "Admin can update any profile" 
ON public.profiles FOR UPDATE 
USING (has_role(auth.uid(), 'ADMIN'));