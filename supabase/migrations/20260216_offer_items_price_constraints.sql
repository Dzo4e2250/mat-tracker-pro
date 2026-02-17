-- Prevent zero or negative prices on offer items
ALTER TABLE mat_tracker.offer_items DROP CONSTRAINT IF EXISTS offer_items_price_rental_positive;
ALTER TABLE mat_tracker.offer_items ADD CONSTRAINT offer_items_price_rental_positive CHECK (price_rental IS NULL OR price_rental > 0);

ALTER TABLE mat_tracker.offer_items DROP CONSTRAINT IF EXISTS offer_items_price_purchase_positive;
ALTER TABLE mat_tracker.offer_items ADD CONSTRAINT offer_items_price_purchase_positive CHECK (price_purchase IS NULL OR price_purchase > 0);

ALTER TABLE mat_tracker.offer_items DROP CONSTRAINT IF EXISTS offer_items_quantity_positive;
ALTER TABLE mat_tracker.offer_items ADD CONSTRAINT offer_items_quantity_positive CHECK (quantity > 0);
