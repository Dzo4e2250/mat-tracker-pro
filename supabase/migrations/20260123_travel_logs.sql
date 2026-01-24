-- Travel Logs (Potni nalogi) - mesečne evidence
-- Stores monthly travel log headers with odometer readings

CREATE TABLE IF NOT EXISTS mat_tracker.travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),

  -- Podatki o vozilu
  vehicle_brand VARCHAR(100), -- npr. ŠKODA OCT 49 PDD
  vehicle_registration VARCHAR(20), -- npr. LJ 49 PDD
  vehicle_owner VARCHAR(200), -- npr. ALD d.o.o.

  -- Stanje števca
  starting_odometer INTEGER, -- začetno stanje števca
  ending_odometer INTEGER, -- končno stanje števca

  -- Meja za boniteto
  private_km_limit INTEGER DEFAULT 500, -- meja za polno boniteto

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint - en potni nalog na mesec na uporabnika
  UNIQUE(user_id, month, year)
);

-- Travel Log Entries - dnevni vnosi
CREATE TABLE IF NOT EXISTS mat_tracker.travel_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_log_id UUID NOT NULL REFERENCES mat_tracker.travel_logs(id) ON DELETE CASCADE,

  -- Datum
  entry_date DATE NOT NULL,

  -- Relacija in namen
  route VARCHAR(200), -- npr. "mb-celje-mb"
  purpose VARCHAR(50) NOT NULL DEFAULT 'prosto', -- teren, bolniska, dopust, praznik, od_doma, prosto

  -- Kilometri
  km_business INTEGER DEFAULT 0, -- službeni km
  km_private INTEGER DEFAULT 0, -- privatni km

  -- Stanje števca (izračunano ali ročno vneseno)
  odometer_reading INTEGER,

  -- Časovni okvir (opcijsko)
  start_time TIME,
  end_time TIME,

  -- Povezava z GPS sejami
  gps_session_ids UUID[] DEFAULT '{}',

  -- Opombe
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint - en vnos na dan na potni nalog
  UNIQUE(travel_log_id, entry_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_travel_logs_user_id ON mat_tracker.travel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_month_year ON mat_tracker.travel_logs(year, month);
CREATE INDEX IF NOT EXISTS idx_travel_log_entries_travel_log_id ON mat_tracker.travel_log_entries(travel_log_id);
CREATE INDEX IF NOT EXISTS idx_travel_log_entries_date ON mat_tracker.travel_log_entries(entry_date);

-- Enable RLS
ALTER TABLE mat_tracker.travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mat_tracker.travel_log_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_logs
CREATE POLICY "Users can view own travel logs"
ON mat_tracker.travel_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travel logs"
ON mat_tracker.travel_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel logs"
ON mat_tracker.travel_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel logs"
ON mat_tracker.travel_logs FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for travel_log_entries (through travel_log ownership)
CREATE POLICY "Users can view own travel log entries"
ON mat_tracker.travel_log_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.travel_logs
    WHERE id = travel_log_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own travel log entries"
ON mat_tracker.travel_log_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mat_tracker.travel_logs
    WHERE id = travel_log_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own travel log entries"
ON mat_tracker.travel_log_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.travel_logs
    WHERE id = travel_log_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own travel log entries"
ON mat_tracker.travel_log_entries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.travel_logs
    WHERE id = travel_log_id AND user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all travel logs"
ON mat_tracker.travel_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view all travel log entries"
ON mat_tracker.travel_log_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION mat_tracker.update_travel_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS travel_logs_updated_at ON mat_tracker.travel_logs;
CREATE TRIGGER travel_logs_updated_at
  BEFORE UPDATE ON mat_tracker.travel_logs
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.update_travel_log_updated_at();

DROP TRIGGER IF EXISTS travel_log_entries_updated_at ON mat_tracker.travel_log_entries;
CREATE TRIGGER travel_log_entries_updated_at
  BEFORE UPDATE ON mat_tracker.travel_log_entries
  FOR EACH ROW EXECUTE FUNCTION mat_tracker.update_travel_log_updated_at();
