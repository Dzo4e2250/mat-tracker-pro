-- Optibrush cenik tabela
-- Cena je na m2, odvisna od:
-- - has_edge: z robom / brez roba
-- - color_count: 1 barva / 2-3 barve
-- - dimension_type: standard / non_standard_small (max 145x500) / non_standard_large (>145 ali >500)
-- - has_drainage: z drenažnimi luknjami

CREATE TABLE IF NOT EXISTS mat_tracker.optibrush_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  has_edge BOOLEAN NOT NULL,
  color_count TEXT NOT NULL CHECK (color_count IN ('1', '2-3')),
  dimension_type TEXT NOT NULL CHECK (dimension_type IN ('standard', 'non_standard_small', 'non_standard_large')),
  has_drainage BOOLEAN NOT NULL DEFAULT false,
  price_per_m2 DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (has_edge, color_count, dimension_type, has_drainage)
);

-- Standardne dimenzije za Optibrush
CREATE TABLE IF NOT EXISTS mat_tracker.optibrush_standard_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  width_cm INTEGER NOT NULL,
  height_cm INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (width_cm, height_cm)
);

-- RLS politike
ALTER TABLE mat_tracker.optibrush_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.optibrush_standard_sizes ENABLE ROW LEVEL SECURITY;

-- Dovoli branje vsem prijavljenim uporabnikom
CREATE POLICY "Allow read optibrush_prices for authenticated users"
  ON mat_tracker.optibrush_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read optibrush_standard_sizes for authenticated users"
  ON mat_tracker.optibrush_standard_sizes FOR SELECT
  TO authenticated
  USING (true);

-- Dovoli urejanje samo adminom/inventar
CREATE POLICY "Allow all for inventar on optibrush_prices"
  ON mat_tracker.optibrush_prices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('inventar', 'admin')
    )
  );

CREATE POLICY "Allow all for inventar on optibrush_standard_sizes"
  ON mat_tracker.optibrush_standard_sizes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mat_tracker.profiles
      WHERE id = auth.uid() AND role IN ('inventar', 'admin')
    )
  );

-- Vstavi standardne dimenzije
INSERT INTO mat_tracker.optibrush_standard_sizes (width_cm, height_cm) VALUES
  (60, 85),
  (75, 85),
  (80, 120),
  (85, 150),
  (85, 300),
  (120, 180),
  (120, 200),
  (120, 240),
  (150, 200),
  (150, 250),
  (150, 300)
ON CONFLICT DO NOTHING;

-- Vstavi cene: Optibrush Z ROBOM (brez drenažnih lukenj)
INSERT INTO mat_tracker.optibrush_prices (has_edge, color_count, dimension_type, has_drainage, price_per_m2) VALUES
  -- Z robom, 1 barva
  (true, '1', 'standard', false, 172.36),
  (true, '1', 'non_standard_small', false, 202.93),
  (true, '1', 'non_standard_large', false, 233.50),
  -- Z robom, 2-3 barve
  (true, '2-3', 'standard', false, 235.73),
  (true, '2-3', 'non_standard_small', false, 282.12),
  (true, '2-3', 'non_standard_large', false, 328.51)
ON CONFLICT DO NOTHING;

-- Vstavi cene: Optibrush BREZ ROBA (brez drenažnih lukenj)
-- Brez roba nima standardnih dimenzij
INSERT INTO mat_tracker.optibrush_prices (has_edge, color_count, dimension_type, has_drainage, price_per_m2) VALUES
  -- Brez roba, 1 barva
  (false, '1', 'non_standard_small', false, 202.93),
  (false, '1', 'non_standard_large', false, 233.50),
  -- Brez roba, 2-3 barve
  (false, '2-3', 'non_standard_small', false, 282.12),
  (false, '2-3', 'non_standard_large', false, 328.51)
ON CONFLICT DO NOTHING;

-- Vstavi cene: Optibrush Z ROBOM + DRENAŽNE LUKNJE (+8%)
INSERT INTO mat_tracker.optibrush_prices (has_edge, color_count, dimension_type, has_drainage, price_per_m2) VALUES
  -- Z robom + drenažne, 1 barva
  (true, '1', 'standard', true, 186.15),
  (true, '1', 'non_standard_small', true, 219.16),
  (true, '1', 'non_standard_large', true, 252.18),
  -- Z robom + drenažne, 2-3 barve
  (true, '2-3', 'standard', true, 254.59),
  (true, '2-3', 'non_standard_small', true, 304.69),
  (true, '2-3', 'non_standard_large', true, 354.79)
ON CONFLICT DO NOTHING;

-- Vstavi cene: Optibrush BREZ ROBA + DRENAŽNE LUKNJE (+8%)
INSERT INTO mat_tracker.optibrush_prices (has_edge, color_count, dimension_type, has_drainage, price_per_m2) VALUES
  -- Brez roba + drenažne, 1 barva
  (false, '1', 'non_standard_small', true, 219.16),
  (false, '1', 'non_standard_large', true, 252.18),
  -- Brez roba + drenažne, 2-3 barve
  (false, '2-3', 'non_standard_small', true, 304.69),
  (false, '2-3', 'non_standard_large', true, 354.79)
ON CONFLICT DO NOTHING;

-- Komentar: Posebne oblike se obračunavajo kot +30% na končno ceno
-- To se izračuna v aplikaciji, ne v bazi
