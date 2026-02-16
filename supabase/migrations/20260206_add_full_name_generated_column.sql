-- Migration: Add full_name generated column to profiles table
-- Date: 2026-02-06
-- This column is automatically computed from first_name and last_name

ALTER TABLE mat_tracker.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
