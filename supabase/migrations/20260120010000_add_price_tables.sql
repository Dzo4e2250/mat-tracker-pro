-- =====================================================
-- CENIK - Vse cene v bazi
-- =====================================================

-- 1. MAT PRICES - MBW, ERM, Design predpražniki
CREATE TABLE IF NOT EXISTS mat_tracker.mat_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('poslovni', 'ergonomski', 'zunanji', 'design')),
  m2 numeric(6,3) NOT NULL,
  dimensions text NOT NULL,
  price_week_1 numeric(8,2) NOT NULL,
  price_week_2 numeric(8,2) NOT NULL,
  price_week_3 numeric(8,2) NOT NULL,
  price_week_4 numeric(8,2) NOT NULL,
  price_purchase numeric(8,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. OPTIBRUSH PRICES
CREATE TABLE IF NOT EXISTS mat_tracker.optibrush_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  has_edge boolean NOT NULL,
  has_drainage boolean NOT NULL,
  is_standard boolean NOT NULL,
  is_large boolean NOT NULL, -- > 7.5 m²
  color_count text NOT NULL CHECK (color_count IN ('1', '2-3')),
  price_per_m2 numeric(8,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(has_edge, has_drainage, is_standard, is_large, color_count)
);

-- 3. CUSTOM M2 PRICES - Cene po m² za custom dimenzije
CREATE TABLE IF NOT EXISTS mat_tracker.custom_m2_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_category text NOT NULL CHECK (size_category IN ('small', 'large')), -- small = <=2m², large = >2m²
  frequency text NOT NULL CHECK (frequency IN ('1', '2', '3', '4')),
  price_per_m2 numeric(8,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(size_category, frequency)
);

-- 4. PRICE SETTINGS - Splošne nastavitve cenika
CREATE TABLE IF NOT EXISTS mat_tracker.price_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value numeric(10,4) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SEED DATA - Začetni podatki
-- =====================================================

-- MAT PRICES - Poslovni (MBW)
INSERT INTO mat_tracker.mat_prices (code, name, category, m2, dimensions, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase) VALUES
('MBW0', 'Poslovni predpražnik', 'poslovni', 0.64, '85*75', 4.98, 2.87, 2.00, 1.72, 39.09),
('MBW1', 'Poslovni predpražnik', 'poslovni', 1.28, '85*150', 6.80, 4.03, 2.85, 2.48, 75.33),
('MBW2', 'Poslovni predpražnik', 'poslovni', 2.30, '115*200', 10.95, 6.30, 4.54, 3.68, 133.61),
('MBW3', 'Poslovni predpražnik', 'poslovni', 2.76, '115*240', 15.11, 8.69, 6.27, 5.08, 159.00),
('MBW4', 'Poslovni predpražnik', 'poslovni', 4.50, '150*300', 19.38, 10.75, 7.82, 6.51, 258.69)
ON CONFLICT (code) DO UPDATE SET
  price_week_1 = EXCLUDED.price_week_1,
  price_week_2 = EXCLUDED.price_week_2,
  price_week_3 = EXCLUDED.price_week_3,
  price_week_4 = EXCLUDED.price_week_4,
  price_purchase = EXCLUDED.price_purchase,
  updated_at = now();

-- MAT PRICES - Ergonomski (ERM)
INSERT INTO mat_tracker.mat_prices (code, name, category, m2, dimensions, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase) VALUES
('ERM10R', 'Ergonomski predpražnik', 'ergonomski', 0.46, '86*54', 6.01, 3.21, 2.86, 1.96, 44.15),
('ERM11R', 'Ergonomski predpražnik', 'ergonomski', 1.22, '86*142', 7.68, 4.68, 3.58, 3.08, 110.77)
ON CONFLICT (code) DO UPDATE SET
  price_week_1 = EXCLUDED.price_week_1,
  price_week_2 = EXCLUDED.price_week_2,
  price_week_3 = EXCLUDED.price_week_3,
  price_week_4 = EXCLUDED.price_week_4,
  price_purchase = EXCLUDED.price_purchase,
  updated_at = now();

-- MAT PRICES - Zunanji (ERM)
INSERT INTO mat_tracker.mat_prices (code, name, category, m2, dimensions, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase) VALUES
('ERM49R', 'Zunanji predpražnik', 'zunanji', 1.28, '85*150', 7.73, 4.37, 3.12, 2.72, 92.91),
('ERM51R', 'Zunanji predpražnik', 'zunanji', 2.01, '115*175', 10.14, 5.80, 4.00, 3.54, 145.07)
ON CONFLICT (code) DO UPDATE SET
  price_week_1 = EXCLUDED.price_week_1,
  price_week_2 = EXCLUDED.price_week_2,
  price_week_3 = EXCLUDED.price_week_3,
  price_week_4 = EXCLUDED.price_week_4,
  price_purchase = EXCLUDED.price_purchase,
  updated_at = now();

-- MAT PRICES - Design
INSERT INTO mat_tracker.mat_prices (code, name, category, m2, dimensions, price_week_1, price_week_2, price_week_3, price_week_4, price_purchase) VALUES
('DESIGN-60x85', 'Design predpražnik', 'design', 0.48, '60*85', 6.73, 4.10, 3.07, 2.84, 46.05),
('DESIGN-75x85', 'Design predpražnik', 'design', 0.64, '75*85', 7.22, 4.50, 3.33, 3.10, 57.57),
('DESIGN-85x115', 'Design predpražnik', 'design', 0.98, '85*115', 8.53, 5.31, 4.03, 3.79, 88.27),
('DESIGN-85x120', 'Design predpražnik', 'design', 1.02, '85*120', 8.77, 5.42, 4.13, 3.87, 92.11),
('DESIGN-85x150', 'Design predpražnik', 'design', 1.28, '85*150', 10.00, 6.08, 4.65, 4.39, 115.13),
('DESIGN-85x250', 'Design predpražnik', 'design', 2.13, '85*250', 14.45, 9.09, 7.25, 6.53, 191.89),
('DESIGN-85x300', 'Design predpražnik', 'design', 2.55, '85*300', 15.95, 10.18, 8.10, 7.39, 230.27),
('DESIGN-115x180', 'Design predpražnik', 'design', 2.07, '115*180', 14.24, 8.94, 7.10, 6.42, 186.92),
('DESIGN-115x200', 'Design predpražnik', 'design', 2.30, '115*200', 15.65, 9.54, 7.55, 6.89, 207.69),
('DESIGN-115x240', 'Design predpražnik', 'design', 2.76, '115*240', 17.72, 11.21, 8.75, 8.08, 249.23),
('DESIGN-115x250', 'Design predpražnik', 'design', 2.88, '115*250', 18.00, 11.51, 8.99, 8.31, 259.61),
('DESIGN-115x300', 'Design predpražnik', 'design', 3.45, '115*300', 21.60, 13.00, 10.50, 9.47, 311.54),
('DESIGN-150x200', 'Design predpražnik', 'design', 3.00, '150*200', 18.65, 11.83, 9.30, 8.56, 270.90),
('DESIGN-150x240', 'Design predpražnik', 'design', 3.60, '150*240', 21.85, 13.39, 10.60, 9.78, 325.08),
('DESIGN-150x250', 'Design predpražnik', 'design', 3.75, '150*250', 22.75, 14.20, 11.62, 10.49, 338.63),
('DESIGN-150x300', 'Design predpražnik', 'design', 4.50, '150*300', 25.87, 16.49, 13.48, 12.01, 406.35),
('DESIGN-200x200', 'Design predpražnik', 'design', 4.00, '200*200', 26.26, 18.12, 12.60, 11.00, 361.20),
('DESIGN-200x300', 'Design predpražnik', 'design', 6.00, '200*300', 34.61, 27.01, 17.08, 15.04, 541.80),
('DESIGN-100x100', 'Design predpražnik', 'design', 1.00, '100*100', 9.37, 5.65, 4.41, 3.83, 90.30)
ON CONFLICT (code) DO UPDATE SET
  price_week_1 = EXCLUDED.price_week_1,
  price_week_2 = EXCLUDED.price_week_2,
  price_week_3 = EXCLUDED.price_week_3,
  price_week_4 = EXCLUDED.price_week_4,
  price_purchase = EXCLUDED.price_purchase,
  updated_at = now();

-- OPTIBRUSH PRICES
-- Z robom, brez drenažnih
INSERT INTO mat_tracker.optibrush_prices (has_edge, has_drainage, is_standard, is_large, color_count, price_per_m2) VALUES
(true, false, true, false, '1', 172.36),
(true, false, true, false, '2-3', 235.73),
(true, false, false, false, '1', 202.93),
(true, false, false, false, '2-3', 282.12),
(true, false, false, true, '1', 233.50),
(true, false, false, true, '2-3', 328.51)
ON CONFLICT (has_edge, has_drainage, is_standard, is_large, color_count) DO UPDATE SET
  price_per_m2 = EXCLUDED.price_per_m2,
  updated_at = now();

-- Brez roba, brez drenažnih (enako kot nestandard z robom)
INSERT INTO mat_tracker.optibrush_prices (has_edge, has_drainage, is_standard, is_large, color_count, price_per_m2) VALUES
(false, false, false, false, '1', 202.93),
(false, false, false, false, '2-3', 282.12),
(false, false, false, true, '1', 233.50),
(false, false, false, true, '2-3', 328.51)
ON CONFLICT (has_edge, has_drainage, is_standard, is_large, color_count) DO UPDATE SET
  price_per_m2 = EXCLUDED.price_per_m2,
  updated_at = now();

-- Z drenažnimi (z ali brez roba - enake cene)
INSERT INTO mat_tracker.optibrush_prices (has_edge, has_drainage, is_standard, is_large, color_count, price_per_m2) VALUES
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
  price_per_m2 = EXCLUDED.price_per_m2,
  updated_at = now();

-- CUSTOM M2 PRICES
INSERT INTO mat_tracker.custom_m2_prices (size_category, frequency, price_per_m2) VALUES
('small', '1', 9.23),
('small', '2', 5.69),
('small', '3', 4.33),
('small', '4', 4.07),
('large', '1', 6.66),
('large', '2', 4.17),
('large', '3', 3.59),
('large', '4', 3.17)
ON CONFLICT (size_category, frequency) DO UPDATE SET
  price_per_m2 = EXCLUDED.price_per_m2,
  updated_at = now();

-- PRICE SETTINGS
INSERT INTO mat_tracker.price_settings (key, value, description) VALUES
('special_shape_multiplier', 1.50, 'Množitelj za posebne oblike (najem)'),
('optibrush_special_shape_multiplier', 1.30, 'Množitelj za posebne oblike (Optibrush)'),
('design_purchase_price_per_m2', 165.00, 'Cena nakupa Design po m²'),
('optibrush_m2_threshold', 7.50, 'Prag m² za Optibrush (nad = large)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE mat_tracker.mat_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.optibrush_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.custom_m2_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.price_settings ENABLE ROW LEVEL SECURITY;

-- Vsi uporabniki lahko berejo cene
CREATE POLICY "mat_prices_read_all" ON mat_tracker.mat_prices FOR SELECT USING (true);
CREATE POLICY "optibrush_prices_read_all" ON mat_tracker.optibrush_prices FOR SELECT USING (true);
CREATE POLICY "custom_m2_prices_read_all" ON mat_tracker.custom_m2_prices FOR SELECT USING (true);
CREATE POLICY "price_settings_read_all" ON mat_tracker.price_settings FOR SELECT USING (true);

-- Samo inventar lahko ureja cene
CREATE POLICY "mat_prices_write_inventar" ON mat_tracker.mat_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'inventar')
  );

