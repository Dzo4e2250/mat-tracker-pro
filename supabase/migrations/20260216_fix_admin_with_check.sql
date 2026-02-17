-- Fix overly permissive admin WITH CHECK(true) on profiles UPDATE
-- Admin should not be able to:
--   1. Demote themselves (prevent lockout)
--   2. Set invalid roles

DROP POLICY IF EXISTS "Admin can update other profiles" ON mat_tracker.profiles;

CREATE POLICY "Admin can update other profiles"
  ON mat_tracker.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    -- Admin cannot demote themselves
    (id != auth.uid() OR role = 'admin')
    -- Role must be a valid value
    AND role IN ('admin', 'inventar', 'prodajalec')
  );
