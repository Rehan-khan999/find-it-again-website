-- Add updated_at column to claims table
ALTER TABLE public.claims ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();