CREATE POLICY "optibrush_prices_write_inventar" ON mat_tracker.optibrush_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'inventar')
  );

CREATE POLICY "custom_m2_prices_write_inventar" ON mat_tracker.custom_m2_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'inventar')
  );

CREATE POLICY "price_settings_write_inventar" ON mat_tracker.price_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mat_tracker.profiles WHERE id = auth.uid() AND role = 'inventar')
  );

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mat_prices_category ON mat_tracker.mat_prices(category);
CREATE INDEX IF NOT EXISTS idx_mat_prices_code ON mat_tracker.mat_prices(code);

-- =====================================================
-- GRANTS - Dovoljenja za anon/authenticated uporabnike
-- =====================================================

-- Branje za vse (anon in authenticated)
GRANT SELECT ON mat_tracker.mat_prices TO anon, authenticated;
GRANT SELECT ON mat_tracker.optibrush_prices TO anon, authenticated;
GRANT SELECT ON mat_tracker.custom_m2_prices TO anon, authenticated;
GRANT SELECT ON mat_tracker.price_settings TO anon, authenticated;

-- Urejanje samo za authenticated (RLS omejuje na inventar)
GRANT INSERT, UPDATE, DELETE ON mat_tracker.mat_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.optibrush_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.custom_m2_prices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON mat_tracker.price_settings TO authenticated;
