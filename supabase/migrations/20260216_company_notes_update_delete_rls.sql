-- company_notes: Users can only UPDATE their own notes
DROP POLICY IF EXISTS "Users can update own notes" ON mat_tracker.company_notes;
CREATE POLICY "Users can update own notes" ON mat_tracker.company_notes
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- company_notes: Users can only DELETE their own notes
DROP POLICY IF EXISTS "Users can delete own notes" ON mat_tracker.company_notes;
CREATE POLICY "Users can delete own notes" ON mat_tracker.company_notes
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Admin/inventar can update any notes
DROP POLICY IF EXISTS "Admin can update any notes" ON mat_tracker.company_notes;
CREATE POLICY "Admin can update any notes" ON mat_tracker.company_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'inventar')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'inventar')
    )
  );

-- Admin/inventar can delete any notes
DROP POLICY IF EXISTS "Admin can delete any notes" ON mat_tracker.company_notes;
CREATE POLICY "Admin can delete any notes" ON mat_tracker.company_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'inventar')
    )
  );
