-- Create claims table for tracking item claims
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL,
  verification_answers JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create policies for claims
CREATE POLICY "Item owners can view claims for their items" 
ON public.claims 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.items 
  WHERE items.id = claims.item_id 
  AND items.user_id = auth.uid()
));

CREATE POLICY "Claimants can view their own claims" 
ON public.claims 
FOR SELECT 
USING (auth.uid() = claimant_id);

CREATE POLICY "Authenticated users can create claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Item owners can update claims for their items" 
ON public.claims 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.items 
  WHERE items.id = claims.item_id 
  AND items.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();