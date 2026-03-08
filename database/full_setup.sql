-- =====================================================
-- MAT TRACKER PRO - KOMPLETNA POSTAVITEV BAZE
-- =====================================================
-- Ta skripta ustvari celotno bazo podatkov od nic.
-- Zazeni jo v Supabase SQL Editorju ali psql.
--
-- Predpogoji:
--   - Supabase instanca (cloud ali self-hosted)
--   - auth.users tabela ze obstaja (Supabase jo ustvari)
--
-- Zadnja posodobitev: 2026-03-08
-- =====================================================

-- =====================================================
-- 1. RAZSIRITVE IN SHEMA
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- sifriranje AI API kljucev
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy iskanje podjetij

CREATE SCHEMA IF NOT EXISTS mat_tracker;
SET search_path TO mat_tracker, public;

-- =====================================================
-- 2. PROFILES (razsiri auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('prodajalec', 'inventar', 'admin', 'prodajalec_oblek')),
  secondary_role VARCHAR(20) DEFAULT NULL,
  code_prefix TEXT UNIQUE,       -- npr. 'STAN' za Stanka, 'MAJ' za Majo
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_secondary_role_check CHECK (
    secondary_role IS NULL OR secondary_role IN ('prodajalec', 'inventar', 'admin')
  )
);

ALTER TABLE mat_tracker.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON mat_tracker.profiles FOR SELECT TO authenticated USING (true);

-- Uporabniki lahko posodobijo svoj profil (brez spremembe vloge)
CREATE POLICY "Users can update own profile safely"
  ON mat_tracker.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM mat_tracker.profiles WHERE id = auth.uid())
    AND secondary_role IS NOT DISTINCT FROM (SELECT secondary_role FROM mat_tracker.profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM mat_tracker.profiles WHERE id = auth.uid())
  );

-- Admin lahko posodobi vse profile (ne more degradirati samega sebe)
CREATE POLICY "Admin can update other profiles"
  ON mat_tracker.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    (id != auth.uid() OR role = 'admin')
    AND role IN ('admin', 'inventar', 'prodajalec')
  );

-- =====================================================
-- 3. MAT_TYPES (tipi predpraznikov)
-- =====================================================

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

ALTER TABLE mat_tracker.mat_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mat_types_select_all" ON mat_tracker.mat_types FOR SELECT USING (true);

-- =====================================================
-- 4. COMPANIES (podjetja/stranke)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_number TEXT,
  registration_number TEXT,
  address_street TEXT,
  address_city TEXT,
  address_postal TEXT,
  address_country TEXT DEFAULT 'Slovenija',
  delivery_address TEXT,
  delivery_postal TEXT,
  delivery_city TEXT,
  billing_address TEXT,
  billing_postal TEXT,
  billing_city TEXT,
  working_hours TEXT,
  delivery_instructions TEXT,
  customer_number TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  pipeline_status TEXT,
  contract_sent_at TIMESTAMPTZ,
  contract_called_at TIMESTAMPTZ,
  offer_sent_at TIMESTAMPTZ,
  offer_called_at TIMESTAMPTZ,
  parent_company_id UUID REFERENCES mat_tracker.companies(id) ON DELETE SET NULL,
  is_in_d365 BOOLEAN DEFAULT false,
  created_by UUID REFERENCES mat_tracker.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON mat_tracker.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON mat_tracker.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id ON mat_tracker.companies(parent_company_id);

ALTER TABLE mat_tracker.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_authenticated"
  ON mat_tracker.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "companies_insert_own"
  ON mat_tracker.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "companies_update_own"
  ON mat_tracker.companies FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- =====================================================
-- 5. CONTACTS (kontaktne osebe)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  work_phone TEXT,
  role TEXT,
  is_decision_maker BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  is_billing_contact BOOLEAN DEFAULT false,
  is_service_contact BOOLEAN DEFAULT false,
  notes TEXT,
  contact_since TEXT,
  location_address TEXT,
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
  ON mat_tracker.contacts FOR ALL USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM mat_tracker.companies c WHERE c.id = company_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  ) WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM mat_tracker.companies c WHERE c.id = company_id AND c.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin'))
  );

