-- Allow negative quantity on offer items (for contract item removal/replacement)
ALTER TABLE mat_tracker.offer_items DROP CONSTRAINT IF EXISTS offer_items_quantity_positive;
ALTER TABLE mat_tracker.offer_items ADD CONSTRAINT offer_items_quantity_nonzero CHECK (quantity != 0);
