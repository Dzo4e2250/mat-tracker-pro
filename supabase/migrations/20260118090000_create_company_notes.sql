-- Create company_notes table for storing notes about companies
CREATE TABLE IF NOT EXISTS company_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS idx_company_notes_company_id ON company_notes(company_id);

-- Enable RLS
ALTER TABLE company_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all notes
CREATE POLICY "Allow authenticated users to read company notes"
  ON company_notes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert notes
CREATE POLICY "Allow authenticated users to insert company notes"
  ON company_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to delete their own notes
CREATE POLICY "Allow users to delete their own notes"
  ON company_notes FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
