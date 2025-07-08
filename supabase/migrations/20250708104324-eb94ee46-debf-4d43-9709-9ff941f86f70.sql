-- Create items table for lost and found items
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('lost', 'found')),
  date_lost_found DATE NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  reward TEXT,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'returned', 'closed')),
  photos JSON DEFAULT '[]',
  verification_questions JSON DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for admin management
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
('Electronics', 'Phones, laptops, tablets, etc.'),
('Personal Items', 'Wallets, purses, personal belongings'),
('Pets', 'Lost or found pets'),
('Jewelry', 'Rings, necklaces, watches, etc.'),
('Documents', 'ID cards, passports, certificates'),
('Keys', 'House keys, car keys, etc.'),
('Bags', 'Backpacks, handbags, luggage'),
('Clothing', 'Clothes, shoes, accessories'),
('Other', 'Items that don\'t fit other categories');

-- Create matches table for matching algorithm
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  found_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3, 2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match', 'message', 'status_update')),
  related_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for items
CREATE POLICY "Anyone can view active items" 
  ON public.items 
  FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Users can create their own items" 
  ON public.items 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
  ON public.items 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" 
  ON public.items 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for categories (public read, admin write)
CREATE POLICY "Anyone can view categories" 
  ON public.categories 
  FOR SELECT 
  TO PUBLIC 
  USING (true);

-- RLS policies for matches
CREATE POLICY "Users can view matches for their items" 
  ON public.matches 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE (items.id = matches.lost_item_id OR items.id = matches.found_item_id) 
      AND items.user_id = auth.uid()
    )
  );

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for items table
CREATE TRIGGER update_items_updated_at 
  BEFORE UPDATE ON public.items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_items_user_id ON public.items(user_id);
CREATE INDEX idx_items_type ON public.items(item_type);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_location ON public.items USING GIN (to_tsvector('english', location));
CREATE INDEX idx_items_title_description ON public.items USING GIN (to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);