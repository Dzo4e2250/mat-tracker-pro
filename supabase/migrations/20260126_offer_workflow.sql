-- Offer workflow fields
-- Dodaj polja za sledenje ponudb

-- offer_sent_at - kdaj je bila ponudba poslana
ALTER TABLE mat_tracker.companies
ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMP WITH TIME ZONE;

-- offer_called_at - kdaj smo poklicali glede ponudbe
ALTER TABLE mat_tracker.companies
ADD COLUMN IF NOT EXISTS offer_called_at TIMESTAMP WITH TIME ZONE;

-- Posodobi obstoječe zapise kjer je status offer_sent ampak ni offer_sent_at
-- Uporabi updated_at kot približek
UPDATE mat_tracker.companies
SET offer_sent_at = updated_at
WHERE pipeline_status = 'offer_sent'
  AND offer_sent_at IS NULL;

-- Dodaj komentar za dokumentacijo
COMMENT ON COLUMN mat_tracker.companies.offer_sent_at IS 'Timestamp when offer was sent to customer';
COMMENT ON COLUMN mat_tracker.companies.offer_called_at IS 'Timestamp when customer was called about offer';