-- =====================================================
-- 6. COMPANY_NOTES (belezke za podjetja)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.company_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id) ON DELETE CASCADE,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activity_category TEXT,
  activity_subcategory TEXT,
  appointment_type TEXT,
  start_time TEXT,
  end_time TEXT,
  exported_to_d365_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_notes_company_id ON mat_tracker.company_notes(company_id);

ALTER TABLE mat_tracker.company_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company notes"
  ON mat_tracker.company_notes FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can read all company notes"
  ON mat_tracker.company_notes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin') AND is_active = true)
  );

CREATE POLICY "Users can insert own company notes"
  ON mat_tracker.company_notes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own notes"
  ON mat_tracker.company_notes FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON mat_tracker.company_notes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admin can update any notes"
  ON mat_tracker.company_notes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'inventar')))
  WITH CHECK (EXISTS (SELECT 1 FROM mat_tracker.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'inventar')));

CREATE POLICY "Admin can delete any notes"
  ON mat_tracker.company_notes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'inventar')));

-- =====================================================
-- 7. REMINDERS (opomniki)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES mat_tracker.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reminder_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  is_completed BOOLEAN DEFAULT false,
  reminder_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mat_tracker.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON mat_tracker.reminders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders"
  ON mat_tracker.reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON mat_tracker.reminders FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON mat_tracker.reminders FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 8. QR_CODES
-- =====================================================

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
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 9. CYCLES (zivljenjski cikel predpraznika)
-- =====================================================

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

-- =====================================================
-- 10. CYCLE_HISTORY (revizijska sled)
-- =====================================================

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

-- =====================================================
-- 11. ORDERS (narocila za QR kode)
-- =====================================================

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
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 12. ORDER_ITEMS
-- =====================================================

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

-- =====================================================
-- 13. EMAIL_TEMPLATES
-- =====================================================

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

-- =====================================================
-- 14. SENT_EMAILS
-- =====================================================

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

-- =====================================================
-- 15. OFFER_ITEMS (postavke ponudb)
-- =====================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT offer_items_price_rental_positive CHECK (price_rental IS NULL OR price_rental > 0),
  CONSTRAINT offer_items_price_purchase_positive CHECK (price_purchase IS NULL OR price_purchase > 0),
  CONSTRAINT offer_items_quantity_positive CHECK (quantity > 0)
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

-- =====================================================
-- 16. DRIVERS (soferji)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  region TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 17. DRIVER_PICKUPS (prevzemi)
-- =====================================================

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
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 18. DRIVER_PICKUP_ITEMS
-- =====================================================

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

-- =====================================================
-- 19. CENIK - mat_prices
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.mat_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('poslovni', 'ergonomski', 'zunanji', 'design')),
  m2 NUMERIC(6,3) NOT NULL,
  dimensions TEXT NOT NULL,
  price_week_1 NUMERIC(8,2) NOT NULL,
  price_week_2 NUMERIC(8,2) NOT NULL,
  price_week_3 NUMERIC(8,2) NOT NULL,
  price_week_4 NUMERIC(8,2) NOT NULL,
  price_purchase NUMERIC(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mat_prices_category ON mat_tracker.mat_prices(category);
CREATE INDEX IF NOT EXISTS idx_mat_prices_code ON mat_tracker.mat_prices(code);

ALTER TABLE mat_tracker.mat_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mat_prices_read_all" ON mat_tracker.mat_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "mat_prices_write_inventar" ON mat_tracker.mat_prices
  FOR ALL USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 20. CENIK - optibrush_prices
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.optibrush_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  has_edge BOOLEAN NOT NULL,
  has_drainage BOOLEAN NOT NULL,
  is_standard BOOLEAN NOT NULL,
  is_large BOOLEAN NOT NULL,           -- > 7.5 m2
  color_count TEXT NOT NULL CHECK (color_count IN ('1', '2-3')),
  price_per_m2 NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(has_edge, has_drainage, is_standard, is_large, color_count)
);

