-- Add secondary_role column to profiles table
-- Allows users to have access to multiple panels (e.g., both inventar and prodajalec)

ALTER TABLE mat_tracker.profiles
ADD COLUMN IF NOT EXISTS secondary_role VARCHAR(20) DEFAULT NULL;

-- Add check constraint for valid roles
ALTER TABLE mat_tracker.profiles
ADD CONSTRAINT profiles_secondary_role_check
CHECK (secondary_role IS NULL OR secondary_role IN ('prodajalec', 'inventar', 'admin'));

-- Comment for documentation
COMMENT ON COLUMN mat_tracker.profiles.secondary_role IS 'Optional secondary role that allows access to additional panels';
