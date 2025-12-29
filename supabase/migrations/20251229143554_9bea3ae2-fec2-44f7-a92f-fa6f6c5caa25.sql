-- Create table for AI-generated tags
CREATE TABLE public.ai_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  objects_detected TEXT[] NOT NULL DEFAULT '{}',
  auto_title TEXT,
  auto_description TEXT,
  embedding JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view ai_tags for active items"
ON public.ai_tags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.items 
  WHERE items.id = ai_tags.item_id AND items.status = 'active'
));

CREATE POLICY "Item owners can manage their ai_tags"
ON public.ai_tags
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.items 
  WHERE items.id = ai_tags.item_id AND items.user_id = auth.uid()
));

-- Create table for AI match suggestions
CREATE TABLE public.ai_match_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  ai_score NUMERIC NOT NULL DEFAULT 0,
  text_similarity NUMERIC DEFAULT 0,
  image_similarity NUMERIC DEFAULT 0,
  location_proximity NUMERIC DEFAULT 0,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lost_item_id, found_item_id)
);

-- Enable RLS
ALTER TABLE public.ai_match_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view match suggestions for their items"
ON public.ai_match_suggestions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.items 
  WHERE (items.id = ai_match_suggestions.lost_item_id OR items.id = ai_match_suggestions.found_item_id)
  AND items.user_id = auth.uid()
));

-- Create table for AI notifications queue
CREATE TABLE public.ai_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own AI notifications"
ON public.ai_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI notifications"
ON public.ai_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_ai_tags_item_id ON public.ai_tags(item_id);
CREATE INDEX idx_ai_match_suggestions_lost_item ON public.ai_match_suggestions(lost_item_id);
CREATE INDEX idx_ai_match_suggestions_found_item ON public.ai_match_suggestions(found_item_id);
CREATE INDEX idx_ai_notifications_user_id ON public.ai_notifications(user_id);
CREATE INDEX idx_ai_notifications_sent ON public.ai_notifications(sent);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_tags_updated_at
BEFORE UPDATE ON public.ai_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();