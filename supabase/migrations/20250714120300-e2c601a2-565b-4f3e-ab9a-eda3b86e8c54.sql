-- Add updated_at column to claims table
ALTER TABLE public.claims ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for automatic timestamp updates on claims table
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();