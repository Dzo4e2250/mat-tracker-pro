-- Add RLS policy to allow admin/inventar users to update any profile
-- This fixes the bug where admins couldn't change other users' secondary_role

CREATE POLICY IF NOT EXISTS profiles_update_admin ON mat_tracker.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'inventar')
      AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'inventar')
      AND p.is_active = true
    )
  );
