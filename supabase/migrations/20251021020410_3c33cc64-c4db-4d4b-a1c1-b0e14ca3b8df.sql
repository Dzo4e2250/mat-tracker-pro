-- Add waiting_for_driver status to doormat_status enum
ALTER TYPE doormat_status ADD VALUE IF NOT EXISTS 'waiting_for_driver';