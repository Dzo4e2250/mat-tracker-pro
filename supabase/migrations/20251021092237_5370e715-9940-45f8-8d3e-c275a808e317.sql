-- Remove all doormats with 'sent_by_inventar' status to enable new QR code system
-- This allows sellers to rescan QR codes and assign doormat types during scanning
DELETE FROM public.doormats WHERE status = 'sent_by_inventar';