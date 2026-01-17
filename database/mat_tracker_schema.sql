-- MAT TRACKER DATABASE SCHEMA
-- Runs in mat_tracker schema (separate from other projects)
-- Version: 1.0
-- Date: 2026-01-15

-- Set search path
SET search_path TO mat_tracker, public;

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('prodajalec', 'inventar', 'admin')),
  code_prefix TEXT UNIQUE, -- npr. 'STAN' za Stanka, 'MAJ' za Majo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE mat_tracker.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
ON mat_tracker.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_own"
ON mat_tracker.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. MAT_TYPES (tipi predpraznikov)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.mat_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  width_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('standard', 'ergo', 'design')),
  price_1_week DECIMAL(10,2),
  price_2_weeks DECIMAL(10,2),
  price_3_weeks DECIMAL(10,2),
  price_4_weeks DECIMAL(10,2),
  price_purchase DECIMAL(10,2),
  price_penalty DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default mat types
INSERT INTO mat_tracker.mat_types (code, name, width_cm, height_cm, category) VALUES
('MBW0', 'Standardni majhen', 85, 75, 'standard'),
('MBW1', 'Standardni srednji', 85, 150, 'standard'),
('MBW2', 'Standardni velik', 115, 200, 'standard'),
('MBW4', 'Standardni industrijski', 150, 300, 'standard'),
('ERM10R', 'Ergonomski majhen', 86, 54, 'ergo'),
('ERM11R', 'Ergonomski srednji', 86, 142, 'ergo'),
('ERM49R', 'Ergonomski velik', 86, 300, 'ergo'),
('ERM51R', 'Ergonomski sirok', 115, 175, 'ergo')
ON CONFLICT (code) DO NOTHING;

-- Design types (no code, only dimensions)
INSERT INTO mat_tracker.mat_types (name, width_cm, height_cm, category) VALUES
('Dizajn 60x85', 60, 85, 'design'),
('Dizajn 60x90', 60, 90, 'design'),
('Dizajn 85x150', 85, 150, 'design'),
('Dizajn 115x180', 115, 180, 'design'),
('Dizajn 115x240', 115, 240, 'design'),
('Dizajn 150x250', 150, 250, 'design'),
('Dizajn 150x300', 150, 300, 'design')
ON CONFLICT DO NOTHING;

ALTER TABLE mat_tracker.mat_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mat_types_select_all" ON mat_tracker.mat_types FOR SELECT USING (true);

-- ============================================
-- 3. COMPANIES (podjetja/stranke)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_number TEXT,
  registration_number TEXT,
  address_street TEXT,
  address_city TEXT,
  address_postal TEXT,
  address_country TEXT DEFAULT 'Slovenija',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  created_by UUID REFERENCES mat_tracker.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON mat_tracker.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON mat_tracker.companies(created_by);

ALTER TABLE mat_tracker.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_authenticated"
ON mat_tracker.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "companies_insert_own"
ON mat_tracker.companies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "companies_update_own"
ON mat_tracker.companies FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

-- ============================================
-- 4. CONTACTS (kontaktne osebe)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_decision_maker BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES mat_tracker.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON mat_tracker.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON mat_tracker.contacts(email);

ALTER TABLE mat_tracker.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_authenticated"
ON mat_tracker.contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_manage"
ON mat_tracker.contacts FOR ALL TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 5. QR_CODES
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES mat_tracker.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'active')),
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES mat_tracker.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_owner ON mat_tracker.qr_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON mat_tracker.qr_codes(status);

ALTER TABLE mat_tracker.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_codes_select"
ON mat_tracker.qr_codes FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

