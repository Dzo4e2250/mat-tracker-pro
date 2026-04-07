-- Backfill is_vat_payer for existing companies from slovenian_companies register
UPDATE mat_tracker.companies c
SET is_vat_payer = sc.is_vat_payer
FROM mat_tracker.slovenian_companies sc
WHERE c.tax_number IS NOT NULL
  AND c.tax_number = sc.tax_number
  AND c.is_vat_payer IS NULL;
