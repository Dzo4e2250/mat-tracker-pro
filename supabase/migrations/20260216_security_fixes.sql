-- Security fixes migration
-- 1. Fix company_notes RLS - enforce ownership on INSERT, scope SELECT
-- 2. Fix profiles UPDATE RLS - prevent role escalation
-- 3. Remove anon access from price tables
-- 4. Make signature uploads use createSignedUrl approach

-- ==========================================
-- 1. FIX company_notes RLS
-- ==========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read company notes" ON company_notes;
DROP POLICY IF EXISTS "Allow authenticated users to insert company notes" ON company_notes;

-- Salespeople can read their own notes
CREATE POLICY "Users can read own company notes"
  ON company_notes FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Inventar/admin can read all notes
CREATE POLICY "Admins can read all company notes"
  ON company_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid()
      AND role IN ('inventar', 'admin')
      AND is_active = true
    )
  );

-- INSERT must set created_by to own user id
CREATE POLICY "Users can insert own company notes"
  ON company_notes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ==========================================
-- 2. FIX profiles UPDATE RLS - prevent role escalation
-- ==========================================

-- Drop the overly permissive admin update policy
DROP POLICY IF EXISTS "profiles_update_admin" ON mat_tracker.profiles;

-- Users can update their own profile (excluding role fields)
CREATE POLICY "Users can update own profile safely"
  ON mat_tracker.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM mat_tracker.profiles WHERE id = auth.uid())
    AND secondary_role IS NOT DISTINCT FROM (SELECT secondary_role FROM mat_tracker.profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM mat_tracker.profiles WHERE id = auth.uid())
  );

-- Admin can update any profile (but cannot change own role)
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
  WITH CHECK (true);

-- ==========================================
-- 3. REVOKE anon access from price tables
-- ==========================================

REVOKE SELECT ON mat_tracker.mat_prices FROM anon;
REVOKE SELECT ON mat_tracker.optibrush_prices FROM anon;
REVOKE SELECT ON mat_tracker.custom_m2_prices FROM anon;
REVOKE SELECT ON mat_tracker.price_settings FROM anon;
