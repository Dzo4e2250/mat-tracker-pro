-- Add is_vat_payer column to companies
ALTER TABLE mat_tracker.companies
ADD COLUMN IF NOT EXISTS is_vat_payer boolean DEFAULT NULL;

-- Populate from slovenian_companies register where tax numbers match
UPDATE mat_tracker.companies c
SET is_vat_payer = sc.is_vat_payer
FROM mat_tracker.slovenian_companies sc
WHERE c.tax_number IS NOT NULL
  AND c.tax_number = sc.tax_number
  AND c.is_vat_payer IS NULL;
