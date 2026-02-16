-- Add UPDATE policy for company_notes table
-- Users can update their own notes

CREATE POLICY "Allow users to update their own notes"
  ON company_notes FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
