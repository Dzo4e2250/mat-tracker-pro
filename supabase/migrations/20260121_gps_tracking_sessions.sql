-- GPS Tracking Sessions Table
-- Stores GPS tracking sessions for salespeople to measure daily kilometers traveled

CREATE TABLE IF NOT EXISTS mat_tracker.gps_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_km DECIMAL(10,3),
  points JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by salesperson
CREATE INDEX IF NOT EXISTS idx_gps_tracking_sessions_salesperson
ON mat_tracker.gps_tracking_sessions(salesperson_id);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_gps_tracking_sessions_started_at
ON mat_tracker.gps_tracking_sessions(started_at);

-- Enable RLS
ALTER TABLE mat_tracker.gps_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Salespeople can view and manage their own sessions
CREATE POLICY "Users can view own sessions"
ON mat_tracker.gps_tracking_sessions FOR SELECT
USING (auth.uid() = salesperson_id);

CREATE POLICY "Users can insert own sessions"
ON mat_tracker.gps_tracking_sessions FOR INSERT
WITH CHECK (auth.uid() = salesperson_id);

CREATE POLICY "Users can update own sessions"
ON mat_tracker.gps_tracking_sessions FOR UPDATE
USING (auth.uid() = salesperson_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON mat_tracker.gps_tracking_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mat_tracker.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