ALTER TABLE mat_tracker.optibrush_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "optibrush_prices_read_all" ON mat_tracker.optibrush_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "optibrush_prices_write_inventar" ON mat_tracker.optibrush_prices
  FOR ALL USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 21. CENIK - optibrush_standard_sizes
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.optibrush_standard_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  width_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (width_cm, height_cm)
);

ALTER TABLE mat_tracker.optibrush_standard_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read optibrush_standard_sizes for authenticated users"
  ON mat_tracker.optibrush_standard_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for inventar on optibrush_standard_sizes"
  ON mat_tracker.optibrush_standard_sizes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 22. CENIK - custom_m2_prices
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.custom_m2_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_category TEXT NOT NULL CHECK (size_category IN ('small', 'large')),
  frequency TEXT NOT NULL CHECK (frequency IN ('1', '2', '3', '4')),
  price_per_m2 NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(size_category, frequency)
);

ALTER TABLE mat_tracker.custom_m2_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_m2_prices_read_all" ON mat_tracker.custom_m2_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_m2_prices_write_inventar" ON mat_tracker.custom_m2_prices
  FOR ALL USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 23. CENIK - price_settings
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.price_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC(10,4) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mat_tracker.price_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_settings_read_all" ON mat_tracker.price_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "price_settings_write_inventar" ON mat_tracker.price_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role IN ('inventar', 'admin')));

