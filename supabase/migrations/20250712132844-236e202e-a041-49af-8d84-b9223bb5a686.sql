-- Enable realtime for claims table
ALTER TABLE public.claims REPLICA IDENTITY FULL;

-- Add claims to realtime publication
INSERT INTO supabase_realtime.publication_tables (publication_name, table_name, schema_name)
VALUES ('supabase_realtime', 'claims', 'public');