CREATE POLICY "qr_codes_manage_inventory"
ON mat_tracker.qr_codes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 6. CYCLES (zivljenjski cikel predpraznika)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES mat_tracker.qr_codes(id),
  salesperson_id UUID NOT NULL REFERENCES mat_tracker.profiles(id),
  mat_type_id UUID NOT NULL REFERENCES mat_tracker.mat_types(id),
  status TEXT NOT NULL DEFAULT 'clean' CHECK (status IN ('clean', 'on_test', 'dirty', 'waiting_driver', 'completed')),
  company_id UUID REFERENCES mat_tracker.companies(id),
  contact_id UUID REFERENCES mat_tracker.contacts(id),
  test_start_date TIMESTAMPTZ,
  test_end_date TIMESTAMPTZ,
  extensions_count INTEGER DEFAULT 0,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  contract_signed BOOLEAN DEFAULT false,
  contract_frequency TEXT,
  contract_signed_at TIMESTAMPTZ,
  pickup_requested_at TIMESTAMPTZ,
  driver_pickup_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycles_qr_code ON mat_tracker.cycles(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_cycles_salesperson ON mat_tracker.cycles(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON mat_tracker.cycles(status);
CREATE INDEX IF NOT EXISTS idx_cycles_company ON mat_tracker.cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_cycles_test_end ON mat_tracker.cycles(test_end_date);

ALTER TABLE mat_tracker.cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycles_select"
ON mat_tracker.cycles FOR SELECT TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

CREATE POLICY "cycles_manage"
ON mat_tracker.cycles FOR ALL TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 7. CYCLE_HISTORY (audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.cycle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES mat_tracker.cycles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  metadata JSONB,
  performed_by UUID REFERENCES mat_tracker.profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycle_history_cycle ON mat_tracker.cycle_history(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_history_action ON mat_tracker.cycle_history(action);

ALTER TABLE mat_tracker.cycle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycle_history_select"
ON mat_tracker.cycle_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.cycles c
    WHERE c.id = cycle_id AND (
      c.salesperson_id = auth.uid() OR
      EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
    )
  )
);

-- ============================================
-- 8. ORDERS (narocila za QR kode)
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES mat_tracker.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped', 'received')),
  approved_by UUID REFERENCES mat_tracker.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_salesperson ON mat_tracker.orders(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON mat_tracker.orders(status);

ALTER TABLE mat_tracker.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select"
ON mat_tracker.orders FOR SELECT TO authenticated
USING (
  salesperson_id = auth.uid() OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

CREATE POLICY "orders_insert_own"
ON mat_tracker.orders FOR INSERT TO authenticated
WITH CHECK (salesperson_id = auth.uid());

CREATE POLICY "orders_manage_inventory"
ON mat_tracker.orders FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 9. ORDER_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES mat_tracker.orders(id) ON DELETE CASCADE,
  mat_type_id UUID NOT NULL REFERENCES mat_tracker.mat_types(id),
  quantity_requested INTEGER NOT NULL,
  quantity_approved INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON mat_tracker.order_items(order_id);

ALTER TABLE mat_tracker.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_follow_parent"
ON mat_tracker.order_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.orders o
    WHERE o.id = order_id AND (
      o.salesperson_id = auth.uid() OR
      EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
    )
  )
);

-- ============================================
-- 10. EMAIL_TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  template_type TEXT CHECK (template_type IN ('offer_rental', 'offer_purchase', 'offer_both', 'reminder', 'followup')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mat_tracker.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_select" ON mat_tracker.email_templates FOR SELECT TO authenticated USING (true);

-- ============================================
-- 11. SENT_EMAILS
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES mat_tracker.cycles(id),
  company_id UUID REFERENCES mat_tracker.companies(id),
  contact_id UUID REFERENCES mat_tracker.contacts(id),
  template_id UUID REFERENCES mat_tracker.email_templates(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  offer_type TEXT CHECK (offer_type IN ('rental', 'purchase', 'both')),
  frequency TEXT,
  billionmails_id TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES mat_tracker.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_cycle ON mat_tracker.sent_emails(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_company ON mat_tracker.sent_emails(company_id);

ALTER TABLE mat_tracker.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sent_emails_select"
ON mat_tracker.sent_emails FOR SELECT TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 12. OFFER_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_email_id UUID REFERENCES mat_tracker.sent_emails(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES mat_tracker.cycles(id),
  mat_type_id UUID REFERENCES mat_tracker.mat_types(id),
  is_design BOOLEAN DEFAULT false,
  width_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  price_rental DECIMAL(10,2),
  price_purchase DECIMAL(10,2),
  price_penalty DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_items_email ON mat_tracker.offer_items(sent_email_id);

ALTER TABLE mat_tracker.offer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_items_select"
ON mat_tracker.offer_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.sent_emails se
    WHERE se.id = sent_email_id AND se.created_by = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 13. DRIVER_PICKUPS
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.driver_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_driver TEXT,
  created_by UUID REFERENCES mat_tracker.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mat_tracker.driver_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_pickups_manage_inventory"
ON mat_tracker.driver_pickups FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
);

-- ============================================
-- 14. DRIVER_PICKUP_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS mat_tracker.driver_pickup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID NOT NULL REFERENCES mat_tracker.driver_pickups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES mat_tracker.cycles(id),
  picked_up BOOLEAN DEFAULT false,
  picked_up_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup ON mat_tracker.driver_pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_cycle ON mat_tracker.driver_pickup_items(cycle_id);

ALTER TABLE mat_tracker.driver_pickup_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pickup_items_follow_parent"
ON mat_tracker.driver_pickup_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.driver_pickups p
    WHERE p.id = pickup_id AND
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  )
);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA mat_tracker TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA mat_tracker TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA mat_tracker TO anon;

-- Grant permissions for sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mat_tracker TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Mat Tracker schema created successfully!';
END $$;
