-- Enable realtime for claims table
ALTER TABLE public.claims REPLICA IDENTITY FULL;

-- Enable realtime by adding to publication (this is the correct way)
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;