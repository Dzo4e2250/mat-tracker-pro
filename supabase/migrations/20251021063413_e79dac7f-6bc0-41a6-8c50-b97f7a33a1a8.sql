-- Step 1: Add ADMIN to app_role enum (must be committed separately)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ADMIN';