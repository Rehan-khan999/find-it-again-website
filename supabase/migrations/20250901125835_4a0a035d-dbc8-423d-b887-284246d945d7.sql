
-- Create verifications table for blockchain verification
CREATE TABLE public.verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'ownership',
  blockchain_hash TEXT,
  transaction_hash TEXT,
  block_number BIGINT,
  verification_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for verifications
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- Users can view verifications for their items
CREATE POLICY "Users can view verifications for their items" 
  ON public.verifications 
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = verifications.item_id 
      AND items.user_id = auth.uid()
    )
  );

-- Users can create verifications for their items
CREATE POLICY "Users can create verifications for their items" 
  ON public.verifications 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = verifications.item_id 
      AND items.user_id = auth.uid()
    )
  );

-- Users can update their own verifications
CREATE POLICY "Users can update their verifications" 
  ON public.verifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can manage all verifications
CREATE POLICY "Admins can manage all verifications" 
  ON public.verifications 
  FOR ALL 
  USING (is_admin_or_moderator(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_verifications_item_id ON public.verifications(item_id);
CREATE INDEX idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX idx_verifications_status ON public.verifications(status);
CREATE INDEX idx_verifications_blockchain_hash ON public.verifications(blockchain_hash) WHERE blockchain_hash IS NOT NULL;
