-- Clean all data for fresh start
-- Delete all test placements
DELETE FROM public.test_placements;

-- Delete all transport notifications
DELETE FROM public.transport_notifications;

-- Delete all doormats
DELETE FROM public.doormats;

-- Delete all tester requests
DELETE FROM public.tester_requests;

-- Note: profiles and user_roles tables are preserved