-- =====================================================
-- 24. GPS_TRACKING_SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.gps_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_km DECIMAL(10,3),
  points JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_tracking_sessions_salesperson ON mat_tracker.gps_tracking_sessions(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_sessions_started_at ON mat_tracker.gps_tracking_sessions(started_at);

ALTER TABLE mat_tracker.gps_tracking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gps sessions"
  ON mat_tracker.gps_tracking_sessions FOR SELECT USING (auth.uid() = salesperson_id);
CREATE POLICY "Users can insert own gps sessions"
  ON mat_tracker.gps_tracking_sessions FOR INSERT WITH CHECK (auth.uid() = salesperson_id);
CREATE POLICY "Users can update own gps sessions"
  ON mat_tracker.gps_tracking_sessions FOR UPDATE USING (auth.uid() = salesperson_id);
CREATE POLICY "Admins can view all gps sessions"
  ON mat_tracker.gps_tracking_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 25. TRAVEL_LOGS (potni nalogi)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  vehicle_brand VARCHAR(100),
  vehicle_registration VARCHAR(20),
  vehicle_owner VARCHAR(200),
  starting_odometer INTEGER,
  ending_odometer INTEGER,
  private_km_limit INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_travel_logs_user_id ON mat_tracker.travel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_month_year ON mat_tracker.travel_logs(year, month);

ALTER TABLE mat_tracker.travel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own travel logs"
  ON mat_tracker.travel_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own travel logs"
  ON mat_tracker.travel_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own travel logs"
  ON mat_tracker.travel_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own travel logs"
  ON mat_tracker.travel_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all travel logs"
  ON mat_tracker.travel_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 26. TRAVEL_LOG_ENTRIES (dnevni vnosi)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.travel_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_log_id UUID NOT NULL REFERENCES mat_tracker.travel_logs(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  route VARCHAR(200),
  purpose VARCHAR(50) NOT NULL DEFAULT 'prosto',
  km_business INTEGER DEFAULT 0,
  km_private INTEGER DEFAULT 0,
  odometer_reading INTEGER,
  start_time TIME,
  end_time TIME,
  gps_session_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(travel_log_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_travel_log_entries_travel_log_id ON mat_tracker.travel_log_entries(travel_log_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_entries_date ON mat_tracker.travel_log_entries(entry_date);

ALTER TABLE mat_tracker.travel_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own travel log entries"
  ON mat_tracker.travel_log_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM mat_tracker.travel_logs WHERE id = travel_log_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own travel log entries"
  ON mat_tracker.travel_log_entries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM mat_tracker.travel_logs WHERE id = travel_log_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own travel log entries"
  ON mat_tracker.travel_log_entries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM mat_tracker.travel_logs WHERE id = travel_log_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own travel log entries"
  ON mat_tracker.travel_log_entries FOR DELETE
  USING (EXISTS (SELECT 1 FROM mat_tracker.travel_logs WHERE id = travel_log_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all travel log entries"
  ON mat_tracker.travel_log_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 27. USER_AI_SETTINGS (AI nastavitve z enkripcijo)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_api_key BYTEA NOT NULL,
  fast_model TEXT NOT NULL,
  smart_model TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE mat_tracker.user_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_ai_settings" ON mat_tracker.user_ai_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 28. TASKS (kanban naloge)
-- =====================================================

CREATE TABLE IF NOT EXISTS mat_tracker.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'needs_help')),
  salesperson_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES mat_tracker.companies(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES mat_tracker.reminders(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL DEFAULT 'simple',
  checklist_items JSONB DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_salesperson_id ON mat_tracker.tasks(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON mat_tracker.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON mat_tracker.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON mat_tracker.tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON mat_tracker.tasks(position);

ALTER TABLE mat_tracker.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks" ON mat_tracker.tasks
  FOR SELECT USING (auth.uid() = salesperson_id);
CREATE POLICY "Users can create their own tasks" ON mat_tracker.tasks
  FOR INSERT WITH CHECK (auth.uid() = salesperson_id);
CREATE POLICY "Users can update their own tasks" ON mat_tracker.tasks
  FOR UPDATE USING (auth.uid() = salesperson_id);
CREATE POLICY "Users can delete their own tasks" ON mat_tracker.tasks
  FOR DELETE USING (auth.uid() = salesperson_id);

-- =====================================================
-- 29. SLOVENIAN_COMPANIES (register podjetij - opcijsko)
-- =====================================================
-- Podatke (~278.000 vrstic) je treba uvoziti iz AJPES registra.

CREATE TABLE IF NOT EXISTS mat_tracker.slovenian_companies (
  id SERIAL PRIMARY KEY,
  tax_number VARCHAR(20),
  registration_number VARCHAR(20),
  name TEXT NOT NULL,
  address_street TEXT,
  address_postal VARCHAR(10),
  address_city TEXT,
  activity_code VARCHAR(20),
  is_vat_payer BOOLEAN DEFAULT false,
  legal_form TEXT
);

CREATE INDEX IF NOT EXISTS idx_slovenian_companies_name_trgm
  ON mat_tracker.slovenian_companies USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_slovenian_companies_tax
  ON mat_tracker.slovenian_companies(tax_number);

-- =====================================================
-- 30. FUNKCIJE IN TRIGGERJI
-- =====================================================

-- AI nastavitve: sifriranje
CREATE OR REPLACE FUNCTION mat_tracker.save_ai_setting(
  p_user_id UUID, p_provider TEXT, p_api_key TEXT,
  p_fast_model TEXT, p_smart_model TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pass TEXT;
BEGIN
  v_pass := current_setting('app.ai_key_passphrase', true);
  INSERT INTO mat_tracker.user_ai_settings (user_id, provider, encrypted_api_key, fast_model, smart_model)
  VALUES (p_user_id, p_provider, extensions.pgp_sym_encrypt(p_api_key, v_pass), p_fast_model, p_smart_model)
  ON CONFLICT (user_id, provider) DO UPDATE SET
    encrypted_api_key = extensions.pgp_sym_encrypt(p_api_key, v_pass),
    fast_model = p_fast_model, smart_model = p_smart_model, updated_at = NOW();
END; $$;

-- AI nastavitve: desifriranje
CREATE OR REPLACE FUNCTION mat_tracker.get_ai_settings_decrypted(p_user_id UUID)
RETURNS TABLE(provider TEXT, decrypted_key TEXT, fast_model TEXT, smart_model TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pass TEXT;
BEGIN
  v_pass := current_setting('app.ai_key_passphrase', true);
  RETURN QUERY SELECT uas.provider,
    extensions.pgp_sym_decrypt(uas.encrypted_api_key, v_pass),
    uas.fast_model, uas.smart_model
  FROM mat_tracker.user_ai_settings uas
  WHERE uas.user_id = p_user_id AND uas.is_active = true
  ORDER BY uas.updated_at DESC LIMIT 1;
END; $$;

-- Fuzzy iskanje podjetij v registru
CREATE OR REPLACE FUNCTION mat_tracker.search_companies_fuzzy(
  p_name TEXT, p_city TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
  id INTEGER, tax_number VARCHAR(20), registration_number VARCHAR(20),
  name TEXT, address_street TEXT, address_postal VARCHAR(10),
  address_city TEXT, activity_code VARCHAR(20), is_vat_payer BOOLEAN,
  legal_form TEXT, similarity_score REAL
) LANGUAGE sql STABLE AS $$
  SELECT sc.id, sc.tax_number, sc.registration_number, sc.name,
    sc.address_street, sc.address_postal, sc.address_city,
    sc.activity_code, sc.is_vat_payer, sc.legal_form,
    GREATEST(similarity(sc.name, p_name),
      CASE WHEN sc.name ILIKE '%' || p_name || '%' THEN 0.7 ELSE 0.0 END
    ) AS similarity_score
  FROM mat_tracker.slovenian_companies sc
  WHERE (similarity(sc.name, p_name) > 0.15
    OR sc.name ILIKE '%' || p_name || '%')
    AND (p_city IS NULL OR sc.address_city ILIKE '%' || p_city || '%')
  ORDER BY similarity_score DESC LIMIT p_limit;
$$;

-- Travel log: updated_at trigger
CREATE OR REPLACE FUNCTION mat_tracker.update_travel_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS travel_logs_updated_at ON mat_tracker.travel_logs;
CREATE TRIGGER travel_logs_updated_at
  BEFORE UPDATE ON mat_tracker.travel_logs
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.update_travel_log_updated_at();

DROP TRIGGER IF EXISTS travel_log_entries_updated_at ON mat_tracker.travel_log_entries;
CREATE TRIGGER travel_log_entries_updated_at
  BEFORE UPDATE ON mat_tracker.travel_log_entries
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.update_travel_log_updated_at();

-- Tasks: updated_at trigger
CREATE OR REPLACE FUNCTION mat_tracker.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON mat_tracker.tasks
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.update_tasks_updated_at();

-- Tasks: completed_at auto-set
CREATE OR REPLACE FUNCTION mat_tracker.set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
  BEFORE UPDATE ON mat_tracker.tasks
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.set_task_completed_at();

-- =====================================================
-- 31. STORAGE BUCKET (avatarji)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- =====================================================
-- 32. DOVOLJENJA (GRANTS)
-- =====================================================

GRANT USAGE ON SCHEMA mat_tracker TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA mat_tracker TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mat_tracker TO authenticated;

-- Cenovne tabele: branje samo za authenticated (ne anon!)
GRANT SELECT ON mat_tracker.mat_prices TO authenticated;
GRANT SELECT ON mat_tracker.optibrush_prices TO authenticated;
GRANT SELECT ON mat_tracker.custom_m2_prices TO authenticated;
GRANT SELECT ON mat_tracker.price_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.mat_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.optibrush_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.custom_m2_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.price_settings TO authenticated;

-- =====================================================
-- 33. SEED DATA - zacetni podatki
-- =====================================================

-- Tipi predpraznikov
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

INSERT INTO mat_tracker.mat_types (name, width_cm, height_cm, category) VALUES
  ('Dizajn 60x85', 60, 85, 'design'),
  ('Dizajn 60x90', 60, 90, 'design'),
  ('Dizajn 85x150', 85, 150, 'design'),
  ('Dizajn 115x180', 115, 180, 'design'),
  ('Dizajn 115x240', 115, 240, 'design'),
  ('Dizajn 150x250', 150, 250, 'design'),
  ('Dizajn 150x300', 150, 300, 'design')
ON CONFLICT DO NOTHING;

-- Cenik predpraznikov
INSERT INTO mat_tracker.mat_prices (code, name, category, m2, dimensions, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase) VALUES
  ('MBW0', 'Poslovni predpraznik', 'poslovni', 0.64, '85*75', 4.98, 2.87, 2.00, 1.72, 39.09),
  ('MBW1', 'Poslovni predpraznik', 'poslovni', 1.28, '85*150', 6.80, 4.03, 2.85, 2.48, 75.33),
  ('MBW2', 'Poslovni predpraznik', 'poslovni', 2.30, '115*200', 10.95, 6.30, 4.54, 3.68, 133.61),
  ('MBW3', 'Poslovni predpraznik', 'poslovni', 2.76, '115*240', 15.11, 8.69, 6.27, 5.08, 159.00),
  ('MBW4', 'Poslovni predpraznik', 'poslovni', 4.50, '150*300', 19.38, 10.75, 7.82, 6.51, 258.69),
  ('ERM10R', 'Ergonomski predpraznik', 'ergonomski', 0.46, '86*54', 6.01, 3.21, 2.86, 1.96, 44.15),
  ('ERM11R', 'Ergonomski predpraznik', 'ergonomski', 1.22, '86*142', 7.68, 4.68, 3.58, 3.08, 110.77),
  ('ERM49R', 'Zunanji predpraznik', 'zunanji', 1.28, '85*150', 7.73, 4.37, 3.12, 2.72, 92.91),
  ('ERM51R', 'Zunanji predpraznik', 'zunanji', 2.01, '115*175', 10.14, 5.80, 4.00, 3.54, 145.07),
  ('DESIGN-60x85', 'Design predpraznik', 'design', 0.48, '60*85', 6.73, 4.10, 3.07, 2.84, 46.05),
  ('DESIGN-75x85', 'Design predpraznik', 'design', 0.64, '75*85', 7.22, 4.50, 3.33, 3.10, 57.57),
  ('DESIGN-85x115', 'Design predpraznik', 'design', 0.98, '85*115', 8.53, 5.31, 4.03, 3.79, 88.27),
  ('DESIGN-85x120', 'Design predpraznik', 'design', 1.02, '85*120', 8.77, 5.42, 4.13, 3.87, 92.11),
  ('DESIGN-85x150', 'Design predpraznik', 'design', 1.28, '85*150', 10.00, 6.08, 4.65, 4.39, 115.13),
  ('DESIGN-85x250', 'Design predpraznik', 'design', 2.13, '85*250', 14.45, 9.09, 7.25, 6.53, 191.89),
  ('DESIGN-85x300', 'Design predpraznik', 'design', 2.55, '85*300', 15.95, 10.18, 8.10, 7.39, 230.27),
  ('DESIGN-115x180', 'Design predpraznik', 'design', 2.07, '115*180', 14.24, 8.94, 7.10, 6.42, 186.92),
  ('DESIGN-115x200', 'Design predpraznik', 'design', 2.30, '115*200', 15.65, 9.54, 7.55, 6.89, 207.69),
  ('DESIGN-115x240', 'Design predpraznik', 'design', 2.76, '115*240', 17.72, 11.21, 8.75, 8.08, 249.23),
  ('DESIGN-115x250', 'Design predpraznik', 'design', 2.88, '115*250', 18.00, 11.51, 8.99, 8.31, 259.61),
  ('DESIGN-115x300', 'Design predpraznik', 'design', 3.45, '115*300', 21.60, 13.00, 10.50, 9.47, 311.54),
  ('DESIGN-150x200', 'Design predpraznik', 'design', 3.00, '150*200', 18.65, 11.83, 9.30, 8.56, 270.90),
  ('DESIGN-150x240', 'Design predpraznik', 'design', 3.60, '150*240', 21.85, 13.39, 10.60, 9.78, 325.08),
  ('DESIGN-150x250', 'Design predpraznik', 'design', 3.75, '150*250', 22.75, 14.20, 11.62, 10.49, 338.63),
  ('DESIGN-150x300', 'Design predpraznik', 'design', 4.50, '150*300', 25.87, 16.49, 13.48, 12.01, 406.35),
  ('DESIGN-200x200', 'Design predpraznik', 'design', 4.00, '200*200', 26.26, 18.12, 12.60, 11.00, 361.20),
  ('DESIGN-200x300', 'Design predpraznik', 'design', 6.00, '200*300', 34.61, 27.01, 17.08, 15.04, 541.80),
  ('DESIGN-100x100', 'Design predpraznik', 'design', 1.00, '100*100', 9.37, 5.65, 4.41, 3.83, 90.30)
ON CONFLICT (code) DO UPDATE SET
  price_week_1 = EXCLUDED.price_week_1, price_week_2 = EXCLUDED.price_week_2,
  price_week_3 = EXCLUDED.price_week_3, price_week_4 = EXCLUDED.price_week_4,
  price_purchase = EXCLUDED.price_purchase, updated_at = now();

-- Optibrush cenik
INSERT INTO mat_tracker.optibrush_prices (has_edge, has_drainage, is_standard, is_large, color_count, price_per_m2) VALUES
  (true, false, true, false, '1', 172.36),
  (true, false, true, false, '2-3', 235.73),
  (true, false, false, false, '1', 202.93),
  (true, false, false, false, '2-3', 282.12),
  (true, false, false, true, '1', 233.50),
  (true, false, false, true, '2-3', 328.51),
  (false, false, false, false, '1', 202.93),
  (false, false, false, false, '2-3', 282.12),
  (false, false, false, true, '1', 233.50),
  (false, false, false, true, '2-3', 328.51),
  (true, true, true, false, '1', 186.15),
  (true, true, true, false, '2-3', 254.59),
  (true, true, false, false, '1', 219.16),
  (true, true, false, false, '2-3', 304.69),
  (true, true, false, true, '1', 252.18),
  (true, true, false, true, '2-3', 354.79),
  (false, true, false, false, '1', 219.16),
  (false, true, false, false, '2-3', 304.69),
  (false, true, false, true, '1', 252.18),
  (false, true, false, true, '2-3', 354.79)
ON CONFLICT (has_edge, has_drainage, is_standard, is_large, color_count) DO UPDATE SET
  price_per_m2 = EXCLUDED.price_per_m2, updated_at = now();

-- Optibrush standardne dimenzije
INSERT INTO mat_tracker.optibrush_standard_sizes (width_cm, height_cm) VALUES
  (60, 85), (75, 85), (80, 120), (85, 150), (85, 300),
  (120, 180), (120, 200), (120, 240), (150, 200), (150, 250), (150, 300)
ON CONFLICT DO NOTHING;

-- Custom m2 cene
INSERT INTO mat_tracker.custom_m2_prices (size_category, frequency, price_per_m2) VALUES
  ('small', '1', 9.23), ('small', '2', 5.69), ('small', '3', 4.33), ('small', '4', 4.07),
  ('large', '1', 6.66), ('large', '2', 4.17), ('large', '3', 3.59), ('large', '4', 3.17)
ON CONFLICT (size_category, frequency) DO UPDATE SET
  price_per_m2 = EXCLUDED.price_per_m2, updated_at = now();

-- Nastavitve cenika
INSERT INTO mat_tracker.price_settings (key, value, description) VALUES
  ('special_shape_multiplier', 1.50, 'Mnozitelj za posebne oblike (najem)'),
  ('optibrush_special_shape_multiplier', 1.30, 'Mnozitelj za posebne oblike (Optibrush)'),
  ('design_purchase_price_per_m2', 165.00, 'Cena nakupa Design po m2'),
  ('optibrush_m2_threshold', 7.50, 'Prag m2 za Optibrush (nad = large)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();

-- =====================================================
-- KONEC!
-- =====================================================
-- Naslednji korak: Ustvari prvega admin uporabnika.
--
-- 1. V Supabase Dashboard: Authentication > Users > Add user
-- 2. Zazeni ta SQL (zamenjaj <user-id> z UUID iz koraka 1):
--
--   INSERT INTO mat_tracker.profiles (id, email, first_name, last_name, role, is_active)
--   VALUES ('<user-id>', 'admin@example.com', 'Admin', 'Uporabnik', 'admin', true);
--
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Mat Tracker Pro baza uspesno ustvarjena!';
  RAISE NOTICE '28 tabel, RLS politike, triggerji, funkcije in seed podatki.';
  RAISE NOTICE '========================================';
END $$;
