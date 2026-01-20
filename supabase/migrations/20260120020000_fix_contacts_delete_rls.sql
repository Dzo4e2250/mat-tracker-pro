-- Fix contacts delete RLS policy
-- Allow company owners to delete contacts from their companies

-- Drop existing policy if exists
DROP POLICY IF EXISTS contacts_manage ON mat_tracker.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON mat_tracker.contacts;
DROP POLICY IF EXISTS "contacts_manage" ON mat_tracker.contacts;

-- Create new policy that allows:
-- 1. Contact creator can manage
-- 2. Company owner can manage contacts from their companies
-- 3. Inventar/admin can manage all
CREATE POLICY contacts_manage ON mat_tracker.contacts
  FOR ALL
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM mat_tracker.companies c WHERE c.id = company_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM mat_tracker.companies c WHERE c.id = company_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  );
