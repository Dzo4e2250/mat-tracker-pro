-- Enable realtime for doormats table
ALTER TABLE public.doormats REPLICA IDENTITY FULL;

-- Add doormats to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.doormats;