-- Fix drivers table: missing GRANT for authenticated role
-- RLS policy existed ("Allow all for authenticated users") but the role
-- had no table-level privileges, causing DB_PERMISSION_DENIED
-- Sentry: 0242c0ed98be4425ae39f1c8dd002ea5

GRANT SELECT, INSERT, UPDATE, DELETE ON mat_tracker.drivers TO authenticated;
