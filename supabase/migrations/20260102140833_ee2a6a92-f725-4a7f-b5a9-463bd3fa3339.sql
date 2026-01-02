-- Create table for item closure reports
CREATE TABLE public.item_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_closures ENABLE ROW LEVEL SECURITY;

-- Users can create closure records for their own items
CREATE POLICY "Users can create closures for their items"
ON public.item_closures
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM items WHERE items.id = item_id AND items.user_id = auth.uid())
);

-- Users can view their own closures
CREATE POLICY "Users can view their own closures"
ON public.item_closures
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all closures for analytics
CREATE POLICY "Admins can view all closures"
ON public.item_closures